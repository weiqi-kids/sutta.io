// copy-data.mjs — build 前把搜尋/語意所需的靜態索引複製到 public/data/，
// 讓搜尋頁以同源靜態資產讀取（SEARCH §6「靜態索引隨站打包」；可離線）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, '../../data');
const OUT = path.resolve(__dirname, '../public/data');

const FILES = [
  'index-fulltext.json',
  'index-lemma.json',
  'index-surface.json',
  'suttas.json',
  'snippets.json',
  'surface-lemmas.json',
  'embeddings.bin',
  'embeddings-meta.json',
];

fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const f of FILES) {
  const src = path.join(DATA, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(OUT, f));
    n++;
  }
}
// 策展結果（若有）
const curatedSrc = path.join(DATA, 'curated');
if (fs.existsSync(curatedSrc)) {
  const curatedOut = path.join(OUT, 'curated');
  fs.mkdirSync(curatedOut, { recursive: true });
  for (const f of fs.readdirSync(curatedSrc)) {
    fs.copyFileSync(path.join(curatedSrc, f), path.join(curatedOut, f));
    n++;
  }
}
console.log(`copy-data: 複製 ${n} 個索引/資產 → public/data/`);
