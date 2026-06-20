// publish-clean.ts — 批次核准「防護欄全過（零旗標）」的 L2 草稿並併入 data/{id}.json。
// 有旗標者保留 draft（待人工複核）。對應校稿工具的「核准無旗標項 + 套用」。
import fs from 'node:fs';
import path from 'node:path';
import type { SuttaFixture } from '@tipitaka/contracts';
import { MODEL } from './tasks.ts';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DATA_DIR = path.join(ROOT, 'data');

const id = process.argv.find((a) => /^[a-z]+\d+$/.test(a)) ?? 'mn10';
const draft = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'l2-draft', `${id}.json`), 'utf-8'));
const sutta: SuttaFixture = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${id}.json`), 'utf-8'));

const clean = (issues: { length: number }[] | any[]) => (issues?.length ?? 0) === 0;

let vern = 0,
  held = 0;
for (const seg of sutta.segments) {
  const dv = draft.vernacular[seg.segment_id];
  if (!dv) continue;
  if (clean(dv.issues)) {
    seg.vernacular_gloss = {
      generated_by: MODEL,
      grounded_on: dv.grounded_on,
      review_status: 'approved',
      content: dv.content,
    };
    vern++;
  } else {
    held++; // 有旗標 → 不上線，保留 draft 待人工
  }
}

let summary = false;
if (draft.summary && clean(draft.summary.issues)) {
  sutta.summary = {
    generated_by: MODEL,
    grounded_on: draft.summary.grounded_on,
    review_status: 'approved',
    content: draft.summary.content,
  };
  summary = true;
}

const cleanCards = (draft.study_cards ?? []).filter((c: any) => clean(c.issues));
sutta.study_cards = cleanCards.map((c: any, i: number) => ({
  card_id: `c${i + 1}`,
  generated_by: MODEL,
  review_status: 'approved' as const,
  title: c.title,
  sources: c.sources,
  content: c.content,
}));

fs.writeFileSync(path.join(DATA_DIR, `${id}.json`), JSON.stringify(sutta, null, 2) + '\n');
console.log(`✓ 已併入 ${id}.json：白話 approved ${vern} 段（保留 draft ${held} 段）、概要 ${summary ? 1 : 0}、研經卡 ${cleanCards.length}`);
console.log('下一步：pnpm pipeline --only=index、--only=embed（白話進索引/語意），再 build + 部署。');
