// glossary.ts — F-2 教義術語對照表載入與 prompt 注入。
// 規範全站 L2（T1/T2/T3）核心教義詞中譯一致；僅規範譯名，不改 grounding 鐵則。
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const GLOSSARY_PATH = path.join(ROOT, 'content', 'glossary.json');

export interface GlossaryTerm {
  pali: string;
  zh: string;
  note?: string;
}

let _cache: GlossaryTerm[] | null = null;

export function loadGlossary(): GlossaryTerm[] {
  if (_cache) return _cache;
  if (!fs.existsSync(GLOSSARY_PATH)) {
    _cache = [];
    return _cache;
  }
  const raw = JSON.parse(fs.readFileSync(GLOSSARY_PATH, 'utf-8')) as { terms?: GlossaryTerm[] };
  _cache = raw.terms ?? [];
  return _cache;
}

// 渲染為精簡對照區塊，附於 system prompt 末尾。
// 為節省 token 僅列 pali=zh（note 省略，note 主要供人工維護）。
export function glossaryBlock(): string {
  const terms = loadGlossary();
  if (terms.length === 0) return '';
  const pairs = terms.map((t) => `${t.pali}=${t.zh}`).join('；');
  return `\n\n【教義術語對照（須一致採用）】下列核心教義詞若於該段實際出現且語境相符，中譯須採用對照表譯名以維持全站一致；同形異義（格位/語境不符）時依該段 morph/語境另譯。本表只規範譯名，不改變「只依提供資料、缺依據降級不硬生、不裁決教義」之鐵則。\n${pairs}`;
}
