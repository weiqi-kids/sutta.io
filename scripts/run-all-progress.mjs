#!/usr/bin/env node
// run-all-progress.mjs — 查全自動規模化進度（不經 Claude、不佔 API）。
// 用法： node scripts/run-all-progress.mjs
import fs from 'node:fs';

const TOTAL = 152;
let complete = 0, l1only = 0;
const missing = [];
for (let i = 1; i <= TOTAL; i++) {
  const p = `data/mn${i}.json`;
  if (!fs.existsSync(p)) { missing.push(`mn${i}`); continue; }
  try {
    const d = JSON.parse(fs.readFileSync(p, 'utf-8'));
    if (d.summary) complete++;
    else { l1only++; missing.push(`mn${i}`); }
  } catch { missing.push(`mn${i}`); }
}

// 驅動程式還在跑嗎
let running = false;
try {
  const pid = fs.readFileSync('/tmp/sutta-daily.lock', 'utf-8').trim();
  process.kill(Number(pid), 0); running = true;
} catch {}

const bar = (n, t, w = 30) => { const f = Math.round((n / t) * w); return '█'.repeat(f) + '░'.repeat(w - f); };
console.log(`MN 完整進度：${complete}/${TOTAL}  ${bar(complete, TOTAL)}  ${((complete / TOTAL) * 100).toFixed(1)}%`);
console.log(`  L1-only（待補 L2）：${l1only} 部　尚缺：${missing.length} 部`);
console.log(`  目前批次鎖：${running ? '執行中' : '閒置'}`);

try {
  const log = fs.readFileSync('pipeline/.cache/run-all.log', 'utf-8').trim().split('\n');
  console.log('\nrun-all.log 最後 6 行：');
  console.log(log.slice(-6).map((l) => '  ' + l).join('\n'));
} catch { console.log('（尚無 run-all.log）'); }

if (missing.length) console.log(`\n下一波會做：${missing.slice(0, 8).join(', ')}`);
