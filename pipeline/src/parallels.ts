// parallels.ts — P5 漢譯阿含對照（段落級，CBETA；A-1）。自動解析版（供每日自動化）。
// 流程：MN → SuttaCentral parallels → 中阿含(MA)經號 → CBETA TOC → 卷+經名 → 抓卷文截取該經。
// 誠實邊界：阿含是「另一傳本」，段落級。任一步失敗 → agama:null（降級，不假造）。
import type { Passage, AgamaParallel } from '@tipitaka/contracts';
import { fetchCached } from './util.ts';

const SC_PARALLELS = 'https://raw.githubusercontent.com/suttacentral/sc-data/main/relationship/parallels.json';
const CBETA_TOC = 'https://api.cbetaonline.cn/works/toc?work=T0026'; // 中阿含 T26

interface TocSutta {
  n: number;
  name: string;
  juan: number;
}

let _parallels: any[] | null = null;
async function loadParallels(): Promise<any[]> {
  if (_parallels) return _parallels;
  const txt = await fetchCached(SC_PARALLELS, 'sc-parallels.json');
  _parallels = JSON.parse(txt);
  return _parallels!;
}

let _toc: Map<number, TocSutta> | null = null;
async function loadToc(): Promise<Map<number, TocSutta>> {
  if (_toc) return _toc;
  const txt = await fetchCached(CBETA_TOC, 'cbeta-toc-T0026.json');
  const j = JSON.parse(txt);
  const map = new Map<number, TocSutta>();
  const walk = (node: any) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (node.type === '經' && typeof node.n === 'number') {
      const name = String(node.title).replace(/^\d+\s*/, '').trim();
      map.set(node.n, { n: node.n, name, juan: node.juan });
    }
    if (node.children) walk(node.children);
    if (node.results) walk(node.results);
    if (node.mulu) walk(node.mulu);
  };
  walk(j);
  _toc = map;
  return map;
}

/** MN id → 中阿含經號（全平行優先，~ 部分平行其次）。無 → null。 */
async function resolveMa(suttaId: string): Promise<number | null> {
  const parallels = await loadParallels();
  let partial: number | null = null;
  for (const entry of parallels) {
    const arr: string[] = entry.parallels ?? [];
    if (!arr.some((x) => x.replace(/^~/, '').split('#')[0] === suttaId)) continue;
    for (const x of arr) {
      const m = x.match(/^(~?)ma(\d+)/);
      if (!m) continue;
      const n = parseInt(m[2], 10);
      if (!m[1]) return n; // 全平行
      if (partial == null) partial = n;
    }
  }
  return partial;
}

async function fetchJuanText(juan: number): Promise<string> {
  const url = `https://api.cbetaonline.cn/juans?work=T0026&juan=${juan}`;
  const txt = await fetchCached(url, `cbeta-T0026-${String(juan).padStart(3, '0')}.json`);
  const obj = JSON.parse(txt) as { results: string[] };
  const html = (obj.results?.[0] ?? '').replace(/<a[^>]*class="noteAnchor"[^>]*>.*?<\/a>/g, '');
  return html.replace(/<[^>]+>/g, '');
}

function cleanAgama(body: string): string {
  let b = body.replace(/T\d+n\d+_p\d+\w*/g, '').replace(/\d+[abc]\d{1,2}/g, '');
  b = b.replace(/[\s　]+/g, ' ').trim();
  b = b.replace(/\s*「/g, '\n\n「').replace(/。\s*復次/g, '。\n\n復次');
  return b.replace(/^\n+/, '').trim();
}

/** 自動抓某 MN 經的中阿含對照。失敗 → null。 */
export async function fetchAgama(suttaId: string): Promise<AgamaParallel | null> {
  try {
    const maN = await resolveMa(suttaId);
    if (maN == null) return null;
    const toc = await loadToc();
    const cur = toc.get(maN);
    if (!cur) return null;
    const next = toc.get(maN + 1);
    const text = await fetchJuanText(cur.juan);

    // 起：該經標題「…{name}第X」；訖：下一經標題 或 「{name}…竟」
    const titleRe = new RegExp('中阿含[^。\\n]{0,10}' + cur.name + '第[一二三四五六七八九十]+');
    const tm = titleRe.exec(text);
    if (!tm) return null;
    const bodyStart = tm.index + tm[0].length;

    let endIdx = -1;
    if (next) {
      const nextRe = new RegExp('中阿含[^。\\n]{0,10}' + next.name + '第[一二三四五六七八九十]+');
      const nm = nextRe.exec(text.slice(bodyStart));
      if (nm) endIdx = bodyStart + nm.index;
    }
    if (endIdx < 0) {
      const colo = text.indexOf(cur.name + '第', bodyStart);
      const coloEnd = text.indexOf('竟', colo);
      if (colo > bodyStart && coloEnd > colo) endIdx = colo;
    }
    const body = cleanAgama(endIdx > bodyStart ? text.slice(bodyStart, endIdx) : text.slice(bodyStart, bodyStart + 8000));
    if (body.length < 50) return null;
    return { source: 'CBETA', ref: `T01n0026 中阿含${maN} ${cur.name}`, text: body };
  } catch {
    return null;
  }
}

/** 組 passages（傳本級單一 passage 涵蓋全段；無對照則章節分組 agama:null）。 */
export async function buildPassages(suttaId: string, segmentIds: string[]): Promise<Passage[]> {
  const agama = await fetchAgama(suttaId);
  if (agama) return [{ passage_id: `${suttaId}:pa1`, segment_ids: segmentIds, agama }];
  const groups = new Map<string, string[]>();
  for (const sid of segmentIds) {
    const section = (sid.split(':')[1] ?? '').split('.')[0] || '0';
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section)!.push(sid);
  }
  return [...groups.entries()].map(([section, ids]) => ({
    passage_id: `${suttaId}:p${section}`,
    segment_ids: ids,
    agama: null,
  }));
}
