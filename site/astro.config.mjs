// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// 自訂網域 sutta.io：site 為完整網址、base 為根目錄（BUILD_SPEC §6）。
// 內容頁零 JS，研經頁/搜尋頁以 React island 才水合（BUILD_SPEC §1）。
export default defineConfig({
  site: 'https://sutta.io',
  base: '/',
  trailingSlash: 'ignore',
  output: 'static',
  // D-9：繁中為預設（根路徑），英文 UI 於 /en/。內容維持多語。
  i18n: {
    defaultLocale: 'zh-Hant',
    locales: ['zh-Hant', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    react(),
    sitemap({
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
