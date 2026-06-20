// util.ts — 共用工具：抓取/快取、巴利正規化、變音與繁簡折疊
import fs from 'node:fs';
import path from 'node:path';
import { CACHE_DIR } from './config.ts';

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeJson(file: string, data: unknown) {
  ensureDir(path.dirname(file));
  // 穩定序列化（鍵序固定）以利可重現（§5）
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}

/** 抓 URL（帶本機快取，避免重複下載、利可重現）。 */
export async function fetchCached(url: string, cacheKey: string): Promise<string> {
  ensureDir(CACHE_DIR);
  const cacheFile = path.join(CACHE_DIR, cacheKey);
  if (fs.existsSync(cacheFile)) return fs.readFileSync(cacheFile, 'utf-8');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch 失敗 ${res.status}: ${url}`);
  const text = await res.text();
  fs.writeFileSync(cacheFile, text);
  return text;
}

// --- 巴利正規化 ---

/**
 * niggahita 正規化：SuttaCentral bilara 用 ṁ（U+1E41 dot above），
 * DPD lookup_key 用 ṃ（U+1E43 dot below）。lookup 前須統一為 dot below。
 */
export function toDpdNiggahita(s: string): string {
  return s.replace(/ṁ/g, 'ṃ'); // ṁ → ṃ
}

/** DPD lookup 鍵：小寫 + niggahita 統一 + 去前後標點/引號。 */
export function dpdLookupKey(surface: string): string {
  let s = surface.trim();
  // 去前後引號與標點（巴利字內部不含這些）
  s = s.replace(/^[“”‘’"'(){}\[\]«»–—\-.,;:?!…]+/, '');
  s = s.replace(/[“”‘’"'(){}\[\]«»–—\-.,;:?!…]+$/, '');
  return toDpdNiggahita(s.toLowerCase());
}

/**
 * 變音折疊（搜尋索引用）：去 IAST 變音符號 → ASCII 近似。
 * ā→a ī→i ū→u ṃ/ṁ→m ṅ→n ñ→n ṭ→t ḍ→d ṇ→n ḷ→l ṛ→r ...
 */
const DIACRITIC_MAP: Record<string, string> = {
  ā: 'a', ī: 'i', ū: 'u', ṛ: 'r', ṝ: 'r', ḷ: 'l', ḹ: 'l',
  ṃ: 'm', 'ṁ': 'm', ṅ: 'n', ñ: 'n', ṇ: 'n', ṭ: 't', ḍ: 'd',
  ś: 's', ṣ: 's', ḥ: 'h', ṁ: 'm',
};
export function foldDiacritics(s: string): string {
  return s
    .toLowerCase()
    .split('')
    .map((c) => DIACRITIC_MAP[c] ?? c)
    .join('');
}

/** 移除標點，回傳折疊後可索引的純字串。 */
export function normalizeForIndex(s: string): string {
  return foldDiacritics(s).replace(/[“”‘’"'(){}\[\]«»–—\-.,;:?!…。、，；：？！「」『』（）]/g, ' ');
}
