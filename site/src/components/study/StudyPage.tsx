import { useCallback, useEffect, useState } from 'react';
import type { PaliToken, SuttaFixture } from '@tipitaka/contracts';
import { t } from '../../i18n/zh-Hant';
import { useLayoutMode } from './useBreakpoint';
import PaliColumn from './PaliColumn';
import ChineseColumn from './ChineseColumn';
import StudyColumn from './StudyColumn';
import DpdPopover from './DpdPopover';
import RelatedPanel from './RelatedPanel';
import ChatSidebar from './ChatSidebar';
import type { SuttaContextData } from '../../lib/data';
import './study.css';

interface EntityLink {
  key: string;
  name_pali: string;
  name_zh?: string;
}
interface Props {
  fixture: SuttaFixture;
  prevId: string | null;
  nextId: string | null;
  baseUrl: string;
  context?: SuttaContextData | null;
  entities?: EntityLink[];
  l3Api?: string;
}

type Tab = 'pali' | 'chinese' | 'study';

export default function StudyPage({ fixture, prevId, nextId, baseUrl, context = null, entities = [], l3Api = '' }: Props) {
  const { sutta, segments, passages, summary, study_cards } = fixture;
  const hasAgama = passages.some((p) => p.agama != null);

  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<PaliToken | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [glossLayerVisible, setGlossLayerVisible] = useState(false);
  const [agamaVisible, setAgamaVisible] = useState(false);
  const [glossHighlightTokenIds, setGlossHighlightTokenIds] = useState<Set<string>>(new Set());

  const mode = useLayoutMode();
  const [tab, setTab] = useState<Tab>('pali'); // 巴利永遠是手機預設頁籤
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 衍生：hover 優先於 active（contract §2）
  const highlightedSegmentId = hoveredSegmentId ?? activeSegmentId;

  const url = useCallback((p: string) => `${baseUrl}${p}` || '/', [baseUrl]);

  // 深連結：#segmentId → 捲動 + 高亮（SITE_IA §2/§7）
  useEffect(() => {
    const applyHash = () => {
      const raw = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (!raw) return;
      if (segments.some((s) => s.segment_id === raw)) {
        setActiveSegmentId(raw);
        requestAnimationFrame(() => {
          document.getElementById(raw)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [segments]);

  const onTokenSelect = useCallback((token: PaliToken, rect: DOMRect) => {
    setSelectedToken((cur) => (cur?.token_id === token.token_id ? null : token));
    setAnchorRect(rect);
  }, []);

  const onGlossHover = useCallback((tokenIds: string[] | null) => {
    setGlossHighlightTokenIds(tokenIds ? new Set(tokenIds) : new Set());
  }, []);

  const paliCol = (
    <PaliColumn
      segments={segments}
      highlightedSegmentId={highlightedSegmentId}
      selectedTokenId={selectedToken?.token_id ?? null}
      glossHighlightTokenIds={glossHighlightTokenIds}
      onSegmentHover={setHoveredSegmentId}
      onSegmentActivate={(id) => setActiveSegmentId((cur) => (cur === id ? null : id))}
      onTokenSelect={onTokenSelect}
    />
  );
  const chineseCol = (
    <ChineseColumn
      segments={segments}
      passages={passages}
      highlightedSegmentId={highlightedSegmentId}
      glossLayerVisible={glossLayerVisible}
      agamaVisible={agamaVisible}
      onSegmentHover={setHoveredSegmentId}
      onSegmentActivate={(id) => setActiveSegmentId((cur) => (cur === id ? null : id))}
      onGlossHover={onGlossHover}
    />
  );
  const studyCol = <StudyColumn summary={summary} studyCards={study_cards} />;

  const header = (
    <header className="study-header chrome">
      <div className="study-header-row">
        <div className="study-title">
          <a className="nav-arrow" href={prevId ? url(`/read/${prevId}`) : undefined} aria-disabled={!prevId}>
            ‹
          </a>
          <div className="study-title-text">
            <span lang="pi" className="title-pali">
              {sutta.title_pali}
            </span>
            <span className="title-zh">
              {sutta.collection_zh ? `${sutta.collection_zh}・` : ''}
              {sutta.title_zh}
            </span>
          </div>
          <a className="nav-arrow" href={nextId ? url(`/read/${nextId}`) : undefined} aria-disabled={!nextId}>
            ›
          </a>
        </div>
        <div className="study-controls">
          <button
            type="button"
            className={glossLayerVisible ? 'ctrl is-on' : 'ctrl'}
            aria-pressed={glossLayerVisible}
            onClick={() => setGlossLayerVisible((v) => !v)}
          >
            {glossLayerVisible ? t.study.hideGloss : t.study.showGloss}
          </button>
          <button
            type="button"
            className={agamaVisible ? 'ctrl is-on' : 'ctrl'}
            aria-pressed={agamaVisible}
            onClick={() => setAgamaVisible((v) => !v)}
          >
            {agamaVisible ? t.study.hideAgama : t.study.showAgama}
          </button>
        </div>
      </div>
    </header>
  );

  // 手機頁籤（巴利預設、永不被隱藏）
  const mobileTabs = (
    <div className="study-tabs" role="tablist">
      {(['pali', 'chinese', 'study'] as Tab[]).map((tb) => (
        <button
          key={tb}
          role="tab"
          aria-selected={tab === tb}
          className={tab === tb ? 'tab is-active' : 'tab'}
          onClick={() => setTab(tb)}
        >
          {tb === 'pali' ? t.study.tabPali : tb === 'chinese' ? t.study.tabChinese : t.study.tabStudy}
        </button>
      ))}
    </div>
  );

  let columns: React.ReactNode;
  if (mode === 'three') {
    columns = (
      <div className="cols cols-three">
        {paliCol}
        {chineseCol}
        {studyCol}
      </div>
    );
  } else if (mode === 'two-drawer') {
    columns = (
      <div className="cols cols-two">
        {paliCol}
        {chineseCol}
        <button className="drawer-toggle chrome" type="button" onClick={() => setDrawerOpen((v) => !v)}>
          {t.study.colStudy}
        </button>
        {drawerOpen && (
          <div className="drawer" role="dialog" aria-label={t.study.colStudy}>
            <button className="drawer-close" type="button" onClick={() => setDrawerOpen(false)}>
              ✕
            </button>
            {studyCol}
          </div>
        )}
      </div>
    );
  } else {
    columns = (
      <>
        {mobileTabs}
        <div className="cols cols-tab">
          {tab === 'pali' && paliCol}
          {tab === 'chinese' && chineseCol}
          {tab === 'study' && studyCol}
        </div>
      </>
    );
  }

  return (
    <div className="study-page">
      {header}
      <RelatedPanel suttaId={sutta.id} context={context} hasAgama={hasAgama} entities={entities} baseUrl={baseUrl} />
      {columns}
      {selectedToken && anchorRect && (
        <DpdPopover token={selectedToken} anchorRect={anchorRect} onClose={() => setSelectedToken(null)} />
      )}
      {l3Api && <ChatSidebar fixture={fixture} apiBase={l3Api} />}
    </div>
  );
}
