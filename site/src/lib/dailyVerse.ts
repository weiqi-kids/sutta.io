// dailyVerse.ts — 「今日一句」選句與解析（build 期 SSG）。
// 治理鐵則：池檔 content/daily/verses.json 只存 segment_id + kicker，
// Pali 原文與白話一律在此由 data/<sutta>.json 的 segment 解析——不手打、不改寫，
// 沿用主題頁「segment_id build 期解析防捏造」原則。任何無法解析或未 approved 的條目直接略過。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSutta } from './data';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POOL_FILE = path.resolve(__dirname, '../../../content/daily/verses.json');

interface PoolEntry {
  segment_id: string;
  sutta: string;
  kicker: string;
}

export interface DailyVerse {
  segment_id: string;
  sutta: string;
  kicker: string;
  pali: string;
  zh: string;
  title_zh: string;
  title_pali: string;
  collection_zh: string;
  /** 出處連結（base 相對，呼叫端補 BASE_URL）：深連到該經該段 */
  href: string;
  /** OG 金句卡檔名 slug（segment_id → 檔名安全） */
  slug: string;
  index: number;
}

/** segment_id → 檔名安全 slug（mn10:2.1 → mn10-2-1） */
export function verseSlug(segmentId: string): string {
  return segmentId.replace(/[:.]/g, '-');
}

function loadPool(): PoolEntry[] {
  try {
    if (!fs.existsSync(POOL_FILE)) return [];
    const raw = JSON.parse(fs.readFileSync(POOL_FILE, 'utf-8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/** 解析單一池條目為完整金句；資料缺失或未 approved 回 null（呼叫端過濾）。 */
function resolve(entry: PoolEntry, index: number): DailyVerse | null {
  const s = getSutta(entry.sutta);
  if (!s) return null;
  const seg = s.segments.find((x) => x.segment_id === entry.segment_id);
  const vg = seg?.vernacular_gloss;
  // 白話必須存在且已校稿——防止把未定稿內容推上每日曝光位
  if (!seg || !vg || vg.review_status !== 'approved' || !vg.content) return null;
  const pali = seg.pali_tokens.map((tok) => tok.surface).join(' ').trim();
  if (!pali) return null;
  return {
    segment_id: entry.segment_id,
    sutta: entry.sutta,
    kicker: entry.kicker,
    pali,
    zh: vg.content,
    title_zh: s.sutta.title_zh,
    title_pali: s.sutta.title_pali,
    collection_zh: s.sutta.collection_zh ?? s.sutta.collection,
    href: `/read/${entry.sutta}/#${entry.segment_id}`,
    slug: verseSlug(entry.segment_id),
    index,
  };
}

/** 池中全部可用金句（依池順序，已過濾解析失敗者）。供 archive 列表與 OG 卡生成。 */
export function allVerses(): DailyVerse[] {
  return loadPool()
    .map((e, i) => resolve(e, i))
    .filter((v): v is DailyVerse => v !== null);
}

/** 台北時區（UTC+8）的年積日——決定性、跨日換句、不依賴 build 主機時區。 */
function dayOfYearTaipei(date: Date): number {
  const tpe = new Date(date.getTime() + 8 * 3600 * 1000);
  const start = Date.UTC(tpe.getUTCFullYear(), 0, 0);
  const now = Date.UTC(tpe.getUTCFullYear(), tpe.getUTCMonth(), tpe.getUTCDate());
  return Math.floor((now - start) / 86400000);
}

/** 指定日期的當日金句（決定性：全站同一則、跨日輪替）。池為空回 null。 */
export function verseForDate(date: Date, verses?: DailyVerse[]): DailyVerse | null {
  const pool = verses ?? allVerses();
  if (pool.length === 0) return null;
  const idx = dayOfYearTaipei(date) % pool.length;
  return pool[idx];
}

/** 今日金句（以現在時刻，台北時區判定）。 */
export function todaysVerse(): DailyVerse | null {
  return verseForDate(new Date());
}
