import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DpdAnalysis, PaliToken } from '@tipitaka/contracts';
import { useI18n } from '../../i18n/react';

interface Props {
  token: PaliToken;
  anchorRect: DOMRect;
  onClose: () => void;
}

// DPD 詞條浮層（STUDY_PAGE §4.2，portal）。全部 L1，來自 dpd-db。
// dpd_id===null → 降級「DPD 尚未收錄此詞」；ambiguous → 標「多解」可展開 candidates。
export default function DpdPopover({ token, anchorRect, onClose }: Props) {
  const t = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [showCandidates, setShowCandidates] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  // 定位於被點 token 下方，避免被欄寬裁切（portal 至 body）。
  const POP_W = 280;
  const margin = 8;
  let left = anchorRect.left + window.scrollX;
  left = Math.min(left, window.scrollX + window.innerWidth - POP_W - margin);
  left = Math.max(left, window.scrollX + margin);
  const top = anchorRect.bottom + window.scrollY + 6;

  const notFound = token.dpd_id === null;

  const row = (label: string, value: React.ReactNode, mono = false) => (
    <div className="dpd-row">
      <span className="dpd-label">{label}</span>
      <span className={mono ? 'dpd-value data' : 'dpd-value'}>{value}</span>
    </div>
  );

  const body = (
    <div
      ref={ref}
      className="dpd-popover"
      role="dialog"
      aria-label="DPD 詞條"
      style={{ left, top, width: POP_W }}
    >
      <div className="dpd-head">
        <span lang="pi" className="dpd-surface">
          {token.surface}
        </span>
        {token.ambiguous && <span className="dpd-multi">{t.dpd.ambiguous}</span>}
      </div>

      {notFound ? (
        <p className="dpd-notfound calm-note">{t.dpd.notInDpd}</p>
      ) : (
        <div className="dpd-fields">
          {row(t.dpd.lemma, <span lang="pi">{token.lemma}</span>)}
          {row(t.dpd.id, token.dpd_id, true)}
          {row(t.dpd.root, token.root ? <span lang="pi">{token.root}</span> : t.dpd.none, true)}
          {token.morph_display && row(t.dpd.morph, token.morph_display)}
          {token.compound && row(t.dpd.compound, <span lang="pi">{token.compound}</span>)}
          {token.gloss && row(t.dpd.gloss, token.gloss)}
          {row(t.dpd.freq, token.freq != null ? token.freq.toLocaleString() : t.dpd.none, true)}

          {token.ambiguous && token.candidates && token.candidates.length > 0 && (
            <div className="dpd-candidates">
              <button type="button" className="dpd-cand-toggle" onClick={() => setShowCandidates((v) => !v)}>
                {t.dpd.otherCandidates}（{token.candidates.length}）{showCandidates ? '▾' : '▸'}
              </button>
              {showCandidates && (
                <ul>
                  {token.candidates.map((c: DpdAnalysis, i: number) => (
                    <li key={i}>
                      <span lang="pi">{c.lemma}</span>
                      {c.morph_display && <span className="calm-note"> · {c.morph_display}</span>}
                      {c.gloss && <span className="calm-note"> · {c.gloss}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(body, document.body);
}
