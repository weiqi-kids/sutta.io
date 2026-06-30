#!/usr/bin/env node
// 資料心跳（資料層「報數據」）：讀 data/seo-daily/<台灣日期>.json → 組人話摘要 → 發 Slack。
// 比照 folk.tw scripts/seo-report-slack.mjs。純數據、無 AI。與 collect 解耦：即使大腦層停用，每天仍收得到。
// 用法：
//   node scripts/seo-report-slack.mjs           # 讀今天 JSON、發 Slack
//   node scripts/seo-report-slack.mjs --dry      # 只印訊息、不發
//   node scripts/seo-report-slack.mjs 2026-07-01 # 指定日期
// 憑證：env SLACK_BOT_TOKEN，否則讀 /root/.config/sutta-io/slack-bot-token。頻道：C0BCK9N8SSX。
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const DRY = process.argv.includes('--dry');
const dateArg = process.argv.slice(2).find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const TOKEN_FILE = process.env.SUTTA_SLACK_TOKEN_FILE || '/root/.config/sutta-io/slack-bot-token';
const CHANNEL = process.env.SLACK_CHANNEL || 'C0BCK9N8SSX';

const twDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
const date = dateArg || twDate();
const file = join(repo, 'data', 'seo-daily', `${date}.json`);
if (!existsSync(file)) { console.error(`[heartbeat] 找不到 ${file}`); process.exit(1); }
const d = JSON.parse(readFileSync(file, 'utf8'));

const md = date.slice(5).replace('-', '/');
const pct = (x) => (x == null ? '—' : `${(x * 100).toFixed(1)}%`);
const pos = (x) => (x == null ? '—' : x.toFixed(1));
const short = (u) => (u || '').replace('https://sutta.io', '') || '/';

let m = `📊 *sutta.io 資料心跳 · ${md}*（本機自動產出，純數據不含分析）\n\n`;

// 北極星：台灣自然搜尋訪客
m += `【北極星｜台灣 Google 自然搜尋訪客（近 7 天）】\n`;
m += d.ga4?.error ? `・讀取失敗：${d.ga4.error}\n` : `・${d.ga4.taiwanOrganicSessions} 人（全站工作階段 ${d.ga4.sessions}、瀏覽 ${d.ga4.views}）\n`;

// Google 搜尋數據
m += `\n【Google 搜尋數據】\n`;
if (d.gsc?.error) m += `・讀取失敗：${d.gsc.error}\n`;
else {
  const t = d.gsc.totals;
  m += `・被看到 ${t.impressions} 次・有人點 ${t.clicks} 次・點擊率 ${pct(t.ctr)}・平均排名 ${pos(t.position)}\n　（資料 ${d.gsc.range}，有 2–3 天延遲）\n`;
}

// 最該推一把：striking-distance
if (d.gsc && !d.gsc.error && d.gsc.strikingDistance?.length) {
  m += `\n【最該推一把：排 5–15 名、快進第一頁的字】\n`;
  for (const r of d.gsc.strikingDistance.slice(0, 3)) {
    m += `・「${r.query}」${short(r.page)}　排 ${pos(r.position)}・被看到 ${r.impressions} 次・${r.clicks} 點擊\n`;
  }
}

// 高曝光零點擊
if (d.gsc && !d.gsc.error && d.gsc.highImpZeroClick?.length) {
  m += `\n【很多人看到卻沒人點（可改標題/描述）】\n`;
  for (const r of d.gsc.highImpZeroClick.slice(0, 3)) {
    m += `・「${r.query}」${short(r.page)}　被看到 ${r.impressions} 次・0 點\n`;
  }
}

// index 覆蓋
if (d.index && !d.index.error && d.index.coverage?.length) {
  const indexed = d.index.coverage.filter((c) => (c.coverageState || '').includes('indexed')).length;
  m += `\n【追蹤頁 Google 收錄】\n・${indexed}/${d.index.coverage.length} 頁已收錄\n`;
}

m += `\n📄 完整數據：data/seo-daily/${date}.json`;

if (DRY) { console.log(m); process.exit(0); }

const token = process.env.SLACK_BOT_TOKEN || (existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf8').trim() : '');
if (!token) { console.error('[heartbeat] 缺 Slack token'); process.exit(1); }
const res = await fetch('https://slack.com/api/chat.postMessage', {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ channel: CHANNEL, text: m, unfurl_links: false, unfurl_media: false }),
});
const j = await res.json();
if (j.ok) console.log(`[heartbeat] ✅ 已發送（ts=${j.ts}）`);
else { console.error(`[heartbeat] ❌ 發送失敗：${j.error}`); process.exit(1); }
