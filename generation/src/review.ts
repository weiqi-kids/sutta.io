// review.ts — 本機校稿工具（L2_GENERATION §6；非公開）。
// 讀 data/l2-draft/{id}.json，逐條 approve/退回；套用 approved → data/{id}.json（review_status:approved）。
// 只有 approved 進正式站；draft 永不上線。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { SuttaFixture } from '@tipitaka/contracts';
import { MODEL } from './tasks.ts';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DATA_DIR = path.join(ROOT, 'data');
const DRAFT_DIR = path.join(DATA_DIR, 'l2-draft');
const PORT = 4567;

const SUTTA = process.env.SUTTA ?? process.argv.find((a) => !a.startsWith('-') && /^[a-z]+\d+$/.test(a)) ?? 'mn10';

interface Item {
  approved?: boolean;
  issues: { kind: string; where: string; detail: string }[];
}
interface DraftStore {
  sutta_id: string;
  generated_by: string;
  vernacular: Record<string, Item & { content: string; grounded_on: string[] }>;
  summary: (Item & { content: string; grounded_on: string[] }) | null;
  study_cards: (Item & { title: string; content: string; sources: string[] })[];
  cost_usd: number;
}

const draftPath = (id: string) => path.join(DRAFT_DIR, `${id}.json`);
function loadDraft(id: string): DraftStore {
  return JSON.parse(fs.readFileSync(draftPath(id), 'utf-8'));
}
function saveDraft(d: DraftStore) {
  fs.writeFileSync(draftPath(d.sutta_id), JSON.stringify(d, null, 2) + '\n');
}

function publish(id: string): { vern: number; summary: boolean; cards: number } {
  const d = loadDraft(id);
  const sutta: SuttaFixture = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${id}.json`), 'utf-8'));
  let vern = 0;
  for (const seg of sutta.segments) {
    const dv = d.vernacular[seg.segment_id];
    if (dv?.approved) {
      seg.vernacular_gloss = {
        generated_by: MODEL,
        grounded_on: dv.grounded_on,
        review_status: 'approved',
        content: dv.content,
      };
      vern++;
    }
  }
  let summary = false;
  if (d.summary?.approved) {
    sutta.summary = {
      generated_by: MODEL,
      grounded_on: d.summary.grounded_on,
      review_status: 'approved',
      content: d.summary.content,
    };
    summary = true;
  }
  let cards = 0;
  const approvedCards = d.study_cards.filter((c) => c.approved);
  if (approvedCards.length) {
    sutta.study_cards = approvedCards.map((c, i) => ({
      card_id: `c${i + 1}`,
      generated_by: MODEL,
      review_status: 'approved' as const,
      title: c.title,
      sources: c.sources,
      content: c.content,
    }));
    cards = approvedCards.length;
  }
  fs.writeFileSync(path.join(DATA_DIR, `${id}.json`), JSON.stringify(sutta, null, 2) + '\n');
  return { vern, summary, cards };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function renderItem(section: string, key: string, title: string, body: string, issues: Item['issues'], approved?: boolean) {
  const flag = issues.length
    ? `<span class="flag">⚑ ${issues.length} 旗標：${esc(issues.map((i) => i.detail).join('；'))}</span>`
    : '';
  return `<div class="item ${approved ? 'ok' : ''} ${issues.length ? 'flagged' : ''}">
    <label><input type="checkbox" ${approved ? 'checked' : ''} onchange="toggle('${section}','${esc(key)}',this.checked)"> 核准</label>
    <div class="title">${esc(title)}</div>
    <div class="body">${esc(body)}</div>${flag}
  </div>`;
}

function page(id: string): string {
  const d = loadDraft(id);
  const vKeys = Object.keys(d.vernacular);
  const approvedN = vKeys.filter((k) => d.vernacular[k].approved).length + (d.summary?.approved ? 1 : 0) + d.study_cards.filter((c) => c.approved).length;
  const flaggedN = vKeys.filter((k) => d.vernacular[k].issues.length).length;
  let html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>校稿 ${id}</title>
  <style>
   body{font-family:system-ui,"Noto Sans TC";max-width:900px;margin:0 auto;padding:24px;background:#F4EFE3;color:#2A2622}
   h1,h2{font-weight:600} .bar{position:sticky;top:0;background:#F4EFE3;padding:12px 0;border-bottom:1px solid #D8CFB9;z-index:9}
   .item{border-left:2px solid #5E6B6E;background:#E6E8E4;padding:8px 12px;margin:8px 0;border-radius:4px}
   .item.ok{border-left-color:#B06A1F;background:#fff}
   .item.flagged{border-left-color:#9A7B2E}
   .title{font-weight:600;font-size:14px} .body{color:#2A2622;margin:4px 0}
   .flag{color:#9A7B2E;font-size:12px;display:block;margin-top:4px}
   button{background:#B06A1F;color:#fff;border:0;border-radius:4px;padding:8px 16px;cursor:pointer;font-size:14px}
   button.sec{background:#5E6B6E} .seg{color:#6B6358;font-size:12px;font-family:monospace}
  </style></head><body>
  <div class="bar"><h1>校稿 ${id}　<span class="seg">已核准 ${approvedN}／白話 ${vKeys.length}、概要 ${d.summary ? 1 : 0}、卡 ${d.study_cards.length}；旗標段 ${flaggedN}　成本 $${d.cost_usd.toFixed(2)}</span></h1>
   <button class="sec" onclick="bulk()">核准所有「無旗標」項</button>
   <button onclick="publish()">套用已核准 → data/${id}.json</button>
   <span id="msg" class="seg"></span></div>`;

  if (d.summary) html += `<h2>章節概要</h2>` + renderItem('summary', 'summary', '概要', d.summary.content, d.summary.issues, d.summary.approved);
  html += `<h2>研經卡</h2>`;
  d.study_cards.forEach((c, i) => (html += renderItem('card', String(i), c.title, c.content, c.issues, c.approved)));
  html += `<h2>逐字白話（${vKeys.length} 段）</h2>`;
  for (const k of vKeys) html += renderItem('vernacular', k, k, d.vernacular[k].content, d.vernacular[k].issues, d.vernacular[k].approved);

  html += `<script>
   async function post(u,b){const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});return r.json()}
   async function toggle(section,key,approved){await post('/toggle',{section,key,approved})}
   async function bulk(){const r=await post('/bulk',{});document.getElementById('msg').textContent='已核准 '+r.count+' 項無旗標';setTimeout(()=>location.reload(),600)}
   async function publish(){const r=await post('/publish',{});document.getElementById('msg').textContent='已套用：白話'+r.vern+'、概要'+(r.summary?1:0)+'、卡'+r.cards+'。記得重跑 pnpm pipeline 更新索引/嵌入。'}
  </script></body></html>`;
  return html;
}

function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => resolve(b ? JSON.parse(b) : {}));
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(page(SUTTA));
    }
    if (req.method === 'POST' && req.url === '/toggle') {
      const { section, key, approved } = await readBody(req);
      const d = loadDraft(SUTTA);
      if (section === 'summary' && d.summary) d.summary.approved = approved;
      else if (section === 'card') d.study_cards[Number(key)].approved = approved;
      else if (section === 'vernacular' && d.vernacular[key]) d.vernacular[key].approved = approved;
      saveDraft(d);
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end('{"ok":true}');
    }
    if (req.method === 'POST' && req.url === '/bulk') {
      const d = loadDraft(SUTTA);
      let count = 0;
      const clean = (it: Item) => it.issues.length === 0 && ((it.approved = true), count++);
      if (d.summary && d.summary.issues.length === 0) clean(d.summary);
      for (const c of d.study_cards) if (c.issues.length === 0) clean(c);
      for (const k of Object.keys(d.vernacular)) if (d.vernacular[k].issues.length === 0) clean(d.vernacular[k]);
      saveDraft(d);
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ count }));
    }
    if (req.method === 'POST' && req.url === '/publish') {
      const r = publish(SUTTA);
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(r));
    }
    res.writeHead(404);
    res.end('not found');
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
});

server.listen(PORT, () => {
  console.log(`校稿工具：http://localhost:${PORT}/　（經：${SUTTA}）`);
  console.log('核准後按「套用已核准」，再重跑 pnpm pipeline 更新索引/嵌入。');
});
