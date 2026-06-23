#!/usr/bin/env node
// sample-l2.mjs — 確定性抽樣 L2 白話注（vernacular_gloss）供人工驗收（BACKLOG H）。
//
// L2 = AI 生成、需 grounded、需人工覆核後才發佈的內容層。
// 本工具從所有上線經（data/mn*.json）中，依固定步長抽 N 段白話注，
// 輸出 markdown 驗收表（stdout + pipeline/.cache/l2-sample.md），
// 每項附 Pāli 原文、白話內容、grounded_on 數、對應阿含平行（若有），
// 並留 checkbox + 「判定/備註」空行供人工填寫。
//
// 確定性：不用 Math.random / Date；以排序後 segment_id 的固定步長 stride 抽樣，重跑結果穩定。
// 用法：
//   node scripts/sample-l2.mjs            # 預設 N=20，所有經
//   node scripts/sample-l2.mjs --n=8      # 抽 8 段
//   node scripts/sample-l2.mjs --sutta=mn10  # 只抽 mn10
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'pipeline', '.cache', 'l2-sample.md');

// --- 參數 ---
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
};
const N = Math.max(1, parseInt(getArg('n', '20'), 10) || 20);
const SUTTA_FILTER = getArg('sutta', null);

// --- 載入上線經 ---
function liveSuttas() {
  return fs
    .readdirSync(DATA)
    .filter((f) => /^mn\d+\.json$/.test(f))
    .map((f) => f.replace(/\.json$/, ''))
    .filter((id) => !SUTTA_FILTER || id === SUTTA_FILTER)
    .sort((a, b) => parseInt(a.slice(2), 10) - parseInt(b.slice(2), 10));
}

// 重建 Pāli 原文：優先用 token surface 串接，否則退而列 lemma。
function reconstructPali(seg) {
  const toks = seg.pali_tokens || [];
  const parts = toks.map((t) => t.surface ?? t.text ?? t.lemma ?? '?');
  return parts.join(' ').replace(/\s+([.,;:?!])/g, '$1').trim();
}

// 建立 segment_id -> agama 物件（若該段所屬 passage 有平行）。
function agamaIndex(data) {
  const idx = new Map();
  for (const p of data.passages || []) {
    if (!p.agama) continue;
    for (const sid of p.segment_ids || []) idx.set(sid, p.agama);
  }
  return idx;
}

// 蒐集所有「有 L2 白話注內容」的段（候選池）。
const pool = [];
for (const id of liveSuttas()) {
  const file = path.join(DATA, `${id}.json`);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    console.error(`! 無法讀取 ${file}: ${e.message}`);
    continue;
  }
  const aIdx = agamaIndex(data);
  for (const seg of data.segments || []) {
    const g = seg.vernacular_gloss;
    if (!g || !g.content || !String(g.content).trim()) continue;
    pool.push({
      sutta: id,
      segment_id: seg.segment_id,
      pali: reconstructPali(seg),
      content: String(g.content).trim(),
      grounded_on: Array.isArray(g.grounded_on) ? g.grounded_on.length : 0,
      review_status: g.review_status ?? '(未標)',
      agama: aIdx.get(seg.segment_id) || null,
    });
  }
}

// 候選池以 (sutta, segment_id) 確定性排序。
pool.sort((a, b) => (a.sutta + '|' + a.segment_id).localeCompare(b.sutta + '|' + b.segment_id));

// 確定性抽樣：固定步長 stride，等距取點，重跑穩定。
function sample(arr, n) {
  if (arr.length <= n) return arr.slice();
  const stride = arr.length / n;
  const picks = [];
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    let idx = Math.floor(i * stride);
    while (seen.has(idx) && idx < arr.length - 1) idx++;
    seen.add(idx);
    picks.push(arr[idx]);
  }
  return picks;
}

const picked = sample(pool, N);

// 截斷阿含平行文（驗收表只需對照參考，全文太長）。
function clip(s, max = 220) {
  s = String(s).replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) + '…（已截斷）' : s;
}

const lines = [];
lines.push('# L2 白話注 — 人工驗收抽樣表');
lines.push('');
lines.push(`- 抽樣數：${picked.length} / 候選池 ${pool.length} 段`);
lines.push(`- 範圍：${SUTTA_FILTER ? SUTTA_FILTER : '全部上線經 ' + liveSuttas().join(', ')}`);
lines.push('- 抽樣法：候選池依 (經, segment_id) 排序後等距步長抽樣（確定性，重跑穩定）');
lines.push('- 驗收準則見 docs/04-engineering/QA_ACCEPTANCE.md');
lines.push('');
lines.push('> 逐項勾選並填「判定/備註」：判定填 通過 / 退回 / 待議；備註寫具體問題（接地、義理、譯準、信任邊界）。');
lines.push('');

picked.forEach((it, i) => {
  lines.push(`## ${i + 1}. ${it.sutta} · ${it.segment_id}`);
  lines.push('');
  lines.push(`- review_status：\`${it.review_status}\`  ｜ grounded_on：${it.grounded_on} 個 token`);
  lines.push(`- **Pāli**：${it.pali || '（無 token）'}`);
  lines.push(`- **白話 L2**：${it.content}`);
  if (it.agama) {
    lines.push(`- **阿含平行**（${it.agama.ref || it.agama.source || '來源未標'}）：${clip(it.agama.text || '')}`);
  } else {
    lines.push('- **阿含平行**：（此段所屬 passage 無平行）');
  }
  lines.push('');
  lines.push('- [ ] 已覆核');
  lines.push('- 判定/備註：');
  lines.push('');
});

const report = lines.join('\n') + '\n';

// 寫檔（確保 cache 目錄存在）+ stdout。
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, report);
process.stdout.write(report);
process.stderr.write(`\n✓ 抽樣表已寫入 ${path.relative(ROOT, OUT)}（${picked.length} 項）\n`);
