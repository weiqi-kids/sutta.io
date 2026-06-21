// search-client.ts — 客端搜尋工具（變音折疊、繁簡折疊、索引型別）。
// 與 pipeline 的折疊一致（variant 命中原形；SEARCH §2）。
import * as OpenCC from 'opencc-js';

const DIACRITIC_MAP: Record<string, string> = {
  ā: 'a', ī: 'i', ū: 'u', ṛ: 'r', ṝ: 'r', ḷ: 'l', ḹ: 'l',
  ṃ: 'm', ṁ: 'm', ṅ: 'n', ñ: 'n', ṇ: 'n', ṭ: 't', ḍ: 'd',
  ś: 's', ṣ: 's', ḥ: 'h',
};
export function foldDiacritics(s: string): string {
  return s.toLowerCase().split('').map((c) => DIACRITIC_MAP[c] ?? c).join('');
}

/**
 * Velthuis 轉寫輸入 → 折疊鍵（SEARCH §2）。
 * 使用者打 `samaadhi`/`sama.m`/`~naa.na` 等 → 正規化後與折疊索引比對。
 * 因索引鍵為去變音 ASCII，這裡直接把 Velthuis 序列折成對應 ASCII。
 */
const VELTHUIS: [RegExp, string][] = [
  [/aa/g, 'a'], [/ii/g, 'i'], [/uu/g, 'u'],
  [/\.m/g, 'm'], [/\.n/g, 'n'], [/"n/g, 'n'], [/;n/g, 'n'], [/~n/g, 'n'],
  [/\.t/g, 't'], [/\.d/g, 'd'], [/\.l/g, 'l'], [/\.r/g, 'r'],
  [/"s/g, 's'], [/\.s/g, 's'], [/\.h/g, 'h'],
];
export function normalizePaliQuery(s: string): string {
  let q = foldDiacritics(s); // 先處理真正的變音字 + 小寫
  for (const [re, rep] of VELTHUIS) q = q.replace(re, rep);
  return q;
}

// 簡體 → 繁體（查詢端折疊；輸入簡體命中繁體經文，SEARCH §2）
const s2t = OpenCC.Converter({ from: 'cn', to: 'tw' });
export function toTraditional(s: string): string {
  try {
    return s2t(s);
  } catch {
    return s;
  }
}

export function chineseBigrams(text: string): string[] {
  const clean = text.replace(/[\s　0-9A-Za-z，。、；：？！「」『』（）()…—-]/g, '');
  const out = new Set<string>();
  for (let i = 0; i < clean.length; i++) {
    out.add(clean[i]);
    if (i + 1 < clean.length) out.add(clean[i] + clean[i + 1]);
  }
  return [...out];
}

export interface FulltextIndex {
  model: string;
  postings: Record<string, { seg: string; lang: 'pi' | 'zh' }[]>;
}
export interface LemmaIndex {
  [folded: string]: { lemma: string; forms: string[]; occurrences: string[] };
}
export interface SurfaceIndex {
  [folded: string]: { seg: string; token: string }[];
}
export interface SuttaCatalog {
  id: string;
  title_pali: string;
  title_zh: string;
  collection: string;
  collection_zh?: string;
  hasParallel: boolean;
}
export interface EmbedMeta {
  model: string;
  dim: number;
  count: number;
  ids: string[];
  query_prefix: string;
}

export function suttaIdOf(segmentId: string): string {
  return segmentId.split(':')[0];
}
