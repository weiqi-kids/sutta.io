// @ts-check
import { defineConfig } from 'astro/config';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// sitemap 與頁面 noindex 對齊：薄詞條頁（lexicon/[key].astro 標 noindex 者）不該進 sitemap，
// 否則對 Google 送出「sitemap 說收錄／meta 說 noindex」的矛盾訊號。這裡複製 lexicon/[key].astro 的
// indexable 判準（usage ／ entity.summary ／ DPD gloss+occ≥門檻），算出「應 noindex」的鍵集合，
// 於 sitemap filter 排除其 zh/en 兩版。改判準時兩處要同步（含 LEX_OCC_MIN 值）。
// 2026-07-14：7-05「只認 L2 白話」過嚴（僅 28 詞達標→deindex 99% 字典頁，含幾乎全部曝光詞），回調為此。
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const readJson = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf-8')) : {});
const _lex = readJson(join(DATA_DIR, 'lexicon.json'));
const _usage = readJson(join(DATA_DIR, 'usage.json'));
const _ent = readJson(join(DATA_DIR, 'entities.json'));
const LEX_OCC_MIN = 8; // 字典頁索引門檻：有 DPD gloss 且出現次數≥此值＝正當字典條目、可索引。與 lexicon/[key].astro 同步。
const noindexLexKeys = new Set(
  [...new Set([...Object.keys(_lex), ...Object.keys(_ent)])].filter((k) => {
    const hasUsage = Boolean(_usage[k]);
    const hasEntity = Boolean(_ent[k]?.summary?.length);
    const e = _lex[k];
    const hasDict = Boolean(e?.gloss && String(e.gloss).trim()) && (e?.occurrences?.length ?? 0) >= LEX_OCC_MIN;
    return !(hasUsage || hasEntity || hasDict); // 空殼（無白話/無實體/DPD內容不足）＝noindex＝不進 sitemap
  }),
);
// filter 收到完整 URL；比對 /lexicon/<key>（含 /en/）的解碼 key 是否在排除集
const keepInSitemap = (page) => {
  // /en/read/*（英文殼包中文內容）已 noindex，不進 sitemap，避免矛盾訊號、集中中文抓取預算。
  if (/\/en\/read\//.test(page)) return false;
  const m = page.match(/\/lexicon\/([^/]+)\/?$/);
  if (!m) return true; // 非詞條頁一律保留
  try {
    return !noindexLexKeys.has(decodeURIComponent(m[1]));
  } catch {
    return true;
  }
};

// 自訂網域 sutta.io：site 為完整網址、base 為根目錄（BUILD_SPEC §6）。
// 內容頁零 JS，研經頁/搜尋頁以 React island 才水合（BUILD_SPEC §1）。
export default defineConfig({
  site: 'https://sutta.io',
  base: '/',
  trailingSlash: 'ignore',
  output: 'static',
  // /questions 已於 2026-07-08 併入 /topics（分類問題地圖）；保留舊 URL 可達，導向新 hub。
  redirects: {
    '/questions': '/topics',
    '/en/questions': '/en/topics',
  },
  // D-9：繁中為預設（根路徑），英文 UI 於 /en/。內容維持多語。
  i18n: {
    defaultLocale: 'zh-Hant',
    locales: ['zh-Hant', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    react(),
    sitemap({
      filter: keepInSitemap,
      i18n: {
        defaultLocale: 'zh-Hant',
        locales: { 'zh-Hant': 'zh-Hant', en: 'en' },
      },
    }),
  ],
  build: {
    // 深連結用 fragment（/read/mn10#mn10:1.1），靜態友善（SITE_IA §2）
    format: 'directory',
  },
  vite: {
    server: {
      fs: {
        // 允許讀 repo 根的 design/、data/、contracts/、fixtures/
        allow: ['..'],
      },
    },
  },
});
