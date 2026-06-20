// fetch.ts — P1 擷取巴利經文分段（SuttaCentral bilara-data）
import { bilaraRootUrl } from './config.ts';
import { fetchCached } from './util.ts';

export interface RawSegment {
  segment_id: string;
  text: string;
}

/** 抓 bilara root Pali，回傳內容 segment（過濾標題/metadata 段 :0.*）。 */
export async function fetchSegments(suttaId: string): Promise<RawSegment[]> {
  const json = await fetchCached(bilaraRootUrl(suttaId), `bilara-${suttaId}.json`);
  const obj = JSON.parse(json) as Record<string, string>;
  const segments: RawSegment[] = [];
  for (const [segment_id, text] of Object.entries(obj)) {
    // 段號形如 mn10:1.1；:0.x 為集名/經名標題，非內文
    const after = segment_id.split(':')[1] ?? '';
    if (/^0\./.test(after)) continue;
    const t = text.trim();
    if (!t) continue;
    segments.push({ segment_id, text: t });
  }
  return segments;
}

/** 取經名標題段（:0.2 通常為巴利經名）。 */
export async function fetchTitle(suttaId: string): Promise<string | null> {
  const json = await fetchCached(bilaraRootUrl(suttaId), `bilara-${suttaId}.json`);
  const obj = JSON.parse(json) as Record<string, string>;
  return obj[`${suttaId}:0.2`]?.trim() ?? null;
}
