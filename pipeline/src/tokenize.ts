// tokenize.ts — P2 斷詞（巴利分詞）
// V1：空白 + 引號切分，去前後標點；surface 保留原字形（含 ṁ 與大小寫）供顯示。
// sandhi/複合詞之深切分（B-12）由 DPD deconstructor 在 join 階段補；此處不臆測切分。

const QUOTE_SPLIT = /[“”‘’"«»—–]+/g;
const EDGE_PUNCT = /^[.,;:?!…()\[\]{}\-'’]+|[.,;:?!…()\[\]{}\-'’]+$/g;

export function tokenizeSegment(text: string): string[] {
  return text
    .replace(QUOTE_SPLIT, ' ')
    .split(/\s+/)
    .map((w) => w.replace(EDGE_PUNCT, ''))
    .filter((w) => w.length > 0);
}
