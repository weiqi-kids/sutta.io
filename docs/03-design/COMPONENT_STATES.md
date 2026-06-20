# COMPONENT_STATES.md — 元件視覺狀態清單（E-4）

> 每個元件 × 每個狀態 → 視覺處理(引 design-tokens.css)。實作與 QA 對照表。
> 涵蓋 STUDY_PAGE / SEARCH / LEXICON / CONTEXT 的元件。

---

## 研經頁

### PaliToken（欄 A，L1）
| 狀態 | 處理 |
|---|---|
| 預設 | `--ink` 暖墨、`--font-pali`、無底線 |
| hover | 底線提示可點 |
| selected | 進選取樣式 + 開 DpdPopover;`--thread` 點綴 |
| focus(鍵盤) | 清楚焦點環(`--thread`) |
| 觸控 | 可點區 ≥ `--tap-min` |

### SegmentRow（跨欄對齊列）
| 狀態 | 處理 |
|---|---|
| 預設 | 無高亮 |
| highlighted(hover/active) | 三欄同列 `--thread` 極細左緣 + 極淡暖底(焦點之線);`--motion-bind` |

### DpdPopover
| 狀態 | 處理 |
|---|---|
| 正常 | DPD 欄位完整,`--font-data` 顯 morph/id;`--motion-popover` 淡入 |
| 無詞條(`dpd_id===null`) | 「DPD 尚未收錄此詞」,不留白 |
| 多解(`ambiguous`) | 標「多解」,可展開 candidates |

### VernacularGloss（欄 B 白話,L2 / ai）
| 狀態 | 處理 |
|---|---|
| approved | `--margin` 冷灰、次字級、左 2px `--margin` 邊框、AI 徽章 |
| draft | 同上 + `--draft`「未校稿」標 |
| 關閉(glossLayerVisible=false) | 不渲染 |
| hover | 高亮其依據的欄 A token(grounding 關係) |

### AgamaParallel（欄 B 阿含,L1,passage 級）
| 狀態 | 處理 |
|---|---|
| 有 | `--ink` 暖墨正典材質、無徽章、標「另一傳本」 |
| `agama===null` | 「此段無對應漢譯平行」,不留白、不假造 |
| 摺疊(agamaVisible=false) | 不展開 |

### SummaryCard / StudyCard（欄 C,L2 / ai）
| 狀態 | 處理 |
|---|---|
| approved | L2 材質 + AI 徽章 + 來源清單 |
| draft | 加「未校稿」 |
| 無 | 該段不顯卡片,不佔位 |

---

## 搜尋頁

### SearchBar
| 狀態 | 處理 |
|---|---|
| 預設 | `--surface` + `--font-ui`;模式可切 |
| 輸入中 | 變音不敏感比對(顯示仍正確變音) |

### ResultItem（L1）
| 狀態 | 處理 |
|---|---|
| 正常 | 命中片段高亮(`--thread`)、巴利/中文各用對應字體、無徽章 |
| hover/focus | 可點提示 + 焦點環 |
| 無結果 | 引導文案,非空白、非道歉 |
| 語意結果(V2) | 獨立分區 + AI 徽章,不與 L1 混排 |

---

## 字典頁

### LexiconEntry（DPD,L1）
| 狀態 | 處理 |
|---|---|
| 正常 | 文法資料 `--font-data`、暖墨、無徽章 |
| 用法摘要 approved | L2 材質 + AI 徽章 + 依據 segment |
| 無摘要(非高頻字) | 摘要區「暫無」,L1 正常顯 |
| 查無 lemma | 平靜陳述 + 建議 surface 搜尋 |

### 消歧選擇（surface 多義） | 列候選 lemma + 簡義,選定再進詞條 |

---

## 出處 / 背景（CONTEXT,四級出處）

### ProvenanceBadge（四級,J-6 / design-tokens --prov-*）
| 級別 | 處理 |
|---|---|
| canonical 正典 | `--prov-canonical`(暖墨),無徽章,可跳經段 |
| commentarial 註釋 | `--prov-commentarial` 暖褐標記 |
| scholarly 學界 | `--prov-scholarly` 冷藍灰 + 具名來源 + 「有不同說法」 |
| ai | `--prov-ai` 冷灰 + AI 徽章 |

### EntityRef / BackgroundNote / SuttaContext 面板
| 狀態 | 處理 |
|---|---|
| 正常 | 每條 SourcedFact 帶對應 ProvenanceBadge |
| 此經背景面板 | 預設摺疊,可展開(不入逐 segment) |
| 無背景資料 | 不顯面板,不佔位 |

---

## 全站通用

| 狀態 | 處理 |
|---|---|
| 載入中 | 經文骨架以 `--rule` 淡線佔位,不用 spinner(DESIGN §7) |
| 麵包屑 / 導覽 | `--font-ui` + `--surface`,安靜退場 |
| 減量動態 | `prefers-reduced-motion` → 過場歸零(design-tokens 已處理) |
| 深連結進入 | 自動捲動 + 該 segment highlighted |
