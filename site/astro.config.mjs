// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// 自訂網域 sutta.io：site 為完整網址、base 為根目錄（BUILD_SPEC §6）。
// 內容頁零 JS，研經頁/搜尋頁以 React island 才水合（BUILD_SPEC §1）。
export default defineConfig({
  site: 'https://sutta.io',
  base: '/',
  trailingSlash: 'ignore',
  output: 'static',
  integrations: [react()],
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
