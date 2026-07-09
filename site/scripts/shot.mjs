// shot.mjs — 視覺改動「先親眼看」的固定步驟：截 dist 頁面的桌機＋手機圖。
// 2026-07-09 教訓：只 grep HTML 結構就宣稱「驗證過」會漏掉間距/壓字/尺寸這類「畫出來才看得到」的 bug。
// 前置：pnpm -C site build（先有 dist）；playwright chromium 已裝（若無，依下方提示裝）。
// 用法（cwd=site）：node scripts/shot.mjs /topics/moggallana/ [/read/mn10/ ...]
//   輸出 PNG 到 site/.shots/，用 Read 工具開來看。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(SITE, 'dist');
const OUT = path.join(SITE, '.shots');
const paths = process.argv.slice(2);
if (!paths.length) { console.error('用法：node scripts/shot.mjs /topics/moggallana/ [更多路徑…]'); process.exit(1); }
if (!fs.existsSync(DIST)) { console.error('找不到 dist/，請先 pnpm -C site build'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('缺 playwright。裝：cd site && npm i -D playwright && npx playwright install --with-deps chromium'); process.exit(1); }

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.xml': 'application/xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.statusCode = 404; return res.end('404'); }
  res.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const b = await chromium.launch();
for (const p of paths) {
  const slug = p.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'index';
  for (const [name, vp] of [['desktop', { width: 1200, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await b.newPage({ viewport: vp });
    await page.goto(`http://localhost:${port}${p}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const out = path.join(OUT, `${slug}-${name}.png`);
    await page.screenshot({ path: out });
    console.log('  ✓', path.relative(SITE, out));
    await page.close();
  }
}
await b.close();
server.close();
console.log('截圖完成，用 Read 工具開 site/.shots/*.png 親眼看。');
