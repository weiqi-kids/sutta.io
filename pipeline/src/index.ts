// index.ts — P7 全文 / lemma / surface 索引（B-5；DATA_PIPELINE §6 格式即契約）
import path from 'node:path';
import type { SuttaFixture } from '@tipitaka/contracts';
import { DATA_DIR } from './config.ts';
import { foldDiacritics, writeJson } from './util.ts';

interface Posting {
  seg: string;
  lang: 'pi' | 'zh';
}

export function buildIndexes(suttas: SuttaFixture[]) {
  const fulltext: Record<string, Posting[]> = {};
  const lemma: Record<string, { lemma: string; forms: string[]; occurrences: string[] }> = {};
  const surface: Record<string, { seg: string; token: string }[]> = {};

  const addFulltext = (key: string, p: Posting) => {
    if (!key) return;
    (fulltext[key] ??= []).push(p);
  };

  for (const s of suttas) {
    // 巴利 token：surface（折疊）→ fulltext + surface 索引；lemma 索引
    for (const seg of s.segments) {
      for (const tok of seg.pali_tokens) {
        const folded = foldDiacritics(tok.surface);
        addFulltext(folded, { seg: seg.segment_id, lang: 'pi' });
        (surface[folded] ??= []).push({ seg: seg.segment_id, token: tok.token_id });
        if (tok.lemma) {
          const lkey = foldDiacritics(tok.lemma);
          const e = (lemma[lkey] ??= { lemma: tok.lemma, forms: [], occurrences: [] });
          if (!e.forms.includes(tok.surface)) e.forms.push(tok.surface);
          if (!e.occurrences.includes(seg.segment_id)) e.occurrences.push(seg.segment_id);
        }
      }
      // 白話（L2，若已填）→ 中文全文（bigram）
      if (seg.vernacular_gloss?.content) {
        for (const bg of bigrams(seg.vernacular_gloss.content)) {
          addFulltext(bg, { seg: seg.segment_id, lang: 'zh' });
        }
      }
    }
    // 阿含（L1，passage 級）→ 中文全文（bigram，錨定 passage 首 segment）
    for (const p of s.passages) {
      if (p.agama?.text && p.segment_ids.length) {
        const anchor = p.segment_ids[0];
        for (const bg of bigrams(p.agama.text)) {
          addFulltext(bg, { seg: anchor, lang: 'zh' });
        }
      }
    }
  }

  // 去重 postings
  for (const k of Object.keys(fulltext)) {
    fulltext[k] = dedupePostings(fulltext[k]);
  }

  writeJson(path.join(DATA_DIR, 'index-fulltext.json'), { model: 'fulltext-v1', postings: fulltext });
  writeJson(path.join(DATA_DIR, 'index-lemma.json'), lemma);
  writeJson(path.join(DATA_DIR, 'index-surface.json'), surface);

  return {
    fulltextKeys: Object.keys(fulltext).length,
    lemmaKeys: Object.keys(lemma).length,
    surfaceKeys: Object.keys(surface).length,
  };
}

/** 目錄索引 data/suttas.json（搜尋頁「經文定位」+ 客端瀏覽）。 */
export function buildCatalog(suttas: SuttaFixture[]) {
  const list = suttas.map((s) => ({
    id: s.sutta.id,
    title_pali: s.sutta.title_pali,
    title_zh: s.sutta.title_zh,
    collection: s.sutta.collection,
    collection_zh: s.sutta.collection_zh,
    hasParallel: s.passages.some((p) => p.agama != null),
  }));
  writeJson(path.join(DATA_DIR, 'suttas.json'), list);
}

// 中文 bigram（無空白語言的輕量全文索引）；單字也收
function bigrams(text: string): string[] {
  const clean = text.replace(/[\s　0-9A-Za-z，。、；：？！「」『』（）()…—\-]/g, '');
  const out = new Set<string>();
  for (let i = 0; i < clean.length; i++) {
    out.add(clean[i]);
    if (i + 1 < clean.length) out.add(clean[i] + clean[i + 1]);
  }
  return [...out];
}

function dedupePostings(arr: Posting[]): Posting[] {
  const seen = new Set<string>();
  const out: Posting[] = [];
  for (const p of arr) {
    const k = `${p.seg}|${p.lang}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}
