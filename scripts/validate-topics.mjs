#!/usr/bin/env node
// validate-topics.mjs — 驗證 content/topics/*.json：結構完整、slug 對檔名、
// 所有引文 segment_id 真實存在於 data/（防捏造）。CI / push 前跑。
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'content/topics';
let fail = 0;
const err = (f, msg) => {
  console.error(`✗ ${f}: ${msg}`);
  fail++;
};

if (!fs.existsSync(DIR)) {
  console.log('（無 content/topics/，跳過）');
  process.exit(0);
}
const suttaCache = new Map();
function segExists(sutta, segId) {
  if (!suttaCache.has(sutta)) {
    const p = `data/${sutta}.json`;
    suttaCache.set(sutta, fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null);
  }
  const d = suttaCache.get(sutta);
  return d ? d.segments.some((s) => s.segment_id === segId) : false;
}

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
  let t;
  try {
    t = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf-8'));
  } catch (e) {
    err(f, `JSON 解析失敗：${e.message}`);
    continue;
  }
  if (t.slug !== f.replace(/\.json$/, '')) err(f, `slug「${t.slug}」與檔名不符`);
  if (!['draft', 'approved'].includes(t.review_status)) err(f, `review_status 非 draft/approved`);
  if (!t.generated_by) err(f, '缺 generated_by');
  for (const loc of ['zh', 'en']) {
    const L = t[loc];
    if (!L) {
      err(f, `缺 ${loc} 區塊`);
      continue;
    }
    for (const k of ['title', 'seo_title', 'seo_description', 'question', 'definition']) {
      if (!L[k] || typeof L[k] !== 'string') err(f, `${loc}.${k} 缺或非字串`);
    }
    if (!Array.isArray(L.sections) || L.sections.length === 0) err(f, `${loc}.sections 空`);
    if (!Array.isArray(L.faq) || L.faq.length === 0) err(f, `${loc}.faq 空`);
    for (const [i, sec] of (L.sections ?? []).entries()) {
      if (!sec.heading) err(f, `${loc}.sections[${i}] 缺 heading`);
      if (!Array.isArray(sec.paragraphs) || sec.paragraphs.length === 0)
        err(f, `${loc}.sections[${i}].paragraphs 空`);
      for (const q of sec.quotes ?? []) {
        if (!q.sutta || !Array.isArray(q.segment_ids) || q.segment_ids.length === 0) {
          err(f, `${loc}.sections[${i}] 引文缺 sutta/segment_ids`);
          continue;
        }
        for (const sid of q.segment_ids) {
          if (!segExists(q.sutta, sid)) err(f, `${loc}.sections[${i}] 引文 segment 不存在：${q.sutta} ${sid}`);
        }
      }
    }
    for (const s of L.related_suttas ?? []) {
      if (!fs.existsSync(`data/${s}.json`)) err(f, `${loc}.related_suttas 指向不存在的經：${s}`);
    }
  }
}
if (fail) {
  console.error(`\ntopics 驗證失敗：${fail} 個問題`);
  process.exit(1);
}
console.log('topics 驗證通過 ✓');
