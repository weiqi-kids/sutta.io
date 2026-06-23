#!/usr/bin/env node
// batch-progress.mjs — 查批次生成進度，不經 Claude（不佔 API 併發，可隨時跑）。
// 用法： node scripts/batch-progress.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const LOCK = '/tmp/sutta-daily.lock';
const LOG = path.join(ROOT, 'pipeline/.cache/batch.log');
const DRAFT_DIR = path.join(ROOT, 'data/l2-draft');

// 活著？
let alive = false, pid = null;
try { pid = fs.readFileSync(LOCK, 'utf-8').trim(); process.kill(Number(pid), 0); alive = true; } catch {}
console.log(`批次程序：${alive ? `執行中 (PID ${pid})` : '已結束 / 未執行'}`);

// 本波經單（從 log 最後一個 BATCH 區塊抓）
let wave = [];
try {
  const log = fs.readFileSync(LOG, 'utf-8');
  const m = [...log.matchAll(/本批新經：(.+)/g)].pop();
  if (m) wave = m[1].trim().split(',').map((s) => s.trim());
} catch {}
if (!wave.length) { console.log('（找不到本波經單）'); process.exit(0); }

let total = 0, done = 0;
console.log('\n經\t白話\t概要\t卡\t成本\t狀態');
for (const id of wave) {
  const p = path.join(DRAFT_DIR, `${id}.json`);
  if (!fs.existsSync(p)) { console.log(`${id}\t-\t-\t-\t-\t尚未開始`); continue; }
  let d; try { d = JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { console.log(`${id}\t(解析中)`); continue; }
  const v = Object.keys(d.vernacular || {}).length;
  const cost = Number(d.cost_usd || 0); total += cost;
  const full = d.summary && (d.study_cards?.length > 0);
  if (full) done++;
  console.log(`${id}\t${v}\t${d.summary ? '✓' : '–'}\t${d.study_cards?.length ?? 0}\t$${cost.toFixed(2)}\t${full ? '完整' : '進行/不完整'}`);
}
console.log(`\n完整 ${done}/${wave.length} 部　累計成本 $${total.toFixed(2)}`);
console.log('\n最後 5 行 log：');
try { console.log(fs.readFileSync(LOG, 'utf-8').trim().split('\n').slice(-5).map((l) => '  ' + l).join('\n')); } catch {}
