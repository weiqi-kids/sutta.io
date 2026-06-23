#!/usr/bin/env node
// qa-scan-l2.mjs — L2 自動紅旗掃描（BACKLOG H）。
//
// 對所有上線經（data/mn*.json）的 L2 內容（vernacular_gloss / summary / study_cards）
// 做機器可查的紅旗檢測，輸出 markdown 報告（stdout + pipeline/.cache/qa-scan.md）。
// 此為「報告」工具，永遠 exit 0；紅旗不代表必錯，需人工進一步研判（見 QA_ACCEPTANCE.md）。
//
// 檢測項：
//   MISSING_GROUNDING  已 approved 的 gloss/summary 卻無 grounded_on（或 card 無 sources）
//   TOO_SHORT          內容 < 2 字或空白
//   PLACEHOLDER        殘留佔位/mock 標記（PLACEHOLDER / TODO / mock / lorem 等）
//   NOT_APPROVED       資料中存在的 L2 但 review_status != 'approved'
//   UNTRANSLATED       白話內容與該段 Pāli 原文相同（未翻譯）
//
// 用法：node scripts/qa-scan-l2.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'pipeline', '.cache', 'qa-scan.md');

const PLACEHOLDER_RE = /\b(placeholder|todo|fixme|lorem ipsum|lorem|mock(?:ed|up)?|xxx|tbd|待填|佔位|範例文字|sample text)\b/i;

function liveSuttas() {
  return fs
    .readdirSync(DATA)
    .filter((f) => /^mn\d+\.json$/.test(f))
    .map((f) => f.replace(/\.json$/, ''))
    .sort((a, b) => parseInt(a.slice(2), 10) - parseInt(b.slice(2), 10));
}

function reconstructPali(seg) {
  const toks = seg.pali_tokens || [];
  return toks
    .map((t) => t.surface ?? t.text ?? t.lemma ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 正規化：去空白與標點，用於「白話 == Pāli」比對。
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\s.,;:?!'"“”‘’（）()「」『』。，、；：？！·…—-]/g, '');
}

const issues = []; // {sutta, where, code, detail}
const add = (sutta, where, code, detail) => issues.push({ sutta, where, code, detail });

// 對一則 L2 物件做共通檢測。groundField: 'grounded_on' | 'sources'
function checkL2(sutta, where, obj, { groundField = 'grounded_on', pali = null } = {}) {
  if (!obj) return;
  const content = obj.content == null ? '' : String(obj.content).trim();
  const status = obj.review_status;

  // NOT_APPROVED：有此 L2 存在卻非 approved
  if (status !== 'approved') {
    add(sutta, where, 'NOT_APPROVED', `review_status=${JSON.stringify(status ?? null)}`);
  }

  // TOO_SHORT
  if (content.length < 2) {
    add(sutta, where, 'TOO_SHORT', `內容長度 ${content.length}：${JSON.stringify(content)}`);
  }

  // PLACEHOLDER
  if (PLACEHOLDER_RE.test(content)) {
    const m = content.match(PLACEHOLDER_RE);
    add(sutta, where, 'PLACEHOLDER', `命中標記「${m ? m[0] : '?'}」`);
  }

  // MISSING_GROUNDING（僅對已 approved 的內容才視為硬問題）
  const ground = obj[groundField];
  const groundLen = Array.isArray(ground) ? ground.length : 0;
  if (groundLen === 0 && status === 'approved') {
    add(sutta, where, 'MISSING_GROUNDING', `已 approved 但 ${groundField} 為空/缺`);
  }

  // UNTRANSLATED（僅 gloss 有 pali 可比對）
  if (pali && content && norm(content) === norm(pali) && norm(content).length > 0) {
    add(sutta, where, 'UNTRANSLATED', `白話與 Pāli 相同：${JSON.stringify(content.slice(0, 40))}`);
  }
}

let counts = {}; // sutta -> {code -> n}
const bump = (sutta, code) => {
  (counts[sutta] ||= {})[code] = ((counts[sutta] || {})[code] || 0) + 1;
};

const suttas = liveSuttas();
for (const id of suttas) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(DATA, `${id}.json`), 'utf-8'));
  } catch (e) {
    add(id, 'file', 'READ_ERROR', e.message);
    continue;
  }

  // segments 的 vernacular_gloss
  for (const seg of data.segments || []) {
    const g = seg.vernacular_gloss;
    if (!g) continue; // null gloss 不算 L2 存在，略過
    checkL2(id, `seg ${seg.segment_id}`, g, {
      groundField: 'grounded_on',
      pali: reconstructPali(seg),
    });
  }

  // summary
  if (data.summary) {
    checkL2(id, 'summary', data.summary, { groundField: 'grounded_on' });
  }

  // study_cards（接地欄位為 sources）
  for (const c of data.study_cards || []) {
    checkL2(id, `card ${c.card_id ?? '?'}（${c.title ?? ''}）`, c, { groundField: 'sources' });
  }
}

for (const it of issues) bump(it.sutta, it.code);

// --- 產生報告 ---
const ALL_CODES = ['MISSING_GROUNDING', 'TOO_SHORT', 'PLACEHOLDER', 'NOT_APPROVED', 'UNTRANSLATED', 'READ_ERROR'];
const lines = [];
lines.push('# L2 自動紅旗掃描報告');
lines.push('');
lines.push(`- 掃描經：${suttas.join(', ')}（共 ${suttas.length} 部）`);
lines.push(`- 紅旗總數：**${issues.length}**`);
lines.push('- 說明：此為自動初篩，紅旗需人工研判；本工具一律 exit 0。準則見 docs/04-engineering/QA_ACCEPTANCE.md');
lines.push('');

// 每經計數表
lines.push('## 每經紅旗計數');
lines.push('');
lines.push('| 經 | ' + ALL_CODES.join(' | ') + ' | 小計 |');
lines.push('|' + '---|'.repeat(ALL_CODES.length + 2));
for (const id of suttas) {
  const c = counts[id] || {};
  const row = ALL_CODES.map((code) => c[code] || 0);
  const sub = row.reduce((a, b) => a + b, 0);
  lines.push(`| ${id} | ${row.join(' | ')} | ${sub} |`);
}
const grand = ALL_CODES.map((code) => issues.filter((i) => i.code === code).length);
lines.push(`| **總計** | ${grand.join(' | ')} | **${issues.length}** |`);
lines.push('');

// 明細
lines.push('## 明細');
lines.push('');
if (issues.length === 0) {
  lines.push('（無紅旗 — 所有上線 L2 通過自動初篩。）');
} else {
  for (const id of suttas) {
    const list = issues.filter((i) => i.sutta === id);
    if (!list.length) continue;
    lines.push(`### ${id}（${list.length}）`);
    lines.push('');
    for (const it of list) {
      lines.push(`- \`${it.code}\` @ ${it.where} — ${it.detail}`);
    }
    lines.push('');
  }
}

const report = lines.join('\n') + '\n';
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, report);
process.stdout.write(report);
process.stderr.write(`\n✓ 掃描報告已寫入 ${path.relative(ROOT, OUT)}（${issues.length} 紅旗）\n`);
process.exit(0);
