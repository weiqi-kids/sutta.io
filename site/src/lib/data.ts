// data.ts — 讀 build 產物 data/（交接面；BUILD_SPEC §0）。
// 於 build 期（SSG）以 node:fs 讀取，型別共用 @tipitaka/contracts（零漂移）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  SuttaFixture,
  Segment,
  Passage,
} from '@tipitaka/contracts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// site/src/lib → repo 根 data/
export const DATA_DIR = path.resolve(__dirname, '../../../data');
const FIXTURES_DIR = path.resolve(__dirname, '../../../fixtures');

function readJsonIfExists<T>(file: string): T | null {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return null;
  }
}

/** 讀單部經預建 JSON。data/ 優先，退回 fixtures/（邊界 fixture mn1）。 */
export function getSutta(id: string): SuttaFixture | null {
  return (
    readJsonIfExists<SuttaFixture>(path.join(DATA_DIR, `${id}.json`)) ??
    readJsonIfExists<SuttaFixture>(path.join(FIXTURES_DIR, `${id}.json`))
  );
}

export interface BrowseEntry {
  id: string;
  title_pali: string;
  title_zh: string;
  collection: string;
  collection_zh?: string;
  hasParallel: boolean;
  reviewed: boolean;
  isPreview: boolean;
}

const PREVIEW_SOURCES = new Set(['mock', 'fixture', 'PLACEHOLDER']);

function suttaIsPreview(s: SuttaFixture): boolean {
  // 任一 L2 由 mock 生成，或 manifest 標 placeholder → 視為原型資料。
  if (s.manifest && Object.values(s.manifest).some((v) => v === 'PLACEHOLDER' || v === 'fixture')) {
    return true;
  }
  const gens = [
    s.summary?.generated_by,
    ...s.study_cards.map((c) => c.generated_by),
    ...s.segments.map((seg) => seg.vernacular_gloss?.generated_by),
  ].filter(Boolean) as string[];
  return gens.some((g) => PREVIEW_SOURCES.has(g));
}

function suttaReviewed(s: SuttaFixture): boolean {
  const statuses = [
    s.summary?.review_status,
    ...s.study_cards.map((c) => c.review_status),
    ...s.segments.map((seg) => seg.vernacular_gloss?.review_status),
  ].filter(Boolean) as string[];
  return statuses.length > 0 && statuses.every((st) => st === 'approved');
}

function suttaHasParallel(s: SuttaFixture): boolean {
  return s.passages.some((p) => p.agama != null);
}

/** 列出所有可瀏覽的經（掃 data/，退回 fixtures 的 mn1）。供目錄頁。 */
export function listSuttas(): BrowseEntry[] {
  const ids = new Set<string>();
  for (const dir of [DATA_DIR, FIXTURES_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      const base = f.replace(/\.json$/, '');
      // 排除索引/嵌入/manifest/目錄等非經檔
      if (/^index-|^embeddings|^manifest|^browse$|^suttas$/.test(base)) continue;
      ids.add(base);
    }
  }
  const entries: BrowseEntry[] = [];
  for (const id of ids) {
    const s = getSutta(id);
    if (!s || !s.sutta) continue;
    entries.push({
      id: s.sutta.id,
      title_pali: s.sutta.title_pali,
      title_zh: s.sutta.title_zh,
      collection: s.sutta.collection,
      collection_zh: s.sutta.collection_zh,
      hasParallel: suttaHasParallel(s),
      reviewed: suttaReviewed(s),
      isPreview: suttaIsPreview(s),
    });
  }
  // 依經號排序（mn1, mn2, mn10 自然序）
  entries.sort((a, b) => collator(a.id, b.id));
  return entries;
}

function collator(a: string, b: string): number {
  const na = parseInt(a.replace(/\D/g, ''), 10);
  const nb = parseInt(b.replace(/\D/g, ''), 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b);
}

export function isPreviewSutta(s: SuttaFixture): boolean {
  return suttaIsPreview(s);
}

/** 衍生：segment_id → 它所屬的 passage（阿含對照掛在 passage）。 */
export function passageForSegment(s: SuttaFixture, segmentId: string): Passage | null {
  return s.passages.find((p) => p.segment_ids.includes(segmentId)) ?? null;
}

export function getSegment(s: SuttaFixture, segmentId: string): Segment | null {
  return s.segments.find((seg) => seg.segment_id === segmentId) ?? null;
}

// ---- 索引 / 嵌入（DATA_PIPELINE §6 格式即契約；搜尋頁用） ----
export function getFulltextIndex(): unknown | null {
  return readJsonIfExists(path.join(DATA_DIR, 'index-fulltext.json'));
}
export function getLemmaIndex(): unknown | null {
  return readJsonIfExists(path.join(DATA_DIR, 'index-lemma.json'));
}
export function getSurfaceIndex(): unknown | null {
  return readJsonIfExists(path.join(DATA_DIR, 'index-surface.json'));
}
export function getManifest(): Record<string, string> | null {
  return readJsonIfExists(path.join(DATA_DIR, 'manifest.json'));
}
export function getCurated(id: string): unknown | null {
  return readJsonIfExists(path.join(DATA_DIR, 'curated', `${id}.json`));
}
