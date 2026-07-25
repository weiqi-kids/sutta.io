// data.ts — 讀 build 產物 data/（交接面；BUILD_SPEC §0）。
// 於 build 期（SSG）以 node:fs 讀取，型別共用 @tipitaka/contracts（零漂移）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  SuttaFixture,
  Segment,
  Passage,
  SuttaCrossRefs,
} from '@tipitaka/contracts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// site/src/lib → repo 根 data/
export const DATA_DIR = path.resolve(__dirname, '../../../data');
const FIXTURES_DIR = path.resolve(__dirname, '../../../fixtures');
const CONTENT_DIR = path.resolve(__dirname, '../../../content');

function readJsonIfExists<T>(file: string): T | null {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return null;
  }
}

/** 讀單部經預建 JSON。data/ 優先，退回 fixtures/（邊界 fixture mn1）。 */
// build 期跨數千字典頁會重複讀同幾部經，memoize 避免每頁重讀/重解析大 JSON。
const _suttaCache = new Map<string, SuttaFixture | null>();
export function getSutta(id: string): SuttaFixture | null {
  if (_suttaCache.has(id)) return _suttaCache.get(id)!;
  const s =
    readJsonIfExists<SuttaFixture>(path.join(DATA_DIR, `${id}.json`)) ??
    readJsonIfExists<SuttaFixture>(path.join(FIXTURES_DIR, `${id}.json`));
  _suttaCache.set(id, s);
  return s;
}

export interface OccurrencePassage {
  seg: string;
  sutta: string;
  pali: string;
  zh: string;
  title_zh: string;
}

/** 字典漏斗：把出處（{seg,sutta}）解析成「詞活在經文裡」的段落（Pali＋已校稿白話），供字典頁把查詞導向閱讀。
 *  只收 Pali 可組且白話 approved 的段；同段去重；最多 limit 筆。全部出處都源自本地語料，故必解析得到。 */
export function resolveOccurrencePassages(
  occurrences: { seg: string; sutta: string }[],
  limit = 3,
): OccurrencePassage[] {
  const out: OccurrencePassage[] = [];
  const seen = new Set<string>();
  for (const o of occurrences) {
    if (out.length >= limit) break;
    if (seen.has(o.seg)) continue;
    seen.add(o.seg);
    const s = getSutta(o.sutta);
    const seg = s?.segments.find((x) => x.segment_id === o.seg);
    const vg = seg?.vernacular_gloss;
    if (!s || !seg || !vg || vg.review_status !== 'approved' || !vg.content) continue;
    const pali = seg.pali_tokens.map((tk) => tk.surface).join(' ').trim();
    if (!pali) continue;
    out.push({ seg: o.seg, sutta: o.sutta, pali, zh: vg.content, title_zh: s.sutta.title_zh });
  }
  return out;
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
      // 排除索引/嵌入/manifest/目錄/字典/片段等非經檔
      if (/^index-|^embeddings|^manifest|^browse$|^suttas$|^lexicon$|^snippets$|^surface-lemmas$|^entities$/.test(base)) continue;
      ids.add(base);
    }
  }
  const entries: BrowseEntry[] = [];
  for (const id of ids) {
    const s = getSutta(id);
    if (!s || !s.sutta || !Array.isArray(s.segments) || !Array.isArray(s.passages)) continue;
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
  // 先比集（mn < sn），再逐段比數字（sn56.11：56 → 11），避免含點 id 的位數碰撞
  const pa = a.match(/^([a-z]+)([\d.]+)$/);
  const pb = b.match(/^([a-z]+)([\d.]+)$/);
  if (pa && pb) {
    if (pa[1] !== pb[1]) return pa[1].localeCompare(pb[1]);
    const na = pa[2].split('.').map(Number);
    const nb = pb[2].split('.').map(Number);
    for (let i = 0; i < Math.max(na.length, nb.length); i++) {
      const d = (na[i] ?? 0) - (nb[i] ?? 0);
      if (d !== 0) return d;
    }
    return 0;
  }
  return a.localeCompare(b);
}

export function isPreviewSutta(s: SuttaFixture): boolean {
  return suttaIsPreview(s);
}

// ---- SEO 標題（概念詞導向；docs/04-engineering/SEO_KEYWORDS.md） ----
interface SuttaSeoMap {
  [id: string]: { zh?: string; en?: string };
}
let seoMapCache: SuttaSeoMap | null | undefined;
function suttaSeoMap(): SuttaSeoMap {
  if (seoMapCache === undefined) {
    seoMapCache = readJsonIfExists<SuttaSeoMap>(path.join(CONTENT_DIR, 'seo', 'sutta-seo.json'));
  }
  return seoMapCache ?? {};
}
/** 研經頁 SEO 標題：覆蓋表優先，否則通用模板（帶「白話對照」概念詞）。 */
export function suttaSeoTitle(s: SuttaFixture, locale: 'zh' | 'en'): string {
  const entry = suttaSeoMap()[s.sutta.id];
  const override = entry?.[locale];
  if (override) return override;
  // 經號標籤依 id 推導（mn10 → MN 10 / 中部10；sn56.11 → SN 56.11 / 相應部56.11）
  const n = s.sutta.id.replace(/^[a-z]+/, '');
  const abbr = s.sutta.id.replace(/[\d.].*$/, '').toUpperCase();
  const coll = s.sutta.collection_zh ?? '中部';
  return locale === 'en'
    ? `${s.sutta.title_pali} (${abbr} ${n}) — Pāli with word-by-word analysis`
    : `${s.sutta.title_zh}（${coll}${n}）白話對照`;
}

/** 阿含對照 ref（如「中阿含98 念處經」）；無對照回 null。供中阿含索引頁。 */
export function agamaRefOf(s: SuttaFixture): string | null {
  const p = s.passages.find((x) => x.agama != null);
  if (!p?.agama?.ref) return null;
  // ref 形如 "T01n0026 中阿含98 念處經" → 去掉大正藏冊號前綴
  return p.agama.ref.replace(/^T\d+n\d+\s*/, '');
}

/** 白話覆蓋是否達「真完整」（同 scripts/run-all-progress.mjs 判準）。 */
export function suttaIsComplete(s: SuttaFixture): boolean {
  const m = s.segments.filter((seg) => (seg.pali_tokens || []).some((t) => (t as { dpd_id?: unknown; lemma?: string }).dpd_id != null || (t as { lemma?: string }).lemma));
  const have = m.filter((seg) => seg.vernacular_gloss).length;
  return !!s.summary && m.length > 0 && have / m.length >= 0.98;
}

// ---- 主題研經頁（topics；SEO_KEYWORDS 概念頁系統） ----
// 內容：content/topics/<slug>.json。解說屬 L2（AI 生成、掛標示）；引文由 segment_id
// 於 build 期自 data/ 解析（引文不存副本 → 保證 grounded、不漂移；查無 segment 即 build 失敗）。
export interface TopicQuoteRef {
  sutta: string;
  segment_ids: string[];
  /** 引文導言（可選，L2） */
  lead?: string;
}
export interface TopicSection {
  heading: string;
  paragraphs: string[];
  quotes?: TopicQuoteRef[];
}
export interface TopicLocale {
  title: string;
  seo_title: string;
  seo_description: string;
  question: string;
  definition: string;
  sections: TopicSection[];
  mahayana_note?: string;
  faq: { q: string; a: string }[];
  related_topics?: string[];
  related_suttas?: string[];
  related_lexicon?: string[];
  /** 站外延伸資源（非正典、非 L1/L2，人工挑選的實修輔助工具；刻意獨立於「繼續研讀」的站內導覽） */
  external_resources?: { label: string; url: string; desc: string }[];
}
export interface TopicData {
  slug: string;
  review_status: 'draft' | 'approved';
  generated_by: string;
  date: string;
  zh: TopicLocale;
  en: TopicLocale;
}
const TOPICS_DIR = path.join(CONTENT_DIR, 'topics');
export function listTopics(): TopicData[] {
  if (!fs.existsSync(TOPICS_DIR)) return [];
  const out: TopicData[] = [];
  for (const f of fs.readdirSync(TOPICS_DIR).sort()) {
    if (!f.endsWith('.json')) continue;
    const t = readJsonIfExists<TopicData>(path.join(TOPICS_DIR, f));
    if (t && t.slug && t.zh && t.en) out.push(t);
  }
  return out;
}
export function getTopic(slug: string): TopicData | null {
  return listTopics().find((t) => t.slug === slug) ?? null;
}

export interface TopicBackLink {
  slug: string;
  title: string;
  question: string;
}
/**
 * 反向索引：一部經 → 引用/相關它的主題頁清單（修概念↔經文單向斷鏈）。
 * 來源＝各 topic 的 related_suttas ∪ 各 section 引文的 quote.sutta（build 期反轉）。
 */
export function getTopicsForSutta(suttaId: string, locale: 'zh' | 'en' = 'zh'): TopicBackLink[] {
  const out: TopicBackLink[] = [];
  for (const t of listTopics()) {
    const L = t[locale];
    const refs = new Set<string>([
      ...(L.related_suttas ?? []),
      ...L.sections.flatMap((sec) => (sec.quotes ?? []).map((q) => q.sutta)),
    ]);
    if (refs.has(suttaId)) {
      out.push({ slug: t.slug, title: L.title, question: L.question });
    }
  }
  return out;
}
export interface ResolvedQuoteSegment {
  segment_id: string;
  pali: string;
  vernacular: string | null;
}
export interface ResolvedQuote {
  sutta: string;
  sutta_title_zh: string;
  sutta_title_pali: string;
  href_fragment: string;
  lead?: string;
  segments: ResolvedQuoteSegment[];
}
/** 解析主題頁引文：segment_id → 巴利（token surfaces 重組）＋白話。查無 segment 直接 throw（防捏造）。 */
export function resolveTopicQuote(ref: TopicQuoteRef): ResolvedQuote {
  const s = getSutta(ref.sutta);
  if (!s) throw new Error(`topics 引文指向不存在的經：${ref.sutta}`);
  const segments: ResolvedQuoteSegment[] = ref.segment_ids.map((sid) => {
    const seg = s.segments.find((x) => x.segment_id === sid);
    if (!seg) throw new Error(`topics 引文指向不存在的段：${ref.sutta} ${sid}`);
    const pali = (seg.pali_tokens || []).map((tk) => tk.surface).join(' ');
    return {
      segment_id: sid,
      pali,
      vernacular: seg.vernacular_gloss?.content ?? null,
    };
  });
  return {
    sutta: ref.sutta,
    sutta_title_zh: s.sutta.title_zh,
    sutta_title_pali: s.sutta.title_pali,
    href_fragment: `#${ref.segment_ids[0]}`,
    lead: ref.lead,
    segments,
  };
}

// ---- 跨經連結（build-xrefs.mjs 產物 data/xrefs.json；研經頁段落註 + 相關經文區塊） ----
let _xrefsCache: Record<string, SuttaCrossRefs> | null | undefined;
function allCrossRefs(): Record<string, SuttaCrossRefs> {
  if (_xrefsCache === undefined) {
    _xrefsCache = readJsonIfExists<Record<string, SuttaCrossRefs>>(path.join(DATA_DIR, 'xrefs.json'));
  }
  return _xrefsCache ?? {};
}
/** 單經跨經連結（無則 pericopes/parallels 皆空陣列）。 */
export function getCrossRefs(id: string): SuttaCrossRefs {
  return allCrossRefs()[id] ?? { pericopes: [], parallels: [] };
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

export interface SuttaContextData {
  sutta_id: string;
  setting_place?: string;
  audience?: string;
  occasion?: string;
  derived_from: string[];
}
/** CONTEXT A 此經緣起（L1，authored 於 content/context/）。 */
export function getSuttaContext(id: string): SuttaContextData | null {
  return readJsonIfExists<SuttaContextData>(path.join(CONTENT_DIR, 'context', `${id}.json`));
}

export interface EntityLink {
  key: string;
  name_pali: string;
  name_zh?: string;
}
/** 此經出現的人地事專名（DPPN；CONTEXT B）。讀 content/entities/{sutta}.json。 */
export function getEntitiesForSutta(id: string): EntityLink[] {
  const e = readJsonIfExists<{ entities: EntityLink[] }>(path.join(CONTENT_DIR, 'entities', `${id}.json`));
  return e?.entities ?? [];
}

import type { EntityRef } from '@tipitaka/contracts';
function allEntities(): Record<string, EntityRef> {
  // DPPN 擷取產物（pipeline buildEntities → data/entities.json）
  const e = readJsonIfExists<Record<string, EntityRef>>(path.join(DATA_DIR, 'entities.json')) ?? {};
  const out: Record<string, EntityRef> = {};
  for (const [k, v] of Object.entries(e)) if (v && (v as EntityRef).entity_id) out[k] = v as EntityRef;
  return out;
}
export function getEntity(key: string): EntityRef | null {
  return allEntities()[key] ?? null;
}
export function getAllEntityKeys(): string[] {
  return Object.keys(allEntities());
}

export interface LexiconEntry {
  lemma: string;
  root: string | null;
  gloss: string | null;
  morph_samples: string[];
  forms: string[];
  occurrences: { seg: string; sutta: string }[];
}
export function getLexicon(): Record<string, LexiconEntry> {
  return readJsonIfExists<Record<string, LexiconEntry>>(path.join(DATA_DIR, 'lexicon.json')) ?? {};
}

// 主題 → 已驗證的 Wikidata/維基百科實體連結（GEO：供 schema.org sameAs 讓答案引擎正確錨定實體）。
let _entityLinksCache: Record<string, { wikidata?: string; wp_zh?: string; wp_en?: string } | null> | null = null;
export function getEntityLinkUrls(slug: string): string[] {
  if (!_entityLinksCache) {
    _entityLinksCache = readJsonIfExists<Record<string, { wikidata?: string; wp_zh?: string; wp_en?: string } | null>>(
      path.join(CONTENT_DIR, 'seo/entity-links.json'),
    ) ?? {};
  }
  const e = _entityLinksCache[slug];
  return e ? [e.wikidata, e.wp_zh, e.wp_en].filter((u): u is string => Boolean(u)) : [];
}

// 巴利詞的精簡中文詞義（L2，由 DPD 英文 gloss 直譯／專名/詞彙表/L2用法彙整）。中文站用它取代英文 gloss 當「詞義」。
let _zhGlossCache: Record<string, string> | null = null;
export function getZhGloss(key: string): string {
  if (!_zhGlossCache) {
    _zhGlossCache = readJsonIfExists<Record<string, string>>(path.join(DATA_DIR, 'lexicon-zh-gloss.json')) ?? {};
  }
  return _zhGlossCache[key] ?? '';
}

export interface UsageData {
  generated_by: string;
  review_status: string;
  summary: string;
  senses: { gloss: string; segment_ids: string[] }[];
  grounded_on: string[];
}
let _usageCache: Record<string, UsageData> | null = null;
function allUsage(): Record<string, UsageData> {
  if (!_usageCache) {
    _usageCache = readJsonIfExists<Record<string, UsageData>>(path.join(DATA_DIR, 'usage.json')) ?? {};
  }
  return _usageCache;
}
/** T4 用法摘要（L2）。僅高頻/要詞有；其餘 null。 */
export function getUsage(key: string): UsageData | null {
  const u = allUsage()[key];
  return u && u.review_status === 'approved' ? u : null;
}
/** 有已校稿用法摘要的詞鍵（供 /llms-full.txt 匯出辭典正文）。 */
export function getAllUsageKeys(): string[] {
  return Object.entries(allUsage())
    .filter(([, u]) => u?.review_status === 'approved')
    .map(([k]) => k);
}
export interface CuratedData {
  questions: {
    q: string;
    ranked: { segment_id: string; reason_zh: string }[];
    review_status: string;
    generated_by: string;
  }[];
}
export function getCurated(id: string): CuratedData | null {
  return readJsonIfExists<CuratedData>(path.join(DATA_DIR, 'curated', `${id}.json`));
}
/** 所有經的策展問題（搜尋頁顯示）。 */
export function getAllCurated(): { sutta: string; data: CuratedData }[] {
  const out: { sutta: string; data: CuratedData }[] = [];
  for (const s of listSuttas()) {
    const c = getCurated(s.id);
    if (c && c.questions.length) out.push({ sutta: s.id, data: c });
  }
  return out;
}
