// 金句卡渲染器：1200×630 暖色骨底＋赭邊，Noto Serif CJK TC。
// 分享到 LINE/FB/Threads 的 og:image。卡上文字一律由呼叫端給「逐字取自頁面的原句」，本模組不生成內容。
// 字型走系統字（本機 build 產出後 commit PNG，CI 不渲染，故不依賴 CI 字型）。
import { Resvg } from '@resvg/resvg-js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// CJK 依可用寬度／字級估每行字數（全形字寬≈字級）。回傳最多 maxLines 行，超出末行以「…」收。
function wrapCJK(text, fontSize, maxWidth, maxLines) {
  const per = Math.max(6, Math.floor(maxWidth / fontSize));
  const chars = [...text];
  const lines = [];
  let cur = '';
  for (const ch of chars) {
    cur += ch;
    if ([...cur].length >= per) { lines.push(cur); cur = ''; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = [...kept[maxLines - 1]].slice(0, per - 1).join('') + '…';
    return kept;
  }
  return lines;
}

// 色盤＝design-tokens 的鏡像（canvas 讀不到 CSS 變數，只能內嵌 hex）。單一來源在 design/design-tokens.css，
// 改 token 時同步這裡：paper≈--paper、ink≈--ink、bar(warm)≈--thread、bar(cool)≈--prov-scholarly、rule≈--rule、soft≈--ink-soft。
const PALETTE = {
  // 暖＝正典（研經頁）；沿用 design-tokens 骨色系
  warm: { paper: '#E9E0CC', bar: '#B06A1F', ink: '#2A2622', soft: '#6B6358', rule: '#D8CFB9' },
  // 冷＝概念/主題（AI 信任層色溫略偏冷，但仍以可讀暖底為主，僅邊條轉靛）
  cool: { paper: '#E9E0CC', bar: '#3F6E78', ink: '#2A2622', soft: '#6B6358', rule: '#D8CFB9' },
};

/**
 * @param {{ kicker: string, quote: string, source: string, tone?: 'warm'|'cool' }} o
 * @returns {Buffer} PNG
 */
export function renderQuoteCard({ kicker, quote, source, tone = 'warm' }) {
  const W = 1200, H = 630;
  const c = PALETTE[tone] ?? PALETTE.warm;
  const x = 96;
  // 依句子長度自適應字級（短句放大、長句縮小），維持三～四行內
  const len = [...quote].length;
  const qSize = len <= 22 ? 76 : len <= 40 ? 64 : 54;
  const maxW = W - x - 96;
  const lines = wrapCJK(quote, qSize, maxW, 4);
  const lh = qSize * 1.42;
  const blockH = lines.length * lh;
  const startY = (H - blockH) / 2 + qSize * 0.36 + 24;
  const quoteSvg = lines.map((ln, i) =>
    `<text x="${x}" y="${startY + i * lh}" font-family="Noto Serif CJK TC" font-size="${qSize}" font-weight="700" fill="${c.ink}">${esc(ln)}</text>`
  ).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${c.paper}"/>
    <rect x="0" y="0" width="14" height="${H}" fill="${c.bar}"/>
    <text x="${x}" y="98" font-family="Noto Sans CJK TC" font-size="30" letter-spacing="6" fill="${c.bar}">${esc(kicker)}</text>
    ${quoteSvg}
    <line x1="${x}" y1="${H - 94}" x2="${x + 300}" y2="${H - 94}" stroke="${c.rule}" stroke-width="2"/>
    <text x="${x}" y="${H - 48}" font-family="Noto Sans CJK TC" font-size="28" fill="${c.soft}">${esc(source)}　·　sutta.io</text>
  </svg>`;
  return Buffer.from(
    new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: true } }).render().asPng()
  );
}
