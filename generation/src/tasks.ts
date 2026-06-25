// tasks.ts — L2 任務編排（T1/T2/T3）。讀 data/{id}.json(L1)，呼叫 claude，套防護欄，
// 輸出草稿到 data/l2-draft/{id}.json（一律 draft；approved 由校稿工具併入正式檔）。
import fs from 'node:fs';
import path from 'node:path';
import type { SuttaFixture, Segment } from '@tipitaka/contracts';
import { callClaudeStructured } from './claude.ts';
import {
  T1_SYSTEM, T1_SCHEMA, T2_SYSTEM, T2_SCHEMA, T3_SYSTEM, T3_SCHEMA,
} from './prompts.ts';
import {
  buildValidSets, checkGrounding, checkFabricatedRefs, checkCaseContradiction, type GuardIssue,
} from './guardrails.ts';
import { glossaryBlock } from './glossary.ts';

export const MODEL = 'claude-sonnet-4-6';
// F-2：教義術語對照表注入 L2 prompt（T1/T2/T3），確保跨經譯名一致。
const GLOSSARY = glossaryBlock();
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DATA_DIR = path.join(ROOT, 'data');
const DRAFT_DIR = path.join(DATA_DIR, 'l2-draft');

export interface DraftStore {
  sutta_id: string;
  generated_by: string;
  generated_at: string;
  vernacular: Record<string, { content: string; grounded_on: string[]; token_glosses: { token_id: string; gloss_zh: string; note?: string }[]; issues: GuardIssue[] }>;
  summary: { content: string; grounded_on: string[]; issues: GuardIssue[] } | null;
  study_cards: { title: string; content: string; sources: string[]; issues: GuardIssue[] }[];
  cost_usd: number;
}

function loadSutta(id: string): SuttaFixture {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${id}.json`), 'utf-8'));
}
function loadDraft(id: string): DraftStore | null {
  const f = path.join(DRAFT_DIR, `${id}.json`);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : null;
}
function saveDraft(d: DraftStore) {
  fs.mkdirSync(DRAFT_DIR, { recursive: true });
  fs.writeFileSync(path.join(DRAFT_DIR, `${d.sutta_id}.json`), JSON.stringify(d, null, 2) + '\n');
}

// 萃取合法 segment_id：模型偶爾在 grounded_on 加說明/範圍，這裡抽出確切 id 並過濾存在者。
function sanitizeIds(arr: string[], valid: Set<string>): string[] {
  const out = new Set<string>();
  for (const raw of arr) {
    const m = raw.match(/[a-z]+\d+:[\d.]+/g);
    if (m) for (const id of m) if (valid.has(id)) out.add(id);
    else if (valid.has(raw)) out.add(raw);
  }
  return [...out];
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// 只把有實質 token 的 segment 送 T1（純標點/空段跳過）
function meaningful(seg: Segment): boolean {
  return seg.pali_tokens.some((t) => t.lemma || t.dpd_id != null);
}

export async function generate(id: string, opts: { limit?: number; batch?: number } = {}) {
  const sutta = loadSutta(id);
  const valid = buildValidSets(sutta);
  // 每批 10 段（輸入最省：系統提示重送次數最少）。實測 10 段 ~342s 完成。
  // 真正的修法是把 timeout 加長（見 claude.ts 900s），而非縮小批次——縮批會讓
  // 系統提示被重送更多次、更耗輸入 token。
  const batch = opts.batch ?? 10;

  const store: DraftStore = loadDraft(id) ?? {
    sutta_id: id,
    generated_by: MODEL,
    generated_at: new Date().toISOString(),
    vernacular: {},
    summary: null,
    study_cards: [],
    cost_usd: 0,
  };

  // ---- T1 漢譯白話（批次）----
  let segs = sutta.segments.filter(meaningful).filter((s) => !store.vernacular[s.segment_id]);
  if (opts.limit) segs = segs.slice(0, opts.limit);
  const batches = chunk(segs, batch);
  console.log(`T1 漢譯白話：${segs.length} 段 / ${batches.length} 批（已存 ${Object.keys(store.vernacular).length}）`);

  for (let b = 0; b < batches.length; b++) {
    const input = {
      segments: batches[b].map((s) => ({
        segment_id: s.segment_id,
        tokens: s.pali_tokens
          .filter((t) => t.dpd_id != null || t.lemma)
          .map((t) => ({
            token_id: t.token_id,
            surface: t.surface,
            lemma: t.lemma,
            root: t.root,
            morph_display: t.morph_display,
            gloss: t.gloss,
          })),
      })),
    };
    const r = callClaudeStructured<{ segments: { segment_id: string; segment_gloss_zh: string; tokens: { token_id: string; gloss_zh: string; note?: string }[] }[] }>(
      T1_SYSTEM + GLOSSARY,
      JSON.stringify(input),
      T1_SCHEMA
    );
    if (!r.ok || !r.data) {
      console.warn(`  批 ${b + 1} 失敗：${r.error}`);
      continue;
    }
    store.cost_usd += r.costUsd ?? 0;
    for (const seg of r.data.segments) {
      const segObj = sutta.segments.find((s) => s.segment_id === seg.segment_id);
      const tokenIdsHere = new Set(segObj?.pali_tokens.map((t) => t.token_id) ?? []);
      const issues: GuardIssue[] = [];
      // 防護欄：grounding（token 存在）、反矛盾（格位）、不捏經號
      const groundedTokens = seg.tokens.map((t) => t.token_id);
      for (const tid of groundedTokens) {
        if (!tokenIdsHere.has(tid)) issues.push({ kind: 'grounding', where: seg.segment_id, detail: `token ${tid} 不屬此段` });
      }
      for (const tk of seg.tokens) {
        const tokObj = segObj?.pali_tokens.find((t) => t.token_id === tk.token_id);
        issues.push(...checkCaseContradiction(tk.gloss_zh, tokObj?.morph_display ?? null, `${seg.segment_id}/${tk.token_id}`));
      }
      issues.push(...checkFabricatedRefs(seg.segment_gloss_zh, valid.allowRefs, seg.segment_id));
      store.vernacular[seg.segment_id] = {
        content: seg.segment_gloss_zh,
        grounded_on: groundedTokens.filter((t) => tokenIdsHere.has(t)),
        token_glosses: seg.tokens,
        issues,
      };
    }
    saveDraft(store); // 逐批存檔，可中斷續跑
    process.stdout.write(`  批 ${b + 1}/${batches.length} ✓\n`);
  }

  // ---- T2 章節概要 ----
  if (!store.summary) {
    const usable = sutta.segments.filter(meaningful);
    const input = {
      segments: usable.map((s) => ({
        segment_id: s.segment_id,
        pali: s.pali_tokens.map((t) => t.surface).join(' '),
        vernacular: store.vernacular[s.segment_id]?.content ?? null,
      })),
    };
    const r = callClaudeStructured<{ summary_zh: string; grounded_on: string[] }>(T2_SYSTEM + GLOSSARY, JSON.stringify(input), T2_SCHEMA);
    if (r.ok && r.data) {
      store.cost_usd += r.costUsd ?? 0;
      const grounded = sanitizeIds(r.data.grounded_on, valid.segIds);
      const issues = [
        ...checkGrounding(grounded, valid.segIds, 'summary'),
        ...checkFabricatedRefs(r.data.summary_zh, valid.allowRefs, 'summary'),
      ];
      store.summary = { content: r.data.summary_zh, grounded_on: grounded, issues };
      saveDraft(store);
      console.log('T2 章節概要 ✓');
    } else {
      console.warn(`T2 失敗：${r.error}`);
    }
  }

  // ---- T3 研經卡 ----
  if (store.study_cards.length === 0) {
    const usable = sutta.segments.filter(meaningful);
    const input = {
      segments: usable.map((s) => ({
        segment_id: s.segment_id,
        vernacular: store.vernacular[s.segment_id]?.content ?? null,
        key_tokens: s.pali_tokens.filter((t) => t.dpd_id != null).slice(0, 6).map((t) => ({ lemma: t.lemma, gloss: t.gloss })),
      })),
    };
    const r = callClaudeStructured<{ cards: { title: string; content_zh: string; sources: string[] }[] }>(T3_SYSTEM + GLOSSARY, JSON.stringify(input), T3_SCHEMA);
    if (r.ok && r.data) {
      store.cost_usd += r.costUsd ?? 0;
      store.study_cards = r.data.cards.map((c) => {
        const sources = sanitizeIds(c.sources, valid.segIds);
        return {
          title: c.title,
          content: c.content_zh,
          sources,
          issues: [
            ...checkGrounding(sources, valid.segIds, `card:${c.title}`),
            ...checkFabricatedRefs(c.content_zh, valid.allowRefs, `card:${c.title}`),
          ],
        };
      });
      saveDraft(store);
      console.log(`T3 研經卡 ✓（${store.study_cards.length} 張）`);
    } else {
      console.warn(`T3 失敗：${r.error}`);
    }
  }

  const issueCount = Object.values(store.vernacular).reduce((n, v) => n + v.issues.length, 0)
    + (store.summary?.issues.length ?? 0)
    + store.study_cards.reduce((n, c) => n + c.issues.length, 0);
  console.log(`✓ ${id} 草稿完成：白話 ${Object.keys(store.vernacular).length} 段、概要 ${store.summary ? 1 : 0}、研經卡 ${store.study_cards.length}｜防護欄旗標 ${issueCount}｜成本 $${store.cost_usd.toFixed(3)}`);
  return store;
}
