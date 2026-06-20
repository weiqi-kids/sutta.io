// parallels.ts — P5 漢譯阿含對照（段落級，CBETA；A-1）
// 誠實邊界：阿含是「另一傳本」，與巴利僅段落級平行。真實 segment 級對齊需 SC 平行資料，
// 未具備前不假造細對齊 → V1 採「傳本級」單一 passage，標明另一傳本（中阿含），保留段落換行。
import type { Passage, AgamaParallel } from '@tipitaka/contracts';
import { fetchCached } from './util.ts';

interface ParallelSource {
  work: string; // CBETA 典籍號
  juan: number;
  titleMarker: string; // 經標題（界定起點）
  endMarker: string; // 「…竟」（界定終點）
  ref: string; // 顯示用定位
}

// 已確立的平行對照（學界共識）。V1 小集手動對照；之後可由 SuttaCentral parallels 自動化。
const PARALLEL_MAP: Record<string, ParallelSource> = {
  // MN10 Satipaṭṭhāna ↔ 中阿含98 念處經（T01n0026 卷24）
  mn10: {
    work: 'T0026',
    juan: 24,
    titleMarker: '因品念處經第二',
    endMarker: '念處經第二竟',
    ref: 'T01n0026 中阿含98 念處經',
  },
};

async function fetchCbetaJuan(work: string, juan: number): Promise<string> {
  const url = `https://api.cbetaonline.cn/juans?work=${work}&juan=${juan}`;
  const json = await fetchCached(url, `cbeta-${work}-${String(juan).padStart(3, '0')}.json`);
  const obj = JSON.parse(json) as { results: string[] };
  return obj.results?.[0] ?? '';
}

function extractSutta(html: string, src: ParallelSource): string | null {
  // 移除 CBETA 校註上標（noteAnchor），再去標籤
  const noNotes = html.replace(/<a[^>]*class="noteAnchor"[^>]*>.*?<\/a>/g, '');
  const text = noNotes.replace(/<[^>]+>/g, '');
  const titleIdx = text.indexOf(src.titleMarker);
  if (titleIdx < 0) return null;
  const bodyStart = titleIdx + src.titleMarker.length;
  const endIdx = text.indexOf(src.endMarker, bodyStart);
  let body = endIdx > bodyStart ? text.slice(bodyStart, endIdx) : text.slice(bodyStart);
  // 清 Taisho 頁/行碼殘留
  body = body.replace(/T\d+n\d+_p\d+\w*/g, '').replace(/\d+[abc]\d{1,2}/g, '');
  // 收斂空白，於段落標記前插換行以利閱讀
  body = body.replace(/[\s　]+/g, ' ').trim();
  body = body.replace(/\s*「/g, '\n\n「').replace(/。\s*復次/g, '。\n\n復次');
  return body.replace(/^\n+/, '').trim();
}

/** 取某經的阿含對照文字（無對照來源或抓取失敗 → null）。 */
export async function fetchAgama(suttaId: string): Promise<AgamaParallel | null> {
  const src = PARALLEL_MAP[suttaId];
  if (!src) return null;
  try {
    const html = await fetchCbetaJuan(src.work, src.juan);
    const text = extractSutta(html, src);
    if (!text) return null;
    return { source: 'CBETA', ref: src.ref, text };
  } catch {
    return null;
  }
}

/**
 * 組 passages。V1：有阿含 → 單一傳本級 passage 涵蓋全部 segment（誠實，不假造細對齊）；
 * 無阿含 → 仍以章節分組（整數段號），agama 一律 null（降級「此段無對應漢譯平行」）。
 */
export async function buildPassages(suttaId: string, segmentIds: string[]): Promise<Passage[]> {
  const agama = await fetchAgama(suttaId);
  if (agama) {
    return [{ passage_id: `${suttaId}:pa1`, segment_ids: segmentIds, agama }];
  }
  // 無對照：依章節（segment 號的整數部分）分組，agama null
  const groups = new Map<string, string[]>();
  for (const sid of segmentIds) {
    const after = sid.split(':')[1] ?? '';
    const section = after.split('.')[0] || '0';
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section)!.push(sid);
  }
  return [...groups.entries()].map(([section, ids]) => ({
    passage_id: `${suttaId}:p${section}`,
    segment_ids: ids,
    agama: null,
  }));
}
