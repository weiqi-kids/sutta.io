// next-sutta.mjs — 決定每日要建的下一部經（中部順序，跳過已完成）。
// 用法：node scripts/next-sutta.mjs            → 印下一部 id 或 "DONE"
//       node scripts/next-sutta.mjs --done     → 印已完成 id（逗號分隔）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const TOTAL = 152; // 中部經數

// 已完成 = data/mn{N}.json 存在且為真經（有 segments）
function isDone(id) {
  const f = path.join(DATA, `${id}.json`);
  if (!fs.existsSync(f)) return false;
  try {
    const s = JSON.parse(fs.readFileSync(f, 'utf-8'));
    return s && s.sutta && Array.isArray(s.segments) && s.segments.length > 0;
  } catch {
    return false;
  }
}

const order = Array.from({ length: TOTAL }, (_, i) => `mn${i + 1}`);
const done = order.filter(isDone);

if (process.argv.includes('--done')) {
  console.log(done.join(','));
} else {
  const next = order.find((id) => !isDone(id));
  console.log(next ?? 'DONE');
}
