import type { Segment, PaliToken } from '@tipitaka/contracts';
import { t } from '../../i18n/zh-Hant';

interface Props {
  segments: Segment[];
  highlightedSegmentId: string | null;
  selectedTokenId: string | null;
  glossHighlightTokenIds: Set<string>;
  onSegmentHover: (id: string | null) => void;
  onSegmentActivate: (id: string | null) => void;
  onTokenSelect: (token: PaliToken, rect: DOMRect) => void;
}

// 欄 A：巴利原文（純 L1）。token 可點 → DPD popover。
export default function PaliColumn({
  segments,
  highlightedSegmentId,
  selectedTokenId,
  glossHighlightTokenIds,
  onSegmentHover,
  onSegmentActivate,
  onTokenSelect,
}: Props) {
  return (
    <div className="col col-pali" lang="pi">
      <h2 className="col-head" lang="zh-Hant">
        {t.study.colPali}
      </h2>
      {segments.map((seg) => {
        const hl = seg.segment_id === highlightedSegmentId;
        return (
          <div
            key={seg.segment_id}
            id={seg.segment_id}
            className={`seg-row${hl ? ' is-highlighted' : ''}`}
            data-segment={seg.segment_id}
            onMouseEnter={() => onSegmentHover(seg.segment_id)}
            onMouseLeave={() => onSegmentHover(null)}
            onClick={() => onSegmentActivate(seg.segment_id)}
          >
            <p className="pali-line">
              {seg.pali_tokens.map((tok) => {
                const selected = tok.token_id === selectedTokenId;
                const grounded = glossHighlightTokenIds.has(tok.token_id);
                return (
                  <span
                    key={tok.token_id}
                    className={`pali-token${selected ? ' is-selected' : ''}${
                      grounded ? ' is-grounded' : ''
                    }`}
                    tabIndex={0}
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTokenSelect(tok, (e.currentTarget as HTMLElement).getBoundingClientRect());
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onTokenSelect(tok, (e.currentTarget as HTMLElement).getBoundingClientRect());
                      }
                    }}
                  >
                    {tok.surface}
                  </span>
                );
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
