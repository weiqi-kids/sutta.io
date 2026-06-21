// dppn.ts — DPPN 專名詞條擷取（CONTEXT B / LEXICON §6 / J-3）。
// 來源：Malalasekera《Dictionary of Pāli Proper Names》(SuttaCentral 整理版 xdxf，公共領域)。
// 為每個經中出現的專名產 SourcedFact：DPPN 摘要(commentarial，附其引用的正典出處) + 我們資料的 canonical 出現連結。
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ROOT_DIR, DATA_DIR, VENDOR_DIR } from './config.ts';
import { writeJson, ensureDir } from './util.ts';

const DPPN_URL = 'https://raw.githubusercontent.com/mbingenheimer/buddhist_studies_glossaries/master/pali/dppn_suttacentral.xdxf';
const DPPN_PATH = path.join(VENDOR_DIR, 'dppn.xdxf');
const CONTENT_ENTITIES = path.join(ROOT_DIR, 'content', 'entities');

function ensureDppn(): string {
  if (!fs.existsSync(DPPN_PATH)) {
    ensureDir(VENDOR_DIR);
    console.log('下載 DPPN xdxf（Malalasekera，公共領域）…');
    execSync(`curl -sL -o "${DPPN_PATH}" "${DPPN_URL}"`, { stdio: 'inherit' });
  }
  return fs.readFileSync(DPPN_PATH, 'utf-8');
}

/** 從 xdxf 抽某專名的定義文字、引用、類型。 */
function extractEntry(xdxf: string, namePali: string): { text: string; refs: string[]; kind: string } | null {
  const re = /<ar>([\s\S]*?)<\/ar>/g;
  let m: RegExpExecArray | null;
  const headRe = new RegExp('#a00149">\\s*' + namePali.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*<');
  while ((m = re.exec(xdxf))) {
    const body = m[1];
    if (!headRe.test(body)) continue;
    const refs = [...body.matchAll(/#3b6bd3">([^<]+)</g)].map((r) => r[1].trim()).slice(0, 8);
    const kindMatch = body.match(/<def cmt="([^"]+)"/);
    const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return { text, refs, kind: kindMatch?.[1] ?? 'thing' };
  }
  return null;
}

export function buildEntities() {
  if (!fs.existsSync(CONTENT_ENTITIES)) return;
  const xdxf = ensureDppn();
  const out: Record<string, any> = {};

  for (const f of fs.readdirSync(CONTENT_ENTITIES)) {
    if (f === 'entries.json' || !f.endsWith('.json')) continue;
    const suttaId = f.replace(/\.json$/, '');
    const { entities } = JSON.parse(fs.readFileSync(path.join(CONTENT_ENTITIES, f), 'utf-8')) as {
      entities: { key: string; name_pali: string; name_zh?: string; occ_segment?: string }[];
    };
    for (const e of entities) {
      if (out[e.key]) continue;
      const dppn = extractEntry(xdxf, e.name_pali) ?? extractEntry(xdxf, e.name_pali.replace(/ss/g, 's'));
      const summary: any[] = [];
      // canonical：我們資料中此經的出現（可連結）
      if (e.occ_segment) {
        summary.push({ provenance: 'canonical', content: `出現於本經（${suttaId.toUpperCase()}）。`, source_ref: e.occ_segment });
      }
      // commentarial/scholarly：DPPN 摘要（附其引用的正典出處）
      if (dppn) {
        summary.push({
          provenance: 'commentarial',
          content: dppn.text.slice(0, 700),
          note: dppn.refs.length ? `DPPN 引用：${dppn.refs.join('、')}（PTS 標注）` : undefined,
        });
      }
      out[e.key] = {
        entity_id: e.key,
        kind: dppn?.kind === 'person' ? 'person' : 'place',
        name_pali: e.name_pali,
        name_zh: e.name_zh,
        dppn_ref: dppn ? 'Malalasekera, Dictionary of Pāli Proper Names（DPPN，公共領域）' : undefined,
        summary,
        occurrences: e.occ_segment ? [e.occ_segment] : [],
      };
    }
  }
  writeJson(path.join(DATA_DIR, 'entities.json'), out);
  console.log(`▶ DPPN 專名（J-3）：${Object.keys(out).length} 條 → data/entities.json`);
}
