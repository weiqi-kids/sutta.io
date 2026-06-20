# BACKLOG.md — 三藏研經網站 主工作清單

> 用途：全專案任務追蹤的單一真相來源。可照 ID 勾選、指派、排序。
> 狀態：✅完成　⬜待辦　🔶需決策(會擋下游)　⛔被擋(註明被誰擋)
> 排序原則：決策(A) 先於資料(B) 先於生成(C)/頁面(D)。設計(E)可並行。

---

## A. 決策（最優先：未拍板會讓下游白做）

| ID | 項目 | 狀態 | 說明 / 選項 |
|----|------|------|------|
| A-1 | **漢譯對齊策略** | ✅ | 已定:阿含(L1,段落級)與白話(L2,從巴利生)分離。見 DATA_PIPELINE §1。 |
| A-2 | surface→DPD 詞條消歧策略 | ✅ | 已定:規則式+歧義旗標+人工複核,LLM不參與L1。見 DATA_PIPELINE §4。 |
| A-3 | runtime 是否要 LLM | ✅ | 已定:V1全部build-time預生成,runtime零LLM。對話/語意搜尋延V2。 |
| A-4 | V1 首部經確認 | ✅ | 已定:中部MN(對應中阿含T26);首樣板選平行紮實之經,MN1僅邊界測試。 |
| A-5 | 資料版本鎖定 | ✅ | 已定:manifest鎖 dpd-db tag/CBETA年版/SC commit。見 DATA_PIPELINE §2。 |
| A-6 | MVP 內容範圍(首發幾部經) | 🔶 | 「先中部」已定,但首發1部/10部/全152未定。影響工作量與時程。 |

---

## B. 資料管線（DATA_PIPELINE_SPEC ✅ 已寫）

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| B-1 | 寫 `DATA_PIPELINE_SPEC.md` | ✅ | 已完成,落定資料模型岔路。 |
| B-2 | 巴利經文 + 分段擷取 | ⬜ | 自 SuttaCentral bilara-data,輸出 segment 結構。 |
| B-3 | 巴利 token + DPD join | ⬜ | A-2已解。每字接dpd-db,morph原始碼→人讀解碼(build期)。 |
| B-3a | 確認 dpd-db 是否已附正典逐字解析 | ⬜ | 若有則直接用,免自行消歧(DATA_PIPELINE §4.1)。 |
| B-4 | 漢譯阿含擷取(段落級) | ⬜ | A-1已解。CBETA取阿含,段落級對照,不逐字對齊。 |
| B-5 | 全文 / lemma 索引產生 | ⬜ | 供搜尋頁四種搜尋(本地靜態索引)。 |
| B-6 | 每部經預建 JSON 打包 | ⬜ | 合併成研經頁吃的單檔(對齊修訂後型別)。 |
| B-7 | 平行對照表擷取 | ⬜ | SuttaCentral parallels → 段落級對應表。 |
| B-8 | **型別修訂** | ✅ | study_page_types.ts:阿含→Passage段落級、白話→VernacularGloss、token加ambiguous/candidates;fixture同步並重驗一致。 |
| B-11 | 嵌入建置(P9) | ⬜ | build期算每段向量(語意表面=白話+英文釋義),輸出靜態嵌入檔。離線語意搜尋用。 |
| B-12 | 巴利斷詞/連音(sandhi)策略 | ⬜ | P2斷詞「怎麼做」未定;sandhi/複合詞切分是難點,錯則污染DPD join。候選:DPD deconstructor。 |

---

## C. L2 生成（L2_GENERATION_SPEC ✅ 已寫）

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| C-1 | 寫 `L2_GENERATION_SPEC.md` | ✅ | 已完成。 |
| C-2 | 漢譯白話 生成規格(T1) | ✅ | 已規格化:grounded on巴利token。 |
| C-3 | 章節概要/研經卡 規格(T2/T3) | ✅ | 已規格化。 |
| C-4 | 防護欄落地規格 | ✅ | 已規格化:可測判準(L2 §4)。 |
| C-5 | **字根/詞形 反矛盾驗證** | ✅ | 已規格化(L2 §5)。實作待 build。 |
| C-6 | `draft→approved` 校稿流程 | ✅ | 已規格化(L2 §6)。校稿工具待建。 |
| C-7 | Token 成本預算 | ⬜ | 方法已定(L2 §7),待實際segment數估算。 |
| C-8 | L2 生成腳本 + 校稿工具 實作 | ⬜ | 規格已備,待動工(build-time批次 + 本地審核頁)。 |
| C-10 | T4 用法摘要 回填 L2_GENERATION_SPEC | ✅ | 已補:任務表+T4 prompt+成本。 |
| C-11 | T5 策展重排(build期/Claude Code) | ⬜ | 固定研經問題經Sonnet重排+校稿固化成靜態(SEARCH §6c)。 |

---

## D. 頁面規格

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| D-1 | 研經頁規格 | ✅ | STUDY_PAGE_SPEC.md(版面/互動/狀態/驗收)。 |
| D-1a | 研經頁 欄B 修訂 | ✅ | STUDY_PAGE §2/§5 拆兩塊:白話(L2,segment)+阿含(L1,passage);popover加多解狀態。 |
| D-2 | 搜尋頁規格 | ✅ | SEARCH_PAGE_SPEC.md(四種L1搜尋+巴利變音輸入;語意搜尋V2)。 |
| D-3 | 字典頁規格 | ✅ | LEXICON_PAGE_SPEC.md(DPD詞條+concordance+用法摘要T4+DPPN專名)。 |
| D-4 | 對話研經 + 任意查詢生成式重排 | 🅥2 | 需runtime託管LLM。策展重排(固定查詢)已入V1(C-11);任意查詢留V2。 |
| D-5 | 導覽 / 目錄 / 經號編排 | ✅ | SITE_IA_SPEC.md(站點地圖/定址/瀏覽/導覽/交叉引用/深連結)。 |
| D-6 | 首頁 / 進入點 | ✅ | SITE_IA_SPEC.md §4(安靜入口+非官方聲明)。 |
| D-9 | i18n 字串外部化(實作) | ⬜ | V1繁中,字串表外部化備V2英文(SITE_IA §9)。 |
| D-10 | 語意搜尋實作(嵌入檢索+選配cross-encoder+策展問題) | ⬜ | **V1離線**(SEARCH §6/§7)。瀏覽器端小模型懶載。 |
| D-11 | 勘誤回報機制 | ⬜ | 讀者回報錯誤的路徑 + 修正回流流程(學術可信度需要)。 |

---

## E. 設計（可與其他並行）

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| E-1 | 設計工藝規格 | ✅ | DESIGN_SPEC.md(identity/字體/色彩/材質語言/狀態/a11y/文案)。 |
| E-2 | 設計 token 表(可實作對照) | ✅ | design-tokens.css(淺/深色完整、字體、間距、動態、四級出處視覺)。 |
| E-3 | 搜尋/字典頁 的設計延伸 | ⬜ | D-2/D-3已解。把材質語言套到這兩頁。 |
| E-4 | 元件視覺狀態清單 | ✅ | COMPONENT_STATES.md(各元件×各狀態→token)。 |

---

## F. 內容 / 編輯備料（不是規格,是實際備料）

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| F-1 | SuttaCentral 各譯文授權逐筆確認 | ⬜ | 目前只有checklist,需清出可用清單。 |
| F-2 | 教義詞彙對照表 | ⬜ | 無明/緣起…約定統一譯法,防LLM前後不一。 |
| F-3 | 署名(attribution)頁面呈現 | ⬜ | CC-BY要求:DPD/CBETA/SuttaCentral署名怎麼放。 |
| F-4 | 「非官方/獨立工具」聲明 | ⬜ | 站內明確標示,避免誤認官方。 |
| F-5 | 授權合規最終勾稽 | ⬜ | SPEC §9 清單全部打勾。 |
| F-7 | 嵌入模型授權確認 | ⬜ | 挑授權乾淨者(e5-small MIT/MiniLM Apache);避Gemma自訂條款的使用限制。 |
| F-8 | 合併授權 + share-alike 交互檢查 | ⬜ | DPD+CBETA皆CC BY-NC-SA;SA傳播到整包,需相容性檢查與整體授權定性。 |

---

## G. 基礎建設 / 上線

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| G-0 | 建置/部署/repo 規格 | ✅ | BUILD_SPEC.md(技術棧推薦+契約;索引/嵌入檔格式入DATA_PIPELINE §6)。 |
| G-1 | 靜態站骨架 + 部署(GitHub Pages) | ⬜ | 依BUILD_SPEC;Astro+islands(推薦)。 |
| G-2 | 字體自架 | ⬜ | Gentium Plus / 思源宋體 / Plex Mono 自host(離線+授權)。 |
| G-3 | LLM 金鑰 proxy | 🅥2 | A-3已定V1零runtime LLM,故V1不需;V2開對話/語意搜尋時才做。 |
| G-4 | 資料版本可重現性 | ⬜ | A-5已解。build輸出manifest標來源版次。 |

---

## H. 驗證 / 品質

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| H-0 | 測試策略規格 | ✅ | TEST_SPEC.md(契約/資料/L2/前端/搜尋各層 + CI)。 |
| H-1 | golden segment 回歸基準 | ⬜ | 依TEST_SPEC §2:~30–50段人工核過,存fixtures/golden/。 |
| H-2 | 資料管線回歸測試 | ⛔A-5,H-1 | 改版後比對golden,防退步。 |
| H-3 | 研經頁原型驗收 | ⛔(原型實作) | 跑STUDY_PAGE_SPEC §9 八條。 |
| H-4 | L2 抽樣人工品質審 | ⬜ | 生成內容的事實/教義抽查。 |

---

## J. 背景脈絡層（CONTEXT_SPEC ✅ 已寫）

| ID | 項目 | 狀態 | 說明 |
|----|------|------|------|
| J-1 | 寫 `CONTEXT_SPEC.md` | ✅ | 背景層:緣起/人地事/時代背景 + 四級出處標記。 |
| J-2 | 此經緣起(A) 抽取 | ⬜ | per-sutta nidāna(地點/聽眾/緣由),L1,從經文開頭結構化。 |
| J-3 | 人地事詞條 + DPPN 接入(B) | ⬜ | per-entity,公共領域DPPN,逐條標正典/註釋。與D-3字典頁同模式。 |
| J-4 | 在典天災人禍事件 標注 | ⬜ | DN16跋耆戰爭、滅釋迦族、飢荒瘟疫等在典事件;季風/雨安居環境事實。 |
| J-5 | 「早期佛典的世界」總覽頁(C) | ⬜ | **拉入V1**。頁結構已規格化(CONTEXT §5.1),待實作。 |
| J-6 | 出處四級標記 落型別+UI | ✅ | types新增Provenance+SourcedFact/EntityRef/BackgroundNote/SuttaContext/UsageSummary;視覺值入design-tokens。 |
| J-7 | 研究級來源標準 + 爭議標注(方法) | ✅ | **拉入V1**。SOURCING_STANDARD.md:四級引用、年代不寫死、爭議並陳不裁決;真實種子(佛陀年代等)。 |
| J-8 | 實際學界來源蒐集(內容備料) | ⬜ | 依SOURCING_STANDARD逐條蒐集具名引用,持續工作,非一次到位。 |

---

## I. 已完成（保留以免遺忘進度）

| ID | 項目 | 產出 |
|----|------|------|
| I-1 | 方向分析:巴利 vs 漢譯路線、LLM定位 | (對話結論) |
| I-2 | 總架構規格:三層資料分離 L1/L2/L3 | SPEC.md |
| I-3 | 研經頁頁面規格 + 契約決策回填 | STUDY_PAGE_SPEC.md |
| I-4 | 型別契約(資料/狀態/元件props) | study_page_types.ts |
| I-5 | 測試資料(觸發每個UI狀態) | fixtures/mn1.json |
| I-6 | 設計工藝規格 | DESIGN_SPEC.md |
| I-7 | 資料源初步調研(DPD/SuttaCentral/CBETA授權) | (對話結論,待F-1細化) |
| I-8 | A區五項決策拍板(A-1~A-5) | DATA_PIPELINE §0 |
| I-9 | 資料管線規格 | DATA_PIPELINE_SPEC.md |
| I-10 | L2生成規格(prompt/防護欄/校稿/成本法) | L2_GENERATION_SPEC.md |
| I-11 | 背景脈絡層規格 | CONTEXT_SPEC.md |
| I-12 | 搜尋頁規格 | SEARCH_PAGE_SPEC.md |
| I-13 | 字典頁規格 | LEXICON_PAGE_SPEC.md |
| I-14 | 整站IA規格 + UI語言決策(繁中/i18n-ready) | SITE_IA_SPEC.md |
| I-15 | T4回填 + 四級出處落型別 | L2_GENERATION_SPEC / study_page_types.ts |
| I-16 | 設計token表 + 元件狀態清單 | design-tokens.css / COMPONENT_STATES.md |
| I-17 | 研究級來源標準 + 背景層納入V1 | SOURCING_STANDARD.md / CONTEXT_SPEC(更新) |
| I-18 | 語意搜尋離線化(嵌入/重排/策展)落規格 | SEARCH/DATA_PIPELINE/L2_GENERATION(更新) |
| I-19 | 工程規格:建置/部署/repo + 測試策略 + 產物格式 | BUILD_SPEC / TEST_SPEC / DATA_PIPELINE §6 |
| I-20 | 文件整理成可交接開發包 | tipitaka-lens/ 結構 + README 導引 |

---

## 狀態圖例補充
🅥2 = 已定延後至 V2。

---

## 關鍵路徑提示（更新）
A 區決策已全部拍板,規格層大致完成。剩餘重心轉向**實作與備料**:
1. **B-8 型別修訂 + D-1a 欄B修訂**:把 A-1 的「兩種漢」拆分回填進契約與研經頁規格(小而必要,避免實作時不一致)。
2. **B-3a**:先確認 dpd-db 是否已附正典逐字解析——結果決定 B-3 消歧工作量。
3. 之後 B(管線)、C-8(生成腳本)、G(上線)可並行;F(備料)、H(golden集)隨時可起。
4. 純規格剩 **D-2 搜尋頁、D-3 字典頁、E-2 設計token表**,彼此獨立可任意排。

> 建議下一步:B-8 + D-1a 一起收(把「兩種漢」拆分落回契約與研經頁),讓四份既有文件與新決策完全一致,再進實作。
