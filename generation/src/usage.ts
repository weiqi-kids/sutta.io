// usage.ts — T4 用法摘要（LEXICON §5；僅高頻內容詞 + 教義要詞）。
// grounded on 實際出現句子；guardrail 過 → approved 寫 data/usage.json（字典頁顯示）。
import fs from 'node:fs';
import path from 'node:path';
import { callClaudeStructured } from './claude.ts';
import { T4_SYSTEM, T4_SCHEMA } from './prompts.ts';
import { MODEL } from './tasks.ts';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DATA_DIR = path.join(ROOT, 'data');

// 虛詞/功能詞停用清單（高頻但非「用法摘要」對象）
const STOP = new Set([
  'ca', 'vā', 'ti', 'hoti', 'atthi', 'natthi', 'na', 'me', 'ayaṃ', 'taṃ', 'so', 'sā', 'idaṃ',
  'eva', 'pi', 'ce', 'v?', 'yo', 'ya', 'kho', 'pana', 'hi', 'taṃ', 'iti', 'va', 'su', 'ta',
  'evaṃ', 'tathā', 'yathā', 'seyyathā', 'atha', 'tatra', 'tattha', 'puna', 'api',
]);
// F-2 教義要詞（即使非最高頻也納入）
const KEY_WORDS = ['sati', 'kāya', 'vedanā', 'citta', 'dhamma', 'satipaṭṭhāna', 'pajānāti', 'sampajāna'];

interface LexEntry {
  lemma: string;
  root: string | null;
  gloss: string | null;
  occurrences: { seg: string; sutta: string }[];
}

async function main() {
  const limit = parseInt(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? '16', 10);
  const lexicon = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'lexicon.json'), 'utf-8')) as Record<string, LexEntry>;
  const suttaIds = (process.env.SUTTAS?.split(',') ?? ['mn10']).map((x) => x.trim());
  const snippets = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'snippets.json'), 'utf-8')) as Record<string, { pi: string; zh?: string }>;

  // 排名：教義要詞優先，其餘按出現數；跳虛詞、出現<2
  const entries = Object.entries(lexicon)
    .filter(([k, e]) => !STOP.has(e.lemma) && e.occurrences.length >= 2)
    .sort((a, b) => {
      const ak = KEY_WORDS.some((w) => a[1].lemma.startsWith(w)) ? 1 : 0;
      const bk = KEY_WORDS.some((w) => b[1].lemma.startsWith(w)) ? 1 : 0;
      if (ak !== bk) return bk - ak;
      return b[1].occurrences.length - a[1].occurrences.length;
    })
    .slice(0, limit);

  const out: Record<string, any> = fs.existsSync(path.join(DATA_DIR, 'usage.json'))
    ? JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'usage.json'), 'utf-8'))
    : {};

  let cost = 0;
  for (const [key, e] of entries) {
    if (out[key]) continue; // 續跑跳過已做
    const occ = e.occurrences.slice(0, 8).map((o) => ({
      segment_id: o.seg,
      sentence: snippets[o.seg]?.pi ?? '',
      vernacular: snippets[o.seg]?.zh ?? null,
    }));
    const validSegs = new Set(occ.map((o) => o.segment_id));
    const input = { lemma: e.lemma, dpd: { root: e.root, meaning: e.gloss }, occurrences: occ };
    const r = callClaudeStructured<{ summary_zh: string; senses: { gloss: string; segment_ids: string[] }[]; grounded_on: string[] }>(
      T4_SYSTEM, JSON.stringify(input), T4_SCHEMA
    );
    if (!r.ok || !r.data) { console.warn(`  ${e.lemma} 失敗：${r.error}`); continue; }
    cost += r.costUsd ?? 0;
    // guardrail：senses/grounded_on 的 segment_id 必須在出現清單
    const sanitize = (ids: string[]) => ids.filter((id) => validSegs.has(id));
    const senses = r.data.senses.map((s) => ({ gloss: s.gloss, segment_ids: sanitize(s.segment_ids) }));
    out[key] = {
      generated_by: MODEL,
      review_status: 'approved',
      summary: r.data.summary_zh,
      senses,
      grounded_on: sanitize(r.data.grounded_on),
    };
    fs.writeFileSync(path.join(DATA_DIR, 'usage.json'), JSON.stringify(out, null, 2) + '\n');
    console.log(`  ✓ ${e.lemma}（${e.occurrences.length} 處）`);
  }
  console.log(`T4 用法摘要完成：${Object.keys(out).length} 詞，成本 $${cost.toFixed(2)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
