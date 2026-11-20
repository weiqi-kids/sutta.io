// /en/ 不收錄守門（建置後）。2026-11-15 站主拍板：/en/ 英文鏡像整區 noindex,follow，頁面與網址照留。
// 鎖住四件事，任一破就擋部署：
//   1. dist/en/ 底下每個 html 都帶 <meta name="robots" content="noindex…">
//   2. sitemap 不含任何 /en/ 網址（含 xhtml:link alternate）
//   3. 中文頁不輸出指向 /en/ 的 hreflang alternate
//   4. robots.txt 不擋 /en/（擋了 Google 就讀不到 noindex，舊網址反而卡在索引裡）
// 另抽一個中文經文頁確認沒被誤標 noindex。
// 用法：node scripts/check-en-noindex.mjs [dist 目錄，預設 dist]
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = process.argv[2] || 'dist';
if (!existsSync(dist)) { console.error(`[en-noindex] 找不到 ${dist}，先 build`); process.exit(1); }

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const isNoindex = (html) =>
  (html.match(/<meta[^>]+name=["']?robots["']?[^>]*>/gi) || []).some((m) => /content=["'][^"']*\bnoindex\b/i.test(m));
const errs = [];

// 1. /en/ 全部 noindex
const enDir = join(dist, 'en');
const enHtml = existsSync(enDir) ? walk(enDir).filter((f) => f.endsWith('.html')) : [];
const enMissing = enHtml.filter((f) => !isNoindex(readFileSync(f, 'utf8')));
if (!enHtml.length) errs.push('dist/en/ 沒有任何 html（預期英文頁照留）');
if (enMissing.length) errs.push(`${enMissing.length} 個 /en/ 頁缺 noindex：\n  ${enMissing.slice(0, 10).map((f) => relative(dist, f)).join('\n  ')}`);

// 2. sitemap 不含 /en/
for (const f of readdirSync(dist).filter((f) => /^sitemap.*\.xml$/.test(f))) {
  const hits = readFileSync(join(dist, f), 'utf8').match(/https?:\/\/[^/"<\s]+\/en(?:\/|["<])/g) || [];
  if (hits.length) errs.push(`${f} 含 ${hits.length} 處 /en/ 網址`);
}

// 3. 中文頁不 hreflang 指向 /en/
const zhHtml = walk(dist).filter((f) => f.endsWith('.html') && !f.startsWith(enDir + '/'));
const altEn = zhHtml.filter((f) => /<link[^>]+rel=["']?alternate["']?[^>]+href=["']?https?:\/\/[^/"]+\/en(?:\/|["'])/i.test(readFileSync(f, 'utf8')));
if (altEn.length) errs.push(`${altEn.length} 個中文頁仍有 hreflang 指向 /en/：\n  ${altEn.slice(0, 10).map((f) => relative(dist, f)).join('\n  ')}`);

// 4. robots.txt 不擋 /en
const robots = join(dist, 'robots.txt');
if (existsSync(robots) && /^\s*Disallow:\s*\/en\b/im.test(readFileSync(robots, 'utf8'))) errs.push('robots.txt 擋了 /en/（會讓 Google 讀不到 noindex）');

// 抽樣：中文經文頁不得 noindex
const zhSample = join(dist, 'read', 'mn10', 'index.html');
if (existsSync(zhSample) && isNoindex(readFileSync(zhSample, 'utf8'))) errs.push('中文經文頁 /read/mn10/ 被標 noindex');

if (errs.length) { console.error(`[en-noindex] ❌\n${errs.join('\n')}`); process.exit(1); }
console.log(`[en-noindex] ✓ /en/ ${enHtml.length} 頁皆 noindex；sitemap 無 /en/；中文頁無 hreflang→/en/；robots.txt 未擋`);
