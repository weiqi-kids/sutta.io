#!/usr/bin/env node
// topics-normalize.mjs — 容錯正規化 content/topics/*.json：
//   ① sections[].body（字串）→ paragraphs（陣列）
//   ② quotes[] 缺 sutta 時，若該檔所有其他 quotes 只指向單一部經則補上，否則留給驗證器報錯
// 跑完請再跑 validate-topics.mjs。
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'content/topics';
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
  const p = path.join(DIR, f);
  let t;
  try {
    t = JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    continue; // 半成品，跳過
  }
  let changed = false;
  for (const loc of ['zh', 'en']) {
    const L = t[loc];
    if (!L?.sections) continue;
    const suttas = new Set(
      L.sections.flatMap((s) => (s.quotes ?? []).map((q) => q.sutta).filter(Boolean))
    );
    const only = suttas.size === 1 ? [...suttas][0] : null;
    for (const sec of L.sections) {
      if (typeof sec.body === 'string' && !sec.paragraphs) {
        sec.paragraphs = sec.body.split(/\n\n+/).filter(Boolean);
        delete sec.body;
        changed = true;
      }
      for (const q of sec.quotes ?? []) {
        if (!q.sutta && only) {
          q.sutta = only;
          changed = true;
        }
      }
    }
  }
  if (changed) {
    fs.writeFileSync(p, JSON.stringify(t, null, 2) + '\n');
    console.log(`正規化：${f}`);
  }
}
console.log('done');
