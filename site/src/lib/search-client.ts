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
