#!/usr/bin/env node
// l2-batch-dump.mjs — 匯出某經「尚未翻譯」的前 N 段（巴利+DPD），給 sonnet sub-agent 翻譯。
// 用法： node scripts/l2-batch-dump.mjs <sutta> [count=20] [outfile]
// 輸出：一個 JSON 陣列 [{segment_id, pali, tokens:[{surface,gloss,morph}]}, ...] 寫到 outfile。
import fs from 'node:fs';

const id = process.argv[2];
const count = Number(process.argv[3] || 20);
const out = process.argv[4] || `/tmp/l2-batch-${id}.json`;
if (!id) { console.error('用法: node scripts/l2-batch-dump.mjs <sutta> [count] [outfile]'); process.exit(1); }

const data = JSON.parse(fs.readFileSync(`data/${id}.json`, 'utf-8'));
const meaningful = data.segments.filter((s) => (s.pali_tokens || []).some((t) => t.dpd_id != null || t.lemma));
const missing = meaningful.filter((s) => !s.vernacular_gloss).slice(0, count);
const payload = missing.map((s) => ({
  segment_id: s.segment_id,
  pali: s.pali_tokens.map((t) => t.surface).join(' '),
  tokens: s.pali_tokens.filter((t) => t.lemma || t.gloss).map((t) => ({ surface: t.surface, gloss: t.gloss || t.lemma, morph: t.morph_display })),
}));
fs.writeFileSync(out, JSON.stringify(payload, null, 2));
const have = meaningful.filter((s) => s.vernacular_gloss).length;
console.log(`${id}: 覆蓋 ${have}/${meaningful.length}；本批匯出 ${payload.length} 段 → ${out}`);
console.log(`segment_ids: ${missing.map((s) => s.segment_id).join(', ')}`);
