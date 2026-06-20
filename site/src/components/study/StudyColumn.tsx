import type { SummaryCard, StudyCardData } from '@tipitaka/contracts';
import { t } from '../../i18n/zh-Hant';

interface Props {
  summary: SummaryCard | null;
  studyCards: StudyCardData[];
}

// 欄 C：章節概要 + 研經卡（純 L2）。全部帶 AI 徽章 + L2 材質 + review 狀態。
export default function StudyColumn({ summary, studyCards }: Props) {
  return (
    <div className="col col-study">
      <h2 className="col-head">{t.study.colStudy}</h2>

      {summary && (
        <section className="l2 study-card">
          <header className="card-head">
            <span className="ai-badge">{t.study.aiBadge}</span>
            <span className="card-title">{t.study.summary}</span>
            {summary.review_status === 'draft' && <span className="draft-mark">{t.study.draftMark}</span>}
          </header>
          <p className="card-content">{summary.content}</p>
        </section>
      )}

      {studyCards.map((card) => (
        <section key={card.card_id} className="l2 study-card">
          <header className="card-head">
            <span className="ai-badge">{t.study.aiBadge}</span>
            <span className="card-title">{card.title}</span>
            {card.review_status === 'draft' && <span className="draft-mark">{t.study.draftMark}</span>}
          </header>
          <p className="card-content">{card.content}</p>
          {card.sources.length > 0 && (
            <footer className="card-sources calm-note">
              {t.study.sources}：<span className="data">{card.sources.join('、')}</span>
            </footer>
          )}
        </section>
      ))}

      {!summary && studyCards.length === 0 && <p className="calm-note col-empty">此經暫無研經內容。</p>}
    </div>
  );
}
