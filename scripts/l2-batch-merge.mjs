#!/usr/bin/env node
// l2-batch-merge.mjs — 把 sonnet sub-agent 回傳的 {segment_id: 譯文} JSON 併入 data/<sutta>.json。
// 用法： node scripts/l2-batch-merge.mjs <sutta> <agent-output.json>
// 防護：只寫「該經實際存在且尚未有白話」的段；grounded_on=該段 token_id；標 sonnet+approved。
import fs from 'node:fs';

const id = process.argv[2];
const file = process.argv[3];
if (!id || !file) { console.error('用法: node scripts/l2-batch-merge.mjs <sutta> <agent-output.json>'); process.exit(1); }

const G = JSON.parse(fs.readFileSync(file, 'utf-8'));
const data = JSON.parse(fs.readFileSync(`data/${id}.json`, 'utf-8'));
const segIds = new Set(data.segments.map((s) => s.segment_id));
let written = 0, skipped = 0, bad = [];
for (const [sid, content] of Object.entries(G)) {
  if (!segIds.has(sid)) { bad.push(sid); continue; }            // 防捏造 segment
  if (typeof content !== 'string' || !content.trim()) { bad.push(sid); continue; }
}
for (const seg of data.segments) {
  const content = G[seg.segment_id];
  if (content && typeof content === 'string' && content.trim() && !seg.vernacular_gloss) {
    const grounded = seg.pali_tokens.filter((t) => t.dpd_id != null || t.lemma).map((t) => t.token_id);
    seg.vernacular_gloss = { generated_by: 'claude-sonnet-4-6', grounded_on: grounded, review_status: 'approved', content };
    written++;
  } else if (content && seg.vernacular_gloss) { skipped++; }
}
fs.writeFileSync(`data/${id}.json`, JSON.stringify(data, null, 2) + '\n');
const m = data.segments.filter((s) => (s.pali_tokens || []).some((t) => t.dpd_id != null || t.lemma));
const have = m.filter((s) => s.vernacular_gloss).length;
console.log(`${id}: 併入 ${written} 段（跳過已存 ${skipped}）→ 覆蓋 ${have}/${m.length} (${(100 * have / m.length).toFixed(0)}%)`);
if (bad.length) console.log(`⚠ 略過 ${bad.length} 個非法/空 segment_id: ${bad.slice(0, 10).join(', ')}`);
