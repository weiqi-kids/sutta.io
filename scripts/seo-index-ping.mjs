#!/usr/bin/env node
// Google Indexing API 通知（比照 folk.tw index-ping.mjs / pnpm notify）：
//   改完頁面後，主動敲 Google 的門叫它重新收錄這些 URL。
// 認證：服務帳號自簽 JWT，scope=indexing（SA 須為 GSC 驗證擁有者；見記憶 sutta-io-gsc-indexing-api）。
// 用法：
//   node scripts/seo-index-ping.mjs https://sutta.io/read/mn10/ https://sutta.io/...   # 指定 URL
//   node scripts/seo-index-ping.mjs                                                    # 無參數→預設關鍵頁
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const KEY_PATH = process.env.SUTTA_GA4_SA || path.join(os.homedir(), '.config/sutta-io/ga4-sa.json');
const DEFAULT_URLS = ['https://sutta.io/', 'https://sutta.io/read/mn10/'];
const urls = process.argv.slice(2).filter((a) => /^https?:\/\//.test(a));
const targets = urls.length ? urls : DEFAULT_URLS;

const sa = JSON.parse(fs.readFileSync(KEY_PATH, 'utf-8'));
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function getToken() {
  const scope = 'https://www.googleapis.com/auth/indexing';
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now }));
  const sig = b64url(crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claim}`), sa.private_key));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claim}.${sig}` }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('取得 token 失敗：' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

async function main() {
  const token = await getToken();
  let ok = 0;
  for (const url of targets) {
    const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ url, type: 'URL_UPDATED' }),
    });
    const j = await res.json();
    if (res.ok && !j.error) { ok++; console.log(`  ✓ 已通知 Google：${url}`); }
    else console.error(`  ✗ ${url}：${j.error?.message || JSON.stringify(j).slice(0, 120)}`);
  }
  console.log(`index-ping 完成：${ok}/${targets.length} 成功`);
}
main().catch((e) => { console.error('index-ping 失敗：', e.message); process.exit(1); });
