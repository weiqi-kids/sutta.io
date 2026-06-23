// pending-review.mjs — 列出自動引擎「待核 L2 段落」（review backlog），唯讀。
// 背景：daily-sutta.sh → publish-clean.ts 只自動核准「零 flag」的 L2 段落；
// 有 issues 的段落留在 data/l2-draft/{id}.json，且被靜默扣住（P0-3 缺口）。
// 本工具掃描所有草稿，與已核准的 data/{id}.json 交叉比對，算出真正待核項目。
// 定義（重要）：草稿段落「真正待核」⟺ 草稿該段 issues.length>0
//   且 對應 data/{id}.json 段落的 vernacular_gloss == null（或該段不存在）。
//   （人工把有 issue 的草稿段直接核進 data 後，data 端已非 null → 不再算待核。）
// 輸出：pipeline/.cache/pending-review.md + stdout。永遠 exit 0。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRAFT_DIR = path.join(ROOT, 'data/l2-draft');

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

function hasIssues(obj) {
  return !!(obj && Array.isArray(obj.issues) && obj.issues.length > 0);
}

// 一個 data 段落「已核准」⟺ vernacular_gloss 非 null/非缺。
function glossApproved(seg) {
  return !!(seg && seg.vernacular_gloss != null);
}

/**
 * 掃描所有草稿，回傳每部經的待核統計。
 * @returns {Array<{sutta_id, segments:string[], summary:boolean, cards:number,
 *                   flaggedSegments:number, total:number, hasData:boolean}>}
 */
export function computePending() {
  let files = [];
  try {
    files = fs.readdirSync(DRAFT_DIR).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  files.sort();

  const out = [];
  for (const file of files) {
    const draft = readJSON(path.join(DRAFT_DIR, file));
    if (!draft) continue;
    const id = draft.sutta_id || file.replace(/\.json$/, '');

    const data = readJSON(path.join(ROOT, 'data', `${id}.json`));
    const hasData = !!data;
    const dataSegs = new Map(
      ((data && data.segments) || []).map((s) => [s.segment_id, s]),
    );

    // 待核 vernacular 段落：草稿有 issues 且 data 端未核准（null 或缺段或無 data 檔）。
    const vern = draft.vernacular || {};
    const flaggedSegments = Object.keys(vern).filter((k) => hasIssues(vern[k]));
    const pendingSegments = flaggedSegments.filter((segId) => {
      if (!hasData) return true; // 無 data 檔 → 全部尚未核准
      return !glossApproved(dataSegs.get(segId));
    });

    // 待核 summary：草稿 summary.issues>0 且 data.summary 未核准（缺 summary）。
    const summaryFlagged = hasIssues(draft.summary);
    const pendingSummary = summaryFlagged && (!data || data.summary == null);

    // 待核 study cards：草稿卡片有 issues 的張數（data 無逐卡核准旗標，
    // 故 data 已有 study_cards 即視為已核准 → 此時 0）。
    const flaggedCards = ((draft.study_cards || []).filter((c) => hasIssues(c))).length;
    const pendingCards =
      flaggedCards > 0 && (!data || !Array.isArray(data.study_cards) || data.study_cards.length === 0)
        ? flaggedCards
        : 0;

    const total = pendingSegments.length + (pendingSummary ? 1 : 0) + pendingCards;

    out.push({
      sutta_id: id,
      segments: pendingSegments,
      summary: pendingSummary,
      cards: pendingCards,
      flaggedSegments: flaggedSegments.length,
      total,
      hasData,
    });
  }
  return out;
}

/**
 * 把待核統計渲染成 markdown 區塊（供 weekly-report 共用）。
 * @param {ReturnType<computePending>} rows
 * @param {string} heading markdown 標題列（含 ## 前綴）
 */
export function renderPendingMarkdown(rows, heading = '## 待核 L2 段落（pending review）') {
  let md = `${heading}\n`;
  const withPending = rows.filter((r) => r.total > 0);
  const grandTotal = rows.reduce((a, r) => a + r.total, 0);

  if (!rows.length) {
    md += `> 無草稿檔（data/l2-draft 為空）。\n\n`;
    return md;
  }
  if (grandTotal === 0) {
    md += `✓ 無待核段落（共掃描 ${rows.length} 部經，所有 flag 段落皆已核准或無 flag）。\n\n`;
    return md;
  }

  md += `共 ${grandTotal} 項待核，分布於 ${withPending.length} 部經：\n\n`;
  for (const r of withPending) {
    const parts = [];
    if (r.segments.length) parts.push(`段落 ${r.segments.length}`);
    if (r.summary) parts.push(`摘要 1`);
    if (r.cards) parts.push(`學習卡 ${r.cards}`);
    md += `- **${r.sutta_id}** — ${r.total} 項（${parts.join('、')}）`;
    if (r.segments.length) md += `：${r.segments.join(', ')}`;
    md += `\n`;
  }
  md += '\n';
  return md;
}

function main() {
  const rows = computePending();
  let md = `# sutta.io 待核 L2 段落報告（${new Date().toISOString().slice(0, 10)}）\n\n`;
  md += renderPendingMarkdown(rows);

  const out = path.join(ROOT, 'pipeline/.cache/pending-review.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, md);
  console.log(md);
  console.log(`→ 已寫入 ${out}`);
}

// 僅在直接執行時跑 main（被 import 時不執行）。
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
