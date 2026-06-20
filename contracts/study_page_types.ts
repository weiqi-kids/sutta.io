// ============================================================================
// study_page_types.ts
// 全站資料契約 — 研經頁 + 背景脈絡層 + 共用狀態 + 元件 props/callbacks
//
// 對應：STUDY_PAGE_SPEC、CONTEXT_SPEC、LEXICON_PAGE_SPEC、DATA_PIPELINE_SPEC。
// 約束：fixtures/*.json 必須滿足本檔資料層型別。型別即契約。
// ============================================================================

// ---------------------------------------------------------------------------
// 0. 共用列舉
// ---------------------------------------------------------------------------

/** L2 內容的校稿狀態。draft → UI 顯示「未校稿」；approved → 無標記。 */
export type ReviewStatus = "draft" | "approved";

/** 欄 C 的版面型態，由斷點決定（§1）。 */
export type ColumnCLayout = "inline" | "drawer" | "tab";

/**
 * 四級出處（CONTEXT §3）。標明一條內容「憑什麼這麼說」，UI 各有視覺(DESIGN E-2)。
 * 與 ReviewStatus 正交：provenance=來源層級；review_status=ai 內容的校稿狀態。
 * 對映:研經頁 L1(巴利/阿含)≈ canonical；L2(白話/概要/卡)≈ ai。
 */
export type Provenance = "canonical" | "commentarial" | "scholarly" | "ai";
//                        正典         註釋傳統        學界(具名)     AI生成

// ---------------------------------------------------------------------------
// 1. 資料層型別（鏡射 fixture；全部 L1，除了標 L2 者）
//    注意：fixture 內的 `_exercises` / `_fixture_notes` 為標註，非執行期契約。
// ---------------------------------------------------------------------------

/**
 * 巴利逐字 token（L1，來自 dpd-db）。
 * DPD 查無詞條時：dpd_id 為 null，且 lemma/root/morph/morph_display/compound/gloss/freq 亦為 null。
 * dpd_id===null 為「無詞條」的主訊號，前端據此顯示 popover 的降級狀態（§4.2）。
 */
/** 單一 DPD 解析（L1）。token 內嵌「選定」的一份；歧義時候選存 candidates。 */
export interface DpdAnalysis {
  lemma: string | null;            // 字典原形
  dpd_id: number | null;           // DPD 編號；null = 查無詞條（主訊號）
  root: string | null;             // 字根，如 "√su"
  morph: string | null;            // 詞形原始碼，如 "pp.nom.sg.nt"；前端不直接顯示
  morph_display: string | null;    // 詞形人讀字串，如 "過去分詞·主格·單數·中性"；前端顯示用
  compound: string | null;         // 複合詞拆解，如 "saṃ + jānāti"；無則 null
  gloss: string | null;            // 簡義
}

/**
 * 巴利逐字 token（L1，來自 dpd-db）。內嵌「選定」解析的欄位。
 * DPD 查無詞條：dpd_id===null 為主訊號，相關欄位一併 null（§4.2 降級）。
 * 消歧（A-2）：ambiguous===true 表多解；chosen 為規則擇一，candidates 列其餘。
 *            消歧由規則 + 人工，LLM 不參與；ambiguous token 進 golden 複核（H-1）。
 */
export interface PaliToken extends DpdAnalysis {
  token_id: string;
  surface: string;                 // 表面形（經文中的實際字形），永遠有值
  freq: number | null;             // 全藏出現次數（原型為 placeholder）
  ambiguous: boolean;              // 多解旗標；UI 在 popover 標「多解」
  candidates: DpdAnalysis[] | null;// ambiguous 時的其餘候選；否則 null
}

/**
 * 漢譯阿含對照（L1，CBETA，另一古譯本）。
 * 重要：阿含與巴利為「平行的不同傳本」，僅段落級對齊，故掛在 Passage 而非 Segment。
 * 不可逐字對齊、不可當成「巴利的翻譯」呈現。可為 null（多數深層段落無平行）。
 */
export interface AgamaParallel {
  source: string;                  // 如 "CBETA"
  ref: string;                     // 經號定位（原型為 placeholder）
  text: string;
}

/** 漢譯白話（L2，巴利的現代中文逐字解釋，grounded on 巴利 token）。 */
export interface VernacularGloss {
  generated_by: string;            // "mock" | 模型 id
  grounded_on: string[];           // 依據的 PaliToken.token_id 清單（體現 grounding 關係）
  review_status: ReviewStatus;
  content: string;
}

/**
 * 對齊單位（§2.1）。三欄以 segment_id 為列對齊。
 * 注意：阿含對照已上移至 Passage（段落級）；Segment 只保留白話（L2，token 級）。
 */
export interface Segment {
  segment_id: string;
  pali_tokens: PaliToken[];           // 欄 A 渲染來源
  vernacular_gloss: VernacularGloss | null; // 欄 B 白話層（L2）；無則 null
}

/**
 * 段落（passage）：阿含對照的對齊單位。一個 passage 涵蓋多個 segment。
 * agama===null → 此段落無漢譯阿含平行 → 欄 B 顯示「此段無對應漢譯平行」（§2.3）。
 */
export interface Passage {
  passage_id: string;
  segment_ids: string[];           // 此段落涵蓋的 segment
  agama: AgamaParallel | null;     // L1，段落級；null = 無平行
}

/** 章節概要（L2）。 */
export interface SummaryCard {
  generated_by: string;
  grounded_on: string[];           // segment_id[]
  review_status: ReviewStatus;
  content: string;
}

/** 研經卡（L2）。 */
export interface StudyCardData {
  card_id: string;
  generated_by: string;
  review_status: ReviewStatus;
  title: string;
  sources: string[];               // segment_id[]，UI 可附「依據來源」
  content: string;
}

/** 整部經的 fixture 形狀（= 研經頁的輸入）。 */
export interface SuttaFixture {
  sutta: {
    id: string;
    title_pali: string;
    title_zh: string;
    collection: string;
    collection_zh?: string;
    source?: string;
  };
  segments: Segment[];
  passages: Passage[];             // 阿含對照（段落級，L1）
  summary: SummaryCard | null;
  study_cards: StudyCardData[];
  manifest?: {                     // 來源版本鎖定（A-5；原型可省略）
    dpd?: string; cbeta?: string; sc?: string; built_at?: string;
  };
}

// ---------------------------------------------------------------------------
// 2. 共用狀態（全部 lift 到 <StudyPage>）
//
//    狀態擁有權原則（§2.2）：跨欄同步的唯一真相來源放在 StudyPage，
//    子元件「讀 props、寫 callback」，欄與欄之間不互相查 DOM、不各自存狀態。
// ---------------------------------------------------------------------------

export interface StudyPageState {
  /** 點選黏著的 segment（sticky）。再點他處才解除。 */
  activeSegmentId: string | null;
  /** hover 暫態的 segment（transient）。離開即 null。 */
  hoveredSegmentId: string | null;
  /** 開著 DPD popover 的 token；null = 無 popover。 */
  selectedTokenId: string | null;
  /** 欄 B 漢譯白話（L2）全域開關，預設 false。 */
  glossLayerVisible: boolean;
  /** 欄 B 阿含對照（L1，段落級）開關，預設 false（摺疊）。 */
  agamaVisible: boolean;
  /** 欄 C 版面，由斷點推導（§1）。 */
  columnCLayout: ColumnCLayout;
}

/**
 * 衍生值：實際要高亮的 segment。hover 優先於 active。
 * 三欄渲染時都用這個比對 segment_id，確保同步。
 */
export type HighlightedSegmentId = string | null; // = hoveredSegmentId ?? activeSegmentId

// ---------------------------------------------------------------------------
// 3. 跨欄互動的 callback 契約（由 StudyPage 實作並下傳）
// ---------------------------------------------------------------------------

export interface SegmentInteractions {
  /** 點選 segment（sticky 切換）。傳 null 解除。 */
  onSegmentActivate: (segmentId: string | null) => void;
  /** hover 進出 segment（transient）。進入傳 id，離開傳 null。 */
  onSegmentHover: (segmentId: string | null) => void;
}

export interface TokenInteractions {
  /** 點巴利 token 開/關 DPD popover。傳 null 關閉。 */
  onTokenSelect: (tokenId: string | null) => void;
}

// ---------------------------------------------------------------------------
// 4. 元件 props（對應 §7 元件樹）
//    SegmentHighlightController 不是視覺元件，而是 StudyPage 內的狀態 + 上述 callbacks。
// ---------------------------------------------------------------------------

/** 根元件：載入 fixture、持有全部狀態、組裝三欄。 */
export interface StudyPageProps {
  fixture: SuttaFixture;
}

/** 頁首：經名、上/下一經、逐字白話全域開關。 */
export interface StudyHeaderProps {
  sutta: SuttaFixture["sutta"];
  glossLayerVisible: boolean;
  onToggleGloss: () => void;
  onPrev: () => void;             // 原型：disabled
  onNext: () => void;             // 原型：disabled
  hasPrev: boolean;              // 原型：false
  hasNext: boolean;              // 原型：false
}

/** 欄 A：巴利原文（純 L1）。 */
export interface PaliColumnProps extends SegmentInteractions, TokenInteractions {
  segments: Segment[];
  highlightedSegmentId: HighlightedSegmentId;
  selectedTokenId: string | null;
}

/**
 * 欄 B：漢譯白話（L2，segment 級）+ 阿含對照（L1，passage 級，可摺疊）。
 * 兩塊分離（DATA_PIPELINE §1）：白話從巴利生、token 級；阿含為另一傳本、段落級。
 */
export interface ChineseColumnProps extends SegmentInteractions {
  segments: Segment[];             // 提供 vernacular_gloss（L2）
  passages: Passage[];             // 提供 agama 對照（L1，段落級）
  highlightedSegmentId: HighlightedSegmentId;
  glossLayerVisible: boolean;      // 控制白話層（L2）顯隱
  agamaVisible: boolean;           // 控制阿含對照（L1，段落級）顯隱，預設摺疊
}

/** 欄 C：概要 + 研經卡（純 L2）。 */
export interface StudyColumnProps {
  summary: SummaryCard | null;
  studyCards: StudyCardData[];
  layout: ColumnCLayout;
}

/**
 * 列（三欄共用的對齊單位渲染）。
 * isHighlighted 由父欄以 highlightedSegmentId === segment.segment_id 算出。
 */
export interface SegmentRowProps extends SegmentInteractions {
  segment: Segment;
  isHighlighted: boolean;
}

/** 單一巴利 token（欄 A 內）。 */
export interface PaliTokenProps extends TokenInteractions {
  token: PaliToken;
  isSelected: boolean;            // = selectedTokenId === token.token_id
}

/**
 * DPD 詞條浮層（§4.2，portal）。
 * token.dpd_id===null 時，元件內部渲染「DPD 無此詞條」降級狀態。
 */
export interface DpdPopoverProps {
  token: PaliToken;
  anchorRect: DOMRect;            // 對齊被點 token 的位置
  onClose: () => void;           // 點外部 / Esc
}

// ---------------------------------------------------------------------------
// 5. 渲染分支對照（給實作者的提醒，非型別）
//
//   passage.agama === null                  → 欄B「此段無對應漢譯平行」佔位，不留白、不假造
//   token.dpd_id === null                   → DpdPopover 顯示「DPD 尚未收錄此詞」
//   token.ambiguous === true                → DpdPopover 標「多解」，可列 candidates
//   *.review_status === "draft"             → 加「未校稿」標記（DESIGN --draft）
//   任何 VernacularGloss / SummaryCard / StudyCardData（L2） → 一律掛 AI 徽章 + L2 材質（DESIGN §4）
//   glossLayerVisible === false             → 欄B 不渲染 VernacularGloss（白話）層
//   agamaVisible === false                  → 欄B 不展開阿含對照（L1，段落級），預設摺疊
//   provenance: canonical/commentarial/scholarly/ai → 各自視覺記號（DESIGN E-2 的 --prov-*）
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 6. 背景脈絡層 + 字典（CONTEXT_SPEC / LEXICON_PAGE_SPEC）
// ---------------------------------------------------------------------------

/** 帶出處的一條事實。背景層與專名詞條的基本單位（CONTEXT §3）。 */
export interface SourcedFact {
  provenance: Provenance;          // 四級出處,UI 據此標示
  content: string;
  source_ref?: string;             // 經段 segment_id / 學界引用 / DPPN 詞條
  note?: string;                   // 如「學界有不同說法」
  review_status?: ReviewStatus;    // 僅 provenance==='ai' 時有意義
}

/** 此經緣起（CONTEXT A，L1，從經文開頭結構化；provenance 恆 canonical）。 */
export interface SuttaContext {
  sutta_id: string;
  setting_place?: string;          // 地點(如 ukkaṭṭhā)
  audience?: string;               // 聽眾(如 bhikkhū)
  occasion?: string;               // 緣由
  derived_from: string[];          // 依據的 segment_id(可追溯回經文)
}

/** 人/地/事 實體詞條（CONTEXT B；DPPN）。 */
export interface EntityRef {
  entity_id: string;
  kind: "person" | "place" | "event";
  name_pali: string;
  name_zh?: string;
  dppn_ref?: string;               // DPPN 來源
  summary: SourcedFact[];          // 每條標出處(DPPN 混正典/註釋,須分流)
  occurrences: string[];           // 全藏出現 segment_id
  context_notes?: SourcedFact[];   // 時代背景(地點尤其,CONTEXT §2)
}

/** 時代/地點背景（CONTEXT C，per-period/per-place，非 per-segment）。 */
export interface BackgroundNote {
  id: string;
  scope: "period" | "place";
  title: string;
  facts: SourcedFact[];            // 政治地理/社會/思想/天災人禍,各標出處
}

/** 字典用法摘要（LEXICON §5；L2 任務 T4；僅高頻/要詞）。 */
export interface UsageSummary {
  generated_by: string;
  grounded_on: string[];           // 依據的出現 segment_id
  review_status: ReviewStatus;
  summary: string;
  senses?: { gloss: string; segment_ids: string[] }[];
}
// ---------------------------------------------------------------------------
