import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../../i18n/zh-Hant';
import {
  foldDiacritics, toTraditional, chineseBigrams, suttaIdOf,
  type FulltextIndex, type LemmaIndex, type SurfaceIndex, type SuttaCatalog, type EmbedMeta,
} from '../../lib/search-client';
import './search.css';

type Mode = 'sutta' | 'surface' | 'lemma' | 'fulltext' | 'semantic';
interface Props { baseUrl: string }
interface Result {
  seg?: string;
  sutta: string;
  title: string;
  snippet?: string;
  lang?: 'pi' | 'zh';
  lemma?: string;
  score?: number;
  count?: number;
}

export default function SearchPage({ baseUrl }: Props) {
  const url = (p: string) => `${baseUrl}${p}` || '/';
  const dataUrl = (f: string) => `${baseUrl}/data/${f}`;

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('fulltext');
  const [results, setResults] = useState<Result[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [semStatus, setSemStatus] = useState<'idle' | 'loading' | 'ready'>('idle');

  // 快取
  const cat = useRef<SuttaCatalog[] | null>(null);
  const snippets = useRef<Record<string, { pi: string; zh?: string }> | null>(null);
  const fulltext = useRef<FulltextIndex | null>(null);
  const lemmaIdx = useRef<LemmaIndex | null>(null);
  const surfaceIdx = useRef<SurfaceIndex | null>(null);
  const embed = useRef<{ meta: EmbedMeta; mat: Float32Array } | null>(null);
  const extractor = useRef<any>(null);

  const titleOf = (suttaId: string) => {
    const s = cat.current?.find((x) => x.id === suttaId);
    return s ? `${s.collection_zh ?? s.collection}・${s.title_zh}` : suttaId;
  };

  const loadJson = async <T,>(ref: React.MutableRefObject<T | null>, file: string): Promise<T> => {
    if (ref.current) return ref.current;
    const r = await fetch(dataUrl(file));
    ref.current = await r.json();
    return ref.current!;
  };

  useEffect(() => {
    loadJson(cat, 'suttas.json').catch(() => {});
    loadJson(snippets, 'snippets.json').catch(() => {});
  }, []);

  const ensureSemantic = useCallback(async () => {
    if (embed.current && extractor.current) return;
    setSemStatus('loading');
    const meta = (await (await fetch(dataUrl('embeddings-meta.json'))).json()) as EmbedMeta;
    const bin = await (await fetch(dataUrl('embeddings.bin'))).arrayBuffer();
    embed.current = { meta, mat: new Float32Array(bin) };
    // 懶載 transformers.js（CDN，首次下載；SEARCH §6a）
    const mod: any = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3');
    extractor.current = await mod.pipeline('feature-extraction', meta.model);
    setSemStatus('ready');
  }, []);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    setSearched(true);
    if (!q) { setResults(null); return; }

    if (mode === 'sutta') {
      const c = await loadJson(cat, 'suttas.json');
      const qf = q.toLowerCase();
      const hits = c.filter((s) =>
        s.id.includes(qf) || s.title_pali.toLowerCase().includes(qf) || s.title_zh.includes(q) || toTraditional(q) && s.title_zh.includes(toTraditional(q))
      );
      setResults(hits.map((s) => ({ sutta: s.id, title: `${s.collection_zh ?? s.collection}・${s.title_zh}`, snippet: s.title_pali })));
      return;
    }

    if (mode === 'surface') {
      const idx = await loadJson(surfaceIdx, 'index-surface.json');
      const snip = await loadJson(snippets, 'snippets.json');
      const hits = idx[foldDiacritics(q)] ?? [];
      setResults(hits.slice(0, 100).map((h) => ({ seg: h.seg, sutta: suttaIdOf(h.seg), title: titleOf(suttaIdOf(h.seg)), snippet: snip[h.seg]?.pi, lang: 'pi' })));
      return;
    }

    if (mode === 'lemma') {
      const idx = await loadJson(lemmaIdx, 'index-lemma.json');
      const snip = await loadJson(snippets, 'snippets.json');
      const e = idx[foldDiacritics(q)];
      if (!e) { setResults([]); return; }
      setResults(e.occurrences.slice(0, 100).map((seg) => ({ seg, sutta: suttaIdOf(seg), title: titleOf(suttaIdOf(seg)), snippet: snip[seg]?.pi, lang: 'pi', lemma: e.lemma })));
      return;
    }

    if (mode === 'fulltext') {
      const idx = await loadJson(fulltext, 'index-fulltext.json');
      const snip = await loadJson(snippets, 'snippets.json');
      const isCjk = /[一-鿿]/.test(q);
      const segScore = new Map<string, { lang: 'pi' | 'zh'; n: number }>();
      const keys = isCjk ? chineseBigrams(toTraditional(q)) : [foldDiacritics(q)];
      for (const k of keys) {
        for (const p of idx.postings[k] ?? []) {
          const cur = segScore.get(p.seg);
          if (cur) cur.n++;
          else segScore.set(p.seg, { lang: p.lang, n: 1 });
        }
      }
      const ranked = [...segScore.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 100);
      setResults(ranked.map(([seg, v]) => ({ seg, sutta: suttaIdOf(seg), title: titleOf(suttaIdOf(seg)), snippet: v.lang === 'zh' ? snip[seg]?.zh ?? snip[seg]?.pi : snip[seg]?.pi, lang: v.lang })));
      return;
    }

    if (mode === 'semantic') {
      await ensureSemantic();
      const { meta, mat } = embed.current!;
      const snip = await loadJson(snippets, 'snippets.json');
      const out = await extractor.current(meta.query_prefix + q, { pooling: 'mean', normalize: true });
      const qv = out.data as Float32Array;
      const dim = meta.dim;
      const scores: { seg: string; score: number }[] = [];
      for (let i = 0; i < meta.count; i++) {
        let dot = 0;
        for (let d = 0; d < dim; d++) dot += qv[d] * mat[i * dim + d];
        scores.push({ seg: meta.ids[i], score: dot });
      }
      scores.sort((a, b) => b.score - a.score);
      setResults(scores.slice(0, 20).map((s) => ({ seg: s.seg, sutta: suttaIdOf(s.seg), title: titleOf(suttaIdOf(s.seg)), snippet: snip[s.seg]?.zh ?? snip[s.seg]?.pi, lang: snip[s.seg]?.zh ? 'zh' : 'pi', score: s.score })));
      return;
    }
  }, [query, mode, ensureSemantic]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch();
  };

  const modes: { k: Mode; label: string }[] = [
    { k: 'fulltext', label: t.search.modeFulltext },
    { k: 'sutta', label: t.search.modeSutta },
    { k: 'surface', label: t.search.modeSurface },
    { k: 'lemma', label: t.search.modeLemma },
    { k: 'semantic', label: t.search.modeSemantic },
  ];

  return (
    <div className="search-page">
      <form className="search-bar" onSubmit={onSubmit}>
        <div className="mode-tabs" role="tablist">
          {modes.map((m) => (
            <button type="button" key={m.k} role="tab" aria-selected={mode === m.k} className={mode === m.k ? 'mode is-active' : 'mode'} onClick={() => setMode(m.k)}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="search-input-row">
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search.placeholder}
            lang={mode === 'lemma' || mode === 'surface' ? 'pi' : undefined}
            autoFocus
          />
          <button type="submit" className="search-go">{t.search.title}</button>
        </div>
        {mode === 'semantic' && (
          <p className="calm-note sem-hint">
            {semStatus === 'loading' ? t.search.semanticLoading : t.search.semanticHint}
          </p>
        )}
      </form>

      {!searched && <p className="calm-note initial-hint">{t.search.initialHint}</p>}

      {searched && results && results.length === 0 && (
        <div className="empty">
          <p className="empty-title">{t.search.emptyTitle}</p>
          <p className="calm-note">{t.search.emptyHint}</p>
        </div>
      )}

      {results && results.length > 0 && (
        <ul className="result-list">
          {results.map((r, i) => (
            <li className="result-item" key={i}>
              <a href={r.seg ? url(`/read/${r.sutta}#${r.seg}`) : url(`/read/${r.sutta}`)}>
                <span className="result-title">{r.title}</span>
                {r.seg && <span className="result-seg data">{r.seg}</span>}
                {r.lemma && <span className="result-lemma" lang="pi">{r.lemma}</span>}
                {r.snippet && (
                  <span className={r.lang === 'pi' ? 'result-snippet' : 'result-snippet zh'} lang={r.lang === 'pi' ? 'pi' : 'zh-Hant'}>
                    {r.snippet.slice(0, 120)}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
