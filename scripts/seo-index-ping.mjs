#!/usr/bin/env node
// 收錄推送（改完頁面後主動敲搜尋引擎的門叫它重新收錄）——一次同時通報：
//   ① Google：Indexing API（SA 自簽 JWT，scope=indexing；SA 須為 GSC 驗證擁有者，見記憶 sutta-io-gsc-indexing-api）
//   ② 其他引擎（Bing/Yandex/Seznam…）：IndexNow 協定（金鑰公開於 https://sutta.io/<key>.txt，非機密）
// 用法：
//   node scripts/seo-index-ping.mjs https://sutta.io/read/mn10/ https://sutta.io/...   # 指定 URL
//   node scripts/seo-index-ping.mjs                                                    # 無參數→預設關鍵頁
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const KEY_PATH = process.env.SUTTA_GA4_SA || path.join(os.homedir(), '.config/sutta-io/ga4-sa.json');
// IndexNow 金鑰：與 site/public/<key>.txt 檔名一致（該檔內容＝金鑰本身，build 後公開於網站根目錄）。
// 金鑰依設計即為公開值，非機密，故直接內嵌；換金鑰時同步改此常數與 public 下的 .txt 檔名。
const INDEXNOW_KEY = '97b3f5c3183fdf8efe7cb3cb0f3327b7';
const INDEXNOW_HOST = 'sutta.io';
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

// ② IndexNow：單次 POST 帶整批 URL，一次通報 Bing/Yandex/Seznam 等（任一端點提交即分發給所有參與引擎）。
async function pingIndexNow() {
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
        urlList: targets,
      }),
    });
    // IndexNow 成功回 200 或 202；422/403 多為金鑰驗證檔尚未部署（首次上線 build 後才會生效）。
    if (res.ok) console.log(`  ✓ 已通知 IndexNow（Bing/Yandex…）：${targets.length} 筆（HTTP ${res.status}）`);
    else console.error(`  ✗ IndexNow：HTTP ${res.status}（若為 403/422，多因金鑰檔尚未部署到網站根目錄，待本次 build 上線後即生效）`);
  } catch (e) {
    console.error(`  ✗ IndexNow 連線失敗：${e.message}`);
  }
}

async function main() {
  // ① Google Indexing API：逐 URL 通報。
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
  console.log(`Google index-ping 完成：${ok}/${targets.length} 成功`);
  await pingIndexNow();
}
main().catch((e) => { console.error('index-ping 失敗：', e.message); process.exit(1); });
