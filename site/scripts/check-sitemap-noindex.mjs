// sitemap 不得含 noindex 頁（建置後守門）。
// 為什麼要有：sitemap 是「請收錄」、noindex 是「不要收錄」，兩者打架時 Google Search Console
// 會報「已提交的網址標示為 noindex」並寄信。站上兩件事常由不同程式決定（sitemap filter 與頁面模板），
// 改了一邊忘了另一邊就會不同步；這支在 build 之後直接比對 dist，擋下矛盾再部署。
// 用法：node scripts/check-sitemap-noindex.mjs [dist 目錄，預設 dist]
// 檢查：sitemap 裡每個網址對應的 dist 檔要存在，且不得帶 <meta name="robots|googlebot" content="…noindex…">。
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] || 'dist';
if (!existsSync(dist)) { console.error(`[sitemap-noindex] 找不到 ${dist}，先 build`); process.exit(1); }
const smFiles = readdirSync(dist).filter((f) => /^sitemap.*\.xml$/.test(f));
if (!smFiles.length) { console.log('[sitemap-noindex] dist 沒有 sitemap，略過'); process.exit(0); }

const locs = new Set();
for (const f of smFiles) {
  const xml = readFileSync(join(dist, f), 'utf8');
  if (/<sitemapindex/i.test(xml)) continue; // 索引檔只列子 sitemap，子檔本身也在 dist 根目錄
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) locs.add(m[1].replace(/&amp;/g, '&'));
}

const fileFor = (pathname) => {
  let p = decodeURIComponent(pathname).replace(/^\/+/, '');
  const cands = p === '' ? ['index.html']
    : p.endsWith('/') ? [p + 'index.html']
    : /\.[a-z0-9]+$/i.test(p) ? [p] : [p + '/index.html', p + '.html'];
  return cands.map((c) => join(dist, c)).find((c) => existsSync(c) && statSync(c).isFile()) || null;
};

const noindex = [], missing = [];
for (const u of locs) {
  const f = fileFor(new URL(u).pathname);
  if (!f) { missing.push(u); continue; }
  if (!f.endsWith('.html')) continue;
  const html = readFileSync(f, 'utf8');
  const metas = html.match(/<meta[^>]+name=["']?(?:robots|googlebot)["']?[^>]*>/gi) || [];
  if (metas.some((m) => /content=["'][^"']*\b(noindex|none)\b/i.test(m))) noindex.push(u);
}

const show = (arr) => arr.slice(0, 20).map((u) => `  ${u}`).join('\n') + (arr.length > 20 ? `\n  …另 ${arr.length - 20} 個` : '');
if (noindex.length) console.error(`[sitemap-noindex] ❌ sitemap 含 ${noindex.length} 個 noindex 頁（sitemap filter 與頁面 noindex 不同步）：\n${show(noindex)}`);
if (missing.length) console.error(`[sitemap-noindex] ❌ sitemap 含 ${missing.length} 個 dist 裡找不到的網址（上線會 404）：\n${show(missing)}`);
if (noindex.length || missing.length) process.exit(1);
console.log(`[sitemap-noindex] ✓ sitemap ${locs.size} 個網址，皆非 noindex、皆有對應頁`);
