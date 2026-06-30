#!/usr/bin/env node
// 每日 SEO 資料收集器（資料層 collect）：唯讀拉 GA4 + GSC → 機器可讀 JSON，供資料心跳/大腦層判讀。
// 比照 folk.tw scripts/seo-daily.mjs。本支產的核心訊號：
//   1. page×query 交叉（哪個頁吃到哪些字）
//   2. striking-distance（排名 5–15 且有曝光＝最值得推一把）
//   3. 高曝光零點擊（meta/標題優化目標）
//   4. index 覆蓋（追蹤頁是否已被 Google 收錄）
// 認證：服務帳號自簽 JWT（金鑰於 repo 外：$SUTTA_GA4_SA 或 ~/.config/sutta-io/ga4-sa.json）。
// 輸出：data/seo-daily/<台灣日期>.json
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_PATH = process.env.SUTTA_GA4_SA || path.join(os.homedir(), '.config/sutta-io/ga4-sa.json');
const GA4_PROPERTY = process.env.SUTTA_GA4_PROPERTY || '542455353';
const GSC_SITE = process.env.SUTTA_GSC_SITE || 'sc-domain:sutta.io';
const OUT_DIR = path.join(ROOT, 'data', 'seo-daily');

// 追蹤頁（index 覆蓋監控）。
const TRACK_URLS = [
  'https://sutta.io/',
  'https://sutta.io/read/mn10/',
  'https://sutta.io/read/mn118/',
  'https://sutta.io/read/mn22/',
  'https://sutta.io/lexicon/',
];

const sa = JSON.parse(fs.readFileSync(KEY_PATH, 'utf-8'));
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function getToken() {
  const scope = 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly';
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now }));
  const sig = b64url(crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claim}`), sa.private_key));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claim}.${sig}` }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('取得 token 失敗：' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const twDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }); // YYYY-MM-DD 台灣

async function ga4Run(token, body) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:runReport`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  if (j.error) throw new Error('GA4: ' + (j.error.message || JSON.stringify(j.error)).slice(0, 160));
  return j;
}
async function gscQuery(token, body) {
  const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  if (j.error) throw new Error('GSC: ' + (j.error.message || JSON.stringify(j.error)).slice(0, 160));
  return j;
}
async function inspectUrl(token, url) {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: GSC_SITE }),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || 'inspect 失敗');
  return j.inspectionResult?.indexStatusResult ?? {};
}

const section = async (fn) => { try { return await fn(); } catch (e) { return { error: e.message }; } };

async function ga4Block(token) {
  const dateRanges = [{ startDate: '7daysAgo', endDate: 'yesterday' }];
  const overview = await ga4Run(token, { dateRanges, metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }] });
  const o = overview.rows?.[0]?.metricValues?.map((v) => Number(v.value)) ?? [];
  const twChannels = await ga4Run(token, {
    dateRanges, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }],
    dimensionFilter: { filter: { fieldName: 'country', stringFilter: { value: 'Taiwan' } } },
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 10,
  });
  const twOrganic = Number(twChannels.rows?.find((r) => r.dimensionValues[0].value === 'Organic Search')?.metricValues[0].value ?? 0);
  const topPages = await ga4Run(token, {
    dateRanges, dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 15,
  });
  return {
    range: '7daysAgo..yesterday',
    sessions: o[0] ?? 0, users: o[1] ?? 0, views: o[2] ?? 0,
    taiwanOrganicSessions: twOrganic,
    topPages: (topPages.rows ?? []).map((r) => ({ path: r.dimensionValues[0].value, views: Number(r.metricValues[0].value) })),
  };
}

async function gscBlock(token) {
  const startDate = ymd(daysAgo(10));
  const endDate = ymd(daysAgo(3)); // GSC 約 2–3 日延遲
  const base = { startDate, endDate };
  const totals = (await gscQuery(token, { ...base, dimensions: [] })).rows?.[0] ?? {};
  const queries = (await gscQuery(token, { ...base, dimensions: ['query'], rowLimit: 25 })).rows ?? [];
  const pages = (await gscQuery(token, { ...base, dimensions: ['page'], rowLimit: 25 })).rows ?? [];
  const cross = (await gscQuery(token, { ...base, dimensions: ['page', 'query'], rowLimit: 200 })).rows ?? [];
  const crossRows = cross.map((r) => ({ page: r.keys[0], query: r.keys[1], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }));
  return {
    range: `${startDate}..${endDate}`,
    totals: { clicks: totals.clicks ?? 0, impressions: totals.impressions ?? 0, ctr: totals.ctr ?? 0, position: totals.position ?? null },
    topQueries: queries.map((r) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    topPages: pages.map((r) => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    strikingDistance: crossRows.filter((r) => r.position >= 5 && r.position <= 15 && r.impressions > 0).sort((a, b) => b.impressions - a.impressions).slice(0, 30),
    highImpZeroClick: crossRows.filter((r) => r.impressions >= 3 && r.clicks === 0).sort((a, b) => b.impressions - a.impressions).slice(0, 30),
  };
}

async function indexBlock(token) {
  const coverage = [];
  for (const u of TRACK_URLS) {
    try { const r = await inspectUrl(token, u); coverage.push({ url: u, coverageState: r.coverageState ?? null, lastCrawlTime: r.lastCrawlTime ?? null }); }
    catch (e) { coverage.push({ url: u, error: e.message }); }
  }
  return { coverage };
}

async function main() {
  const token = await getToken();
  const date = twDate();
  const out = {
    date, generatedAt: new Date().toISOString(),
    ga4: await section(() => ga4Block(token)),
    gsc: await section(() => gscBlock(token)),
    index: await section(() => indexBlock(token)),
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${date}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`✓ 已寫 ${file}`);
  if (out.gsc.error) console.error(`  GSC 失敗：${out.gsc.error}`);
  else console.error(`  GSC：曝光 ${out.gsc.totals.impressions}／點擊 ${out.gsc.totals.clicks}／臨門一腳 ${out.gsc.strikingDistance.length} 筆／高曝零點 ${out.gsc.highImpZeroClick.length} 筆`);
  if (out.ga4.error) console.error(`  GA4 失敗：${out.ga4.error}`);
  else console.error(`  GA4：sessions ${out.ga4.sessions}／台灣自然搜尋 ${out.ga4.taiwanOrganicSessions}`);
}
main().catch((e) => { console.error('seo-daily 失敗：', e.message); process.exit(1); });
