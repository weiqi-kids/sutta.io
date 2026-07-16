// build-xrefs.mjs — 產出「跨經連結」衍生資料 data/xrefs.json（研經頁消費）。
//
// 兩層，皆「可驗證、零 AI 臆測」（守本站防捏造鐵則）：
//   L1 段落級「此段亦見於…」＝同一段巴利經文（逐字正規化後相同）在多部站內經重複出現的公式段。
//        連續共享段落成組（run），每組掛一條註解、深連到其他經對應段。純由 data/*.json 語料計算。
//   L2 經級「相關經文」＝ SuttaCentral parallels.json 標記的平行經，過濾成「站內存在」者。
//        需 pipeline/.cache/sc-parallels.json（daily/本機有；CI 無 → 讀不到時保留 L1、L2 留空並警告）。
//
// 產物 data/xrefs.json 與 index-*.json 一樣提交進 repo；CI 純消費（保持 build hermetic）。
// 每日新經：由 scripts/daily-sutta.sh 在有 cache 的主機重跑本腳本 → 自動涵蓋。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(DATA, 'xrefs.json');
const SC_PARALLELS = path.join(ROOT, 'pipeline/.cache/sc-parallels.json');

// ---- 門檻（保守，避免瑣碎公共句造成雜訊）----
const MIN_SEG_WORDS = 5; // 建索引時，短於此字數的段（問候語/連接語）不參與比對
const MIN_RUN_WORDS = 12; // 一組共享段落總字數低於此 → 不視為有意義的公式段，不出註
const MAX_TARGETS = 5; // 每條註解最多列幾部其他經
const MAX_NOTES_PER_SUTTA = 8; // 每部經最多幾條段落註（近乎重複的經會碎成數十條 → 上限＋合併去噪；整經重合由 L2 相關經文承接）

const normalize = (s) =>
  s
    .toLowerCase()
    .replace(/[.,;:?!'’‘"“”\-–—…()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ---- 載入站內全部經 ----
const suttaFiles = fs
  .readdirSync(DATA)
  .filter((f) => /^(mn|sn|dn|an)\d/.test(f) && f.endsWith('.json'));

/** id → { id, title_zh, title_pali, segs: [{ id, norm, words }] }（segs 保序） */
const suttas = new Map();
for (const f of suttaFiles) {
  let d;
  try {
    d = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
  } catch {
    continue;
  }
  if (!d?.sutta?.id || !Array.isArray(d.segments)) continue;
  const segs = d.segments.map((s) => {
    const pali = (s.pali_tokens || []).map((t) => t.surface).join(' ');
    const norm = normalize(pali);
    return { id: s.segment_id, norm, words: norm ? norm.split(' ').length : 0 };
  });
  suttas.set(d.sutta.id, {
    id: d.sutta.id,
    title_zh: d.sutta.title_zh,
    title_pali: d.sutta.title_pali,
    segs,
  });
}

// ---- L1：全域公式索引（normalized pali → [{sutta, segId}]）----
const bag = new Map();
for (const s of suttas.values()) {
  for (const seg of s.segs) {
    if (seg.words < MIN_SEG_WORDS) continue;
    if (!bag.has(seg.norm)) bag.set(seg.norm, []);
    bag.get(seg.norm).push({ sutta: s.id, segId: seg.id });
  }
}

/** 某段 norm → 目標經對應段（去掉 self；每經取最早一次出現）。無跨經 → null。 */
function otherSuttaSegs(norm, selfId) {
  const occ = bag.get(norm);
  if (!occ) return null;
  const byS = new Map();
  for (const o of occ) {
    if (o.sutta === selfId) continue;
    if (!byS.has(o.sutta)) byS.set(o.sutta, o.segId);
  }
  return byS.size ? byS : null;
}

/** 為單經算 L1 pericope 註解。 */
function pericopesFor(s) {
  const notes = [];
  const segs = s.segs;
  let i = 0;
  while (i < segs.length) {
    const om = segs[i].words >= MIN_SEG_WORDS ? otherSuttaSegs(segs[i].norm, s.id) : null;
    if (!om) {
      i++;
      continue;
    }
    // 收一組連續共享段
    const run = [];
    let j = i;
    while (j < segs.length) {
      const m = segs[j].words >= MIN_SEG_WORDS ? otherSuttaSegs(segs[j].norm, s.id) : null;
      if (!m) break;
      run.push({ seg: segs[j], targets: m });
      j++;
    }
    i = j;

    const runWords = run.reduce((a, r) => a + r.seg.words, 0);
    if (runWords < MIN_RUN_WORDS) continue;

    // 目標經：統計在此 run 內共享幾段；保留（共享 ≥2 段）或（run 僅 1 段但夠長 ≥10 字）。
    // 深連錨點＝該目標經內、run 中最早共享段落對應的 segId。
    const tally = new Map(); // targetSutta → { count, seg }
    for (const r of run) {
      for (const [ts, tseg] of r.targets) {
        if (!tally.has(ts)) tally.set(ts, { count: 0, seg: tseg });
        tally.get(ts).count++;
      }
    }
    const singleLong = run.length === 1 && run[0].seg.words >= 10;
    let targets = [...tally.entries()]
      .filter(([, v]) => v.count >= 2 || singleLong)
      .map(([ts, v]) => {
        const meta = suttas.get(ts);
        return { sutta: ts, seg: v.seg, count: v.count, title_zh: meta?.title_zh ?? ts };
      });
    if (!targets.length) continue;
    // 共享段數多者優先，其次經號自然序
    targets.sort((a, b) => b.count - a.count || cmpId(a.sutta, b.sutta));
    const total = targets.length;
    targets = targets.slice(0, MAX_TARGETS).map(({ sutta, seg, title_zh }) => ({ sutta, seg, title_zh }));

    notes.push({
      anchor: run[0].seg.id,
      segCount: run.length,
      overflow: Math.max(0, total - targets.length),
      targets,
    });
  }
  return denoise(notes);
}

/** 去噪：合併「目標經集合完全相同」的相鄰註（近乎重複的經會碎成數十條）＋每經上限（留最實質者）。 */
function denoise(notes) {
  const key = (n) => n.targets.map((t) => t.sutta).sort().join(',');
  const merged = [];
  for (const n of notes) {
    const prev = merged[merged.length - 1];
    if (prev && key(prev) === key(n)) {
      prev.segCount += n.segCount; // 併入前一條（同一組目標經的多處重複），保留較早錨點
    } else {
      merged.push({ ...n });
    }
  }
  if (merged.length <= MAX_NOTES_PER_SUTTA) return merged;
  // 超量 → 留共享跨度最大的前 N 條，再依錨點（段落順序）還原
  const order = new Map(merged.map((n, i) => [n.anchor, i]));
  return merged
    .slice()
    .sort((a, b) => b.segCount - a.segCount)
    .slice(0, MAX_NOTES_PER_SUTTA)
    .sort((a, b) => order.get(a.anchor) - order.get(b.anchor));
}

// ---- L2：SC parallels（過濾站內存在者）----
function cmpId(a, b) {
  const pa = a.match(/^([a-z]+)([\d.]+)$/);
  const pb = b.match(/^([a-z]+)([\d.]+)$/);
  if (pa && pb) {
    if (pa[1] !== pb[1]) return pa[1].localeCompare(pb[1]);
    const na = pa[2].split('.').map(Number);
    const nb = pb[2].split('.').map(Number);
    for (let k = 0; k < Math.max(na.length, nb.length); k++) {
      const d = (na[k] ?? 0) - (nb[k] ?? 0);
      if (d) return d;
    }
    return 0;
  }
  return a.localeCompare(b);
}

function buildParallels() {
  if (!fs.existsSync(SC_PARALLELS)) {
    console.warn(`⚠ 找不到 ${path.relative(ROOT, SC_PARALLELS)} → L2 相關經文留空（僅 L1）。` +
      `\n  （CI 環境正常；請在有 pipeline/.cache 的主機重跑以更新 L2。）`);
    return null;
  }
  const P = JSON.parse(fs.readFileSync(SC_PARALLELS, 'utf8'));
  const base = (x) => x.replace(/^~/, '').split('#')[0];
  // sutta → Map(target → full?)（full 平行優先於 ~ 部分平行）
  const rel = new Map();
  for (const e of P) {
    const arr = e.parallels || [];
    for (const a of arr) {
      const ab = base(a);
      if (!suttas.has(ab)) continue;
      for (const b of arr) {
        const bb = base(b);
        if (bb === ab || !suttas.has(bb)) continue;
        const full = !a.startsWith('~') && !b.startsWith('~');
        if (!rel.has(ab)) rel.set(ab, new Map());
        const m = rel.get(ab);
        m.set(bb, (m.get(bb) || false) || full);
      }
    }
  }
  return rel;
}

// ---- 組裝 ----
const parallels = buildParallels();
const xrefs = {};
let l1Notes = 0;
let l2Edges = 0;
for (const s of suttas.values()) {
  const pericopes = pericopesFor(s);
  l1Notes += pericopes.length;
  let par = [];
  if (parallels && parallels.has(s.id)) {
    par = [...parallels.get(s.id).entries()]
      .map(([ts, full]) => {
        const meta = suttas.get(ts);
        return { sutta: ts, full, title_zh: meta?.title_zh ?? ts, title_pali: meta?.title_pali ?? '' };
      })
      .sort((a, b) => (b.full ? 1 : 0) - (a.full ? 1 : 0) || cmpId(a.sutta, b.sutta));
    l2Edges += par.length;
  }
  if (pericopes.length || par.length) {
    xrefs[s.id] = { pericopes, parallels: par };
  }
}

fs.writeFileSync(OUT, JSON.stringify(xrefs) + '\n');
console.log(
  `build-xrefs: ${suttas.size} 部經 → ` +
    `L1 段落註 ${l1Notes} 條、L2 相關經文 ${l2Edges} 條邊 → ${path.relative(ROOT, OUT)}`,
);
