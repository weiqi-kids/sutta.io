import type { Segment, Passage } from '@tipitaka/contracts';
import { useI18n } from '../../i18n/react';

interface Props {
  segments: Segment[];
  passages: Passage[];
  highlightedSegmentId: string | null;
  glossLayerVisible: boolean;
  agamaVisible: boolean;
  onSegmentHover: (id: string | null) => void;
  onSegmentActivate: (id: string | null) => void;
  onGlossHover: (tokenIds: string[] | null) => void;
}

// 欄 B：兩塊分離（DATA_PIPELINE §1）。
//  - 白話（L2，segment 級，冷灰鉛筆 + AI 徽章 + draft 標）
//  - 阿含對照（L1，passage 段落級，暖墨正典，null → 「此段無對應漢譯平行」）
export default function ChineseColumn({
  segments,
  passages,
  highlightedSegmentId,
  glossLayerVisible,
  agamaVisible,
  onSegmentHover,
  onSegmentActivate,
  onGlossHover,
}: Props) {
  const t = useI18n();
  return (
    <div className="col col-chinese">
      <h2 className="col-head">{t.study.colChinese}</h2>

      {/* 白話層（L2，segment 級） */}
      {glossLayerVisible && (
        <div className="gloss-block">
          {segments.map((seg) => {
            const g = seg.vernacular_gloss;
            if (!g) return null; // 無白話則該列不渲染（§2.3）
            const hl = seg.segment_id === highlightedSegmentId;
            return (
              <div
                key={seg.segment_id}
                className={`seg-row${hl ? ' is-highlighted' : ''}`}
                onMouseEnter={() => {
                  onSegmentHover(seg.segment_id);
                  onGlossHover(g.grounded_on);
                }}
                onMouseLeave={() => {
                  onSegmentHover(null);
                  onGlossHover(null);
                }}
                onClick={() => onSegmentActivate(seg.segment_id)}
              >
                <div className="l2 gloss">
                  <span className="ai-badge">{t.study.aiBadge}</span>
                  {g.review_status === 'draft' && <span className="draft-mark">{t.study.draftMark}</span>}
                  <span className="gloss-text">{g.content}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 阿含對照（L1，passage 段落級，預設摺疊由父層控制 agamaVisible） */}
      {agamaVisible && (
        <div className="agama-block">
          {passages.map((p) => {
            const hl = p.segment_ids.includes(highlightedSegmentId ?? '');
            return (
              <div key={p.passage_id} className={`agama-passage${hl ? ' is-highlighted' : ''}`}>
                {p.agama ? (
                  <>
                    <span className="agama-tag calm-note">
                      {t.study.anotherRecension}・{p.agama.source}
                    </span>
                    <p className="agama-text">{p.agama.text}</p>
                  </>
                ) : (
                  <p className="calm-note no-agama">
                    {t.study.noAgamaParallel}
                    <span className="no-agama-hint">（{t.study.noAgamaHint}）</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!glossLayerVisible && !agamaVisible && (
        <p className="calm-note col-empty">開啟「{t.study.showGloss}」或「{t.study.showAgama}」以顯示內容。</p>
      )}
    </div>
  );
}
