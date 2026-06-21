// weekly-report.mjs — sutta.io 週報（GA4 + Search Console，唯讀）。
// 服務帳號自簽 JWT 取 token（不需 OAuth 同意流程）。金鑰於 repo 外本機路徑讀取，絕不進 repo。
// 輸出：pipeline/.cache/weekly-report.md（gitignore）+ stdout。可由 cron 週跑。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_PATH = process.env.SUTTA_GA4_SA || path.join(os.homedir(), '.config/sutta-io/ga4-sa.json');
const GA4_PROPERTY = process.env.SUTTA_GA4_PROPERTY || '542455353';
const GSC_SITE = process.env.SUTTA_GSC_SITE || 'sc-domain:sutta.io';

const sa = JSON.parse(fs.readFileSync(KEY_PATH, 'utf-8'));

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getToken() {
  const scope = 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly';
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now }));
  const sig = b64url(crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claim}`), sa.private_key));
  const jwt = `${header}.${claim}.${sig}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('取得 token 失敗：' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

const days = (n) => {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
};

async function ga4(token) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:runReport`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: days(7), endDate: days(1) }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'screenPageViews' }],
      dimensions: [{ name: 'pagePath' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    }),
  });
  return res.json();
}

async function gsc(token) {
  const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ startDate: days(7), endDate: days(1), dimensions: ['query'], rowLimit: 10 }),
  });
  return res.json();
}

function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString() : n;
}

async function main() {
  const token = await getToken();
  let md = `# sutta.io 週報（${days(7)} ~ ${days(1)}）\n\n`;

  try {
    const g = await ga4(token);
    const totals = g.totals?.[0]?.metricValues ?? [];
    md += `## GA4 流量\n`;
    if (g.error) {
      md += `> 讀取失敗：${g.error.message}\n\n`;
    } else if (!g.rows?.length) {
      md += `> 本週無資料（站剛上線或尚無訪客）。\n\n`;
    } else {
      md += `- 工作階段 sessions：${fmt(+(totals[0]?.value ?? 0))}\n`;
      md += `- 活躍使用者：${fmt(+(totals[1]?.value ?? 0))}\n`;
      md += `- 瀏覽 pageviews：${fmt(+(totals[2]?.value ?? 0))}\n\n### 熱門頁面\n`;
      for (const r of g.rows) md += `- \`${r.dimensionValues[0].value}\` — ${fmt(+r.metricValues[2].value)} 次\n`;
      md += '\n';
    }
  } catch (e) {
    md += `## GA4 流量\n> 例外：${e.message}\n\n`;
  }

  try {
    const s = await gsc(token);
    md += `## Search Console 搜尋\n`;
    if (s.error) {
      md += `> 讀取失敗：${s.error.message}（資源可能尚在驗證或無資料）\n\n`;
    } else if (!s.rows?.length) {
      md += `> 本週無搜尋曝光（新站需數日才被索引）。\n\n`;
    } else {
      const clicks = s.rows.reduce((a, r) => a + r.clicks, 0);
      const imp = s.rows.reduce((a, r) => a + r.impressions, 0);
      md += `- 點擊 clicks：${fmt(clicks)}\n- 曝光 impressions：${fmt(imp)}\n\n### 熱門查詢\n`;
      for (const r of s.rows) md += `- 「${r.keys[0]}」— ${fmt(r.clicks)} 點 / ${fmt(r.impressions)} 曝\n`;
      md += '\n';
    }
  } catch (e) {
    md += `## Search Console\n> 例外：${e.message}\n\n`;
  }

  const out = path.join(ROOT, 'pipeline/.cache/weekly-report.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, md);
  console.log(md);
  console.log(`→ 已寫入 ${out}`);
}

main().catch((e) => {
  console.error('週報失敗：', e.message);
  process.exit(1);
});
