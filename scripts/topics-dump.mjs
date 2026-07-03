#!/usr/bin/env node
// topics-dump.mjs — 把一部經的段落（segment_id / 巴利 / 白話）dump 成精簡文本，
// 供主題頁（content/topics/）起草時 ground 用。用法：node scripts/topics-dump.mjs mn118 [輸出路徑]
import fs from 'node:fs';

const id = process.argv[2];
if (!id) {
  console.error('用法：node scripts/topics-dump.mjs <mnN> [輸出路徑]');
  process.exit(1);
}
const out = process.argv[3] || `/tmp/topics-dump-${id}.txt`;
const d = JSON.parse(fs.readFileSync(`data/${id}.json`, 'utf-8'));
const lines = [`# ${id} ${d.sutta.title_pali}（${d.sutta.title_zh}）segments dump`, ''];
for (const s of d.segments) {
  const pali = (s.pali_tokens || []).map((t) => t.surface).join(' ');
  const vern = s.vernacular_gloss?.content ?? '';
  if (!pali && !vern) continue;
  lines.push(`[${s.segment_id}]`);
  if (pali) lines.push(`P: ${pali}`);
  if (vern) lines.push(`V: ${vern}`);
  lines.push('');
}
fs.writeFileSync(out, lines.join('\n'));
console.log(`${out}（${d.segments.length} 段）`);
