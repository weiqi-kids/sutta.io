// validate-golden.ts — 回歸測試（TEST_SPEC §2 / H-2）。
// 改管線/換資料版後重跑，比對 data/ 與 golden 基準逐欄 diff；有差異即 fail，人工確認改善或退步。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const goldenDir = path.join(ROOT, 'fixtures', 'golden');

let diffs = 0;
let checked = 0;

if (!fs.existsSync(goldenDir)) {
  console.log('（無 golden 基準，略過回歸）');
  process.exit(0);
}

for (const f of fs.readdirSync(goldenDir)) {
  if (!f.endsWith('.golden.json')) continue;
  const golden = JSON.parse(fs.readFileSync(path.join(goldenDir, f), 'utf-8'));
  const dataFile = path.join(ROOT, 'data', `${golden.sutta}.json`);
  if (!fs.existsSync(dataFile)) {
    console.error(`✗ 缺 data/${golden.sutta}.json`);
    diffs++;
    continue;
  }
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  const segMap = new Map(data.segments.map((s: any) => [s.segment_id, s]));
  const passageNull = new Set<string>();
  for (const p of data.passages) if (p.agama == null) for (const sid of p.segment_ids) passageNull.add(sid);

  for (const g of golden.segments) {
    checked++;
    const cur: any = segMap.get(g.segment_id);
    if (!cur) {
      console.error(`✗ ${g.segment_id}：data 中已不存在`);
      diffs++;
      continue;
    }
    const curHasParallel = !passageNull.has(g.segment_id);
    if (curHasParallel !== g.has_agama_parallel) {
      console.error(`✗ ${g.segment_id}：阿含平行 ${g.has_agama_parallel}→${curHasParallel}`);
      diffs++;
    }
    // token 逐欄
    for (let i = 0; i < g.tokens.length; i++) {
      const gt = g.tokens[i];
      const ct = cur.pali_tokens[i];
      if (!ct) {
        console.error(`✗ ${g.segment_id}#${i}：token 數變少（${gt.surface}）`);
        diffs++;
        continue;
      }
      for (const field of ['surface', 'lemma', 'dpd_id', 'root', 'morph', 'ambiguous'] as const) {
        if (JSON.stringify(gt[field]) !== JSON.stringify(ct[field])) {
          console.error(`✗ ${g.segment_id}#${i}（${gt.surface}）：${field} ${JSON.stringify(gt[field])}→${JSON.stringify(ct[field])}`);
          diffs++;
        }
      }
    }
  }
}

if (diffs > 0) {
  console.error(`\n回歸失敗：${diffs} 處與 golden 不一致（共驗 ${checked} 段）。人工確認是改善還是退步，再更新基準。`);
  process.exit(1);
}
console.log(`✓ golden 回歸通過（${checked} 段與基準一致）。`);
