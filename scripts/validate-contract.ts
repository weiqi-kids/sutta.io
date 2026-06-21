// validate-contract.ts — 契約層驗證（TEST_SPEC §1）
// 對每份 sutta 產物驗：(a) 形狀對齊 study_page_types.ts；(b) 不變量。任一不過 → 退出碼 1。
// 純結構驗證（不 import 型別；型別在註解），可用 `tsx` 直跑、零 workspace 依賴。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUTTA_DIRS = ['data', 'fixtures'];
const NON_SUTTA = /^(index-|embeddings|manifest|browse$|suttas$|lexicon$|snippets$|surface-lemmas$)/;

const REVIEW = new Set(['draft', 'approved']);
const PROVENANCE = new Set(['canonical', 'commentarial', 'scholarly', 'ai']);

let errors = 0;
const fail = (file: string, msg: string) => {
  errors++;
  console.error(`✗ ${file}: ${msg}`);
};

function isStr(v: unknown): v is string {
  return typeof v === 'string';
}
function isNullableStr(v: unknown): boolean {
  return v === null || typeof v === 'string';
}
function isNullableNum(v: unknown): boolean {
  return v === null || typeof v === 'number';
}

function validateSutta(file: string, s: any) {
  const rel = path.relative(ROOT, file);

  // --- sutta meta ---
  if (!s.sutta || !isStr(s.sutta.id)) return fail(rel, 'sutta.id 缺失');
  for (const k of ['title_pali', 'title_zh', 'collection']) {
    if (!isStr(s.sutta[k])) fail(rel, `sutta.${k} 應為 string`);
  }
  if (!Array.isArray(s.segments)) return fail(rel, 'segments 應為陣列');
  if (!Array.isArray(s.passages)) return fail(rel, 'passages 應為陣列');
  if (!Array.isArray(s.study_cards)) fail(rel, 'study_cards 應為陣列');

  const segmentIds = new Set<string>();
  const tokenIds = new Set<string>();

  // --- segments / tokens ---
  for (const seg of s.segments) {
    if (!isStr(seg.segment_id)) {
      fail(rel, 'segment.segment_id 缺失');
      continue;
    }
    segmentIds.add(seg.segment_id);
    if (!Array.isArray(seg.pali_tokens)) {
      fail(rel, `${seg.segment_id}: pali_tokens 應為陣列`);
      continue;
    }
    for (const tk of seg.pali_tokens) {
      if (!isStr(tk.token_id)) fail(rel, `${seg.segment_id}: token.token_id 缺失`);
      else tokenIds.add(tk.token_id);
      if (!isStr(tk.surface)) fail(rel, `${tk.token_id}: surface 必有值（永遠有值）`);
      // 不變量：dpd_id===null ⇒ 相關欄位皆 null（§4.2 降級主訊號）
      if (tk.dpd_id === null) {
        for (const k of ['lemma', 'root', 'morph', 'morph_display', 'compound', 'gloss', 'freq']) {
          if (tk[k] !== null && tk[k] !== undefined) {
            fail(rel, `${tk.token_id}: dpd_id===null 但 ${k} 非 null（不變量違反）`);
          }
        }
      } else if (typeof tk.dpd_id !== 'number') {
        fail(rel, `${tk.token_id}: dpd_id 應為 number 或 null`);
      }
      if (typeof tk.ambiguous !== 'boolean') fail(rel, `${tk.token_id}: ambiguous 應為 boolean`);
      // 不變量：ambiguous===true ⇒ candidates 非空陣列
      if (tk.ambiguous === true) {
        if (!Array.isArray(tk.candidates) || tk.candidates.length === 0) {
          fail(rel, `${tk.token_id}: ambiguous 但無 candidates（不變量違反）`);
        }
      } else if (tk.candidates !== null && tk.candidates !== undefined) {
        if (!Array.isArray(tk.candidates)) fail(rel, `${tk.token_id}: candidates 應為 null 或陣列`);
      }
      if (!isNullableNum(tk.freq)) fail(rel, `${tk.token_id}: freq 應為 number 或 null`);
    }
    // vernacular_gloss（L2）
    const g = seg.vernacular_gloss;
    if (g != null) {
      if (!REVIEW.has(g.review_status)) fail(rel, `${seg.segment_id}: gloss.review_status 非法`);
      if (!Array.isArray(g.grounded_on)) fail(rel, `${seg.segment_id}: gloss.grounded_on 應為陣列`);
      if (!isStr(g.content)) fail(rel, `${seg.segment_id}: gloss.content 應為 string`);
    }
  }

  // --- passages（阿含對照，段落級） ---
  const coveredSegs = new Set<string>();
  for (const p of s.passages) {
    if (!isStr(p.passage_id)) fail(rel, 'passage.passage_id 缺失');
    if (!Array.isArray(p.segment_ids)) {
      fail(rel, `${p.passage_id}: segment_ids 應為陣列`);
      continue;
    }
    for (const sid of p.segment_ids) {
      coveredSegs.add(sid);
      if (!segmentIds.has(sid)) fail(rel, `${p.passage_id}: 參照不存在的 segment ${sid}`);
    }
    // agama 可為 null（降級），非 null 時須有 source/ref/text
    if (p.agama != null) {
      for (const k of ['source', 'ref', 'text']) {
        if (!isStr(p.agama[k])) fail(rel, `${p.passage_id}: agama.${k} 應為 string`);
      }
    }
  }
  // 不變量：每個 segment 必被某 passage 涵蓋
  for (const sid of segmentIds) {
    if (!coveredSegs.has(sid)) fail(rel, `segment ${sid} 未被任何 passage 涵蓋（不變量違反）`);
  }

  // --- L2 grounding 引用存在性（L2_GENERATION §4） ---
  const checkGrounding = (ids: unknown, where: string, kind: 'segment' | 'token') => {
    if (!Array.isArray(ids)) return;
    for (const id of ids) {
      const pool = kind === 'segment' ? segmentIds : tokenIds;
      if (!pool.has(id)) fail(rel, `${where}: grounded_on 參照不存在的 ${kind} ${id}`);
    }
  };
  for (const seg of s.segments) {
    if (seg.vernacular_gloss) checkGrounding(seg.vernacular_gloss.grounded_on, `${seg.segment_id} gloss`, 'token');
  }
  if (s.summary) {
    if (!REVIEW.has(s.summary.review_status)) fail(rel, 'summary.review_status 非法');
    checkGrounding(s.summary.grounded_on, 'summary', 'segment');
  }
  for (const c of s.study_cards ?? []) {
    if (!isStr(c.card_id)) fail(rel, 'study_card.card_id 缺失');
    if (!REVIEW.has(c.review_status)) fail(rel, `${c.card_id}: review_status 非法`);
    checkGrounding(c.sources, `${c.card_id}`, 'segment');
  }
}

function validateFile(file: string) {
  let s: any;
  try {
    s = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return fail(path.relative(ROOT, file), `JSON 解析失敗：${(e as Error).message}`);
  }
  // 只驗 sutta 形狀檔（有 sutta + segments）
  if (s && s.sutta && Array.isArray(s.segments)) validateSutta(file, s);
}

let count = 0;
for (const dir of SUTTA_DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    if (!f.endsWith('.json') || NON_SUTTA.test(f.replace(/\.json$/, ''))) continue;
    validateFile(path.join(abs, f));
    count++;
  }
}

if (errors > 0) {
  console.error(`\n契約層驗證失敗：${errors} 處（共驗 ${count} 份產物）。`);
  process.exit(1);
}
console.log(`✓ 契約層驗證通過（${count} 份產物，形狀 + 不變量全綠）。`);
