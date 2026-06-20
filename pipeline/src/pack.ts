// pack.ts — P8 打包：組成每部經的 L1 預建 JSON（對齊 study_page_types.ts）
// L2（vernacular_gloss/summary/study_cards）留空，由 generation（Phase D）填入並校稿後合併。
import type { SuttaFixture, Segment, PaliToken } from '@tipitaka/contracts';
import { fetchSegments } from './fetch.ts';
import { tokenizeSegment } from './tokenize.ts';
import { analyzeSurface } from './dpd.ts';
import { buildPassages } from './parallels.ts';
import { SUTTA_TITLES, VERSIONS } from './config.ts';

export async function buildSutta(suttaId: string): Promise<SuttaFixture> {
  const raw = await fetchSegments(suttaId);

  const segments: Segment[] = raw.map((rs) => {
    const surfaces = tokenizeSegment(rs.text);
    const pali_tokens: PaliToken[] = surfaces.map((surface, i) => {
      const a = analyzeSurface(surface);
      return {
        token_id: `${rs.segment_id}.t${i}`,
        surface,
        lemma: a.lemma,
        dpd_id: a.dpd_id,
        root: a.root,
        morph: a.morph,
        morph_display: a.morph_display,
        compound: a.compound,
        gloss: a.gloss,
        freq: a.freq,
        ambiguous: a.ambiguous,
        candidates: a.candidates,
      };
    });
    return {
      segment_id: rs.segment_id,
      pali_tokens,
      vernacular_gloss: null, // L2，generation 階段填
    };
  });

  const segmentIds = segments.map((s) => s.segment_id);
  const passages = await buildPassages(suttaId, segmentIds);

  const meta = SUTTA_TITLES[suttaId];
  const sutta: SuttaFixture['sutta'] = {
    id: suttaId,
    title_pali: meta?.pali ?? suttaId.toUpperCase(),
    title_zh: meta?.zh ?? suttaId,
    collection: meta?.collection ?? 'Majjhima Nikāya',
    collection_zh: meta?.collection_zh ?? '中部',
    source: `suttacentral:${suttaId}`,
  };

  return {
    sutta,
    segments,
    passages,
    summary: null, // L2
    study_cards: [], // L2
    // 每經 manifest 不含 built_at（利可重現）；全域 built_at 在 data/manifest.json
    manifest: { dpd: VERSIONS.dpd_tag, cbeta: VERSIONS.cbeta, sc: VERSIONS.bilara_branch },
  };
}
