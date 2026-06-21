// build-golden.ts — 產生 golden 回歸基準（TEST_SPEC §2 / H-1）。
// 選涵蓋常見字/複合詞/歧義/無詞條/有平行的代表 segment，快照其 DPD 解析。
// 註：此為「管線輸出快照」，作回歸哨兵；正式 golden 須人工逐欄核過（H-1 持續工作）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sutta = process.argv.find((a) => /^[a-z]+\d+$/.test(a)) ?? 'mn10';
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', `${sutta}.json`), 'utf-8'));

const segs = data.segments as any[];
const passageNull = new Set<string>();
for (const p of data.passages) if (p.agama == null) for (const sid of p.segment_ids) passageNull.add(sid);

// 分類挑選
const withNull = segs.filter((s) => s.pali_tokens.some((t: any) => t.dpd_id === null));
const withCompound = segs.filter((s) => s.pali_tokens.some((t: any) => t.compound));
const withAmbig = segs.filter((s) => s.pali_tokens.some((t: any) => t.ambiguous));
const plain = segs.filter((s) => s.pali_tokens.every((t: any) => !t.ambiguous && t.dpd_id != null));

const pick = (arr: any[], n: number) => arr.slice(0, n);
const chosen = new Map<string, any>();
for (const s of [...pick(withNull, 8), ...pick(withCompound, 10), ...pick(withAmbig, 12), ...pick(plain, 12)]) {
  chosen.set(s.segment_id, s);
}

const golden = {
  _note: '回歸基準（管線輸出快照，作回歸哨兵；正式 golden 須人工逐欄核過，H-1）。',
  sutta: sutta,
  segments: [...chosen.values()].map((s) => ({
    segment_id: s.segment_id,
    has_agama_parallel: !passageNull.has(s.segment_id),
    tokens: s.pali_tokens.map((t: any) => ({
      surface: t.surface,
      lemma: t.lemma,
      dpd_id: t.dpd_id,
      root: t.root,
      morph: t.morph,
      ambiguous: t.ambiguous,
    })),
  })),
};

const outDir = path.join(ROOT, 'fixtures', 'golden');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `${sutta}.golden.json`), JSON.stringify(golden, null, 2) + '\n');
console.log(`✓ golden 基準：${golden.segments.length} 段 → fixtures/golden/${sutta}.golden.json`);
