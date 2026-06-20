# STUDY_PAGE_SPEC.md — 研經頁三欄前端原型規格

> 對應 SPEC.md §4.1、里程碑 2
> 原型目標：驗證**三欄版面 + 跨欄對齊互動 + 點字查 DPD + L1/L2 視覺界線**
> **純 L1、不接 LLM、不連網。** 所有資料（含假 L2）來自單一 fixture JSON。

---

## 0. 原型要回答的三個問題

1. 三欄在桌機/平板/手機怎麼塌、塌的優先序對不對？
2. 在一欄選一個 segment，其他兩欄能不能正確同步高亮？
3. 漢譯欄裡「原文(L1)」與「逐字白話(L2)」混在一起時，使用者能不能一眼分辨哪些是 AI 生成？

**不在原型範圍：** 真的呼叫 Sonnet、語意搜尋、對話側欄、搜尋頁、字典頁、多部經切換。原型只吃一部經（建議先一品/一經）的 fixture。

---

## 1. 版面與響應式

### 桌機（≥1024px）：三欄並排
```
┌─ Header（經名・品・上一經/下一經・模式切換）──────────────┐
├──────────────┬──────────────┬──────────────────────────┤
│  欄A 巴利原文 │ 欄B 白話+阿含 │  欄C 研經卡 / 概要         │
│  (L1)        │ 原文L1+逐字L2 │  (L2, mock)               │
│  可點 token  │ 可切逐字白話  │  可摺疊                    │
└──────────────┴──────────────┴──────────────────────────┘
```
- 欄寬建議 `40% / 35% / 25%`，欄 C 可收合成右側抽屜。

### 平板（640–1023px）：兩欄 + 抽屜
- 欄 A + 欄 B 並排；欄 C 變成右側可滑出抽屜（預設收合）。

### 手機（<640px）：堆疊 + 頁籤
- 頂部頁籤切 `巴利 / 漢譯 / 研經`；
- **巴利欄永遠是預設頁籤**（它是分析骨幹，不可被隱藏掉的那個）。

**塌縮優先序原則：欄 A(巴利) > 欄 B(漢譯) > 欄 C(研經卡)。** 空間不足先犧牲 C，再犧牲 B，巴利永遠在。

---

## 2. 對齊模型（這頁的核心）

### 2.1 三種顆粒度
| 顆粒度 | 單位 | 範圍 | 用途 |
|---|---|---|---|
| Segment | `segment_id`（如 `mn1:1.1`） | 巴利 + 白話 | 跨欄對齊 / 高亮同步 |
| Token | 巴利單字 | **僅欄 A** | 點字查 DPD |
| Passage | `passage_id`（涵蓋多 segment） | **阿含對照** | 段落級漢譯阿含對齊 |

- 巴利欄(A)與白話(B 的 L2 層)以 **segment 為列**對齊：同一 `segment_id` 同一橫列。
- **阿含對照(B 的 L1 層)以 passage 為單位**並排，一個 passage 涵蓋多個 segment——因為阿含是另一傳本，只能段落級對齊（DATA_PIPELINE §1）。
- Token 級互動只存在欄 A。欄 B 白話是 segment 內的 L2 註解層，不是獨立 token 對齊。

### 2.2 跨欄高亮同步
- hover 或 focus 任一欄的某 segment → 三欄同 `segment_id` 的列同步加高亮。
- 阿含為 passage 級：高亮某 segment 時，其所屬 passage 的阿含塊一併淡高亮。
- 點選（active）狀態黏住，再點別處才解除；hover 是暫態。
- 實作上由一個 `activeSegmentId` 狀態驅動三欄，不在欄之間互相 DOM 查詢。

### 2.3 缺對齊的降級（必做，不是邊角）
- 某 passage **`agama===null`** → 欄 B 阿含區顯示「此段無對應漢譯平行」，**不得留空、不得生假內容**。
- 某 segment 無白話 `vernacular_gloss` → 欄 B 白話層該列不渲染。
- 某 segment 無研經卡 → 欄 C 該段不顯示卡片，不佔位。

---

## 3. L1 / L2 視覺界線（產品死活，最優先）

| 內容 | 層級 | 視覺處理 |
|---|---|---|
| 巴利原文 + token | L1 | 標準字色、無徽章、實底 |
| 阿含對照（passage 級） | L1 | 暖墨正典材質、無徽章（CBETA 另一傳本） |
| 漢譯白話 / 用字說明（segment 級） | L2 | 冷灰鉛筆材質、帶「AI」徽章 + 左側強調邊框 + 極淡色底 |
| 章節概要 / 研經卡 | L2 | 整卡帶「AI」徽章 + 同一套 L2 色底 |

**鐵則：**
- L2 一律有 `AI` 徽章 + 一套**全站一致**的 L2 視覺記號（建議：左邊 2px 強調色邊框 + 淡背景），與 L1 在任何排版下都能區分。
- 漢譯欄是**混合欄**：原文 L1、白話 L2。原文與白話必須視覺分層——原文為主體字級、白話為次級附註樣式並掛徽章。**絕不可讓白話看起來像經文本身。**
- 原型額外驗證 **review 狀態**：`draft` 的 L2 內容多一個「未校稿」標記（淡黃），`approved` 則無。fixture 兩種都放，確認都顯示正確。

---

## 4. 欄 A：巴利原文（純 L1）

### 4.1 Token 互動
- 每個巴利字是可點 token。
- hover：底線提示可點。
- click：開 **DPD Popover**（§4.2），同時該 token 進入 selected 樣式。
- 行動裝置：tap 開 popover。

### 4.2 DPD Popover 內容（全部 L1，來自 dpd-db）
| 欄位 | 範例 | 缺值處理 |
|---|---|---|
| 表面形 surface | `dhammā` | — |
| 字典原形 lemma | `dhamma` | — |
| DPD id | `12345` | — |
| 字根 root | `√dhar` | 顯示「—」 |
| 詞形碼 morph（解碼為人讀） | `陽性·主格·複數` | — |
| 複合詞拆解 | `dhamma + ...` | 無則隱藏該列 |
| 簡義 gloss | `法、現象` | — |
| 全藏出現次數 | `1,234` | 原型可放 fixture 假值 |
| 「看完整詞條 →」 | 連 `/lexicon`（原型先 disabled） | — |

- **無 DPD 詞條**（`dpd_id===null`）：popover 顯示「DPD 尚未收錄此詞」，不留白、不亂猜。
- **多解**（`ambiguous===true`）：popover 標「多解」，顯示選定解析並可展開 `candidates` 其餘候選（A-2）。
- Popover 用 portal 浮層，點外部 / Esc 關閉，避免被欄寬裁切。

---

## 5. 欄 B：兩塊分離 — 漢譯白話（L2）+ 阿含對照（L1）

欄 B 不是「一份漢譯」，而是**兩種不同性質的漢**疊在一起（DATA_PIPELINE §1），務必分清：

### 5a. 漢譯白話（L2，從巴利生，segment/token 級）
- 巴利的**現代中文逐字解釋**，grounded on 欄 A 的 token（`vernacular_gloss.grounded_on`）。
- 控制鈕「顯示逐字白話」：開啟後在對應 segment 顯示，帶 AI 徽章與 L2 材質（DESIGN §4）。**預設關閉**，使用者主動開。
- hover 某段白話 → 高亮它依據的欄 A 巴利 token，體現「白話掛在巴利真實語法上」。
- `review_status==="draft"` → 加「未校稿」標記。

### 5b. 阿含對照（L1，CBETA，passage 段落級）
- **另一個古代傳本**（非巴利的翻譯），段落級並排，標明「另一傳本」。
- 控制鈕「顯示阿含對照」：**預設摺疊**，展開後以 passage 為塊顯示。
- 屬 L1：用正典材質（暖墨、無 AI 徽章）。
- `agama===null` 的 passage → 顯示「此段無對應漢譯平行」（§2.3），不留白、不假造。

### 5c. 兩塊的視覺關係
- 白話是 L2（冷灰鉛筆、從屬）；阿含是 L1（暖墨、正典）。**兩者材質相反**，使用者須能分辨「這是對巴利的白話解釋」與「這是另一部古譯本」。
- 兩塊各自獨立開關，可只開白話、只開阿含、或都開。

---

## 6. 欄 C：研經卡 / 章節概要（純 L2，mock）

- 頂部：章節概要卡（一張，L2）。
- 其下：研經卡若干（L2），每張可附「依據來源」清單（原型放 fixture 的 segment_id 列表）。
- 全部帶 AI 徽章 + L2 視覺記號 + review 狀態標記。
- 桌機常駐、平板抽屜、手機獨立頁籤。

---

## 7. 元件樹

```
<StudyPage>
  <StudyHeader />            經名・品・上/下一經・「逐字白話」全域開關・模式切換
  <ThreeColumnLayout>        響應式：3欄 / 2欄+抽屜 / 頁籤
    <PaliColumn>            欄A，L1
      <SegmentRow>          以 segment_id 對齊
        <PaliToken />       可點 → DpdPopover
    <ChineseColumn>        欄B，L1原文 + L2逐字層
      <SegmentRow>
        <ChineseText />     L1
        <GlossLayer />     L2，可切換、帶徽章
    <StudyColumn>          欄C，L2 mock
      <SummaryCard />      L2
      <StudyCard />        L2
  <DpdPopover />           portal 浮層
  <SegmentHighlightController />   驅動 activeSegmentId，同步三欄
```

狀態（最小集）：`activeSegmentId`、`selectedTokenId`、`glossLayerVisible`、`columnCLayout(inline|drawer|tab)`。**全部前端狀態，無任何網路請求。**

---

## 8. Fixture 資料契約

原型讀單一檔 `fixtures/mn1.json`，形狀對齊 SPEC.md §6.1/§6.2：

```json
{
  "sutta": { "id": "mn1", "title_pali": "Mūlapariyāya Sutta",
             "title_zh": "根本法門經", "collection": "Majjhima Nikāya" },
  "segments": [
    {
      "segment_id": "mn1:1.1",
      "pali_tokens": [
        { "token_id":"t1","surface":"Evaṃ","lemma":"evaṃ","dpd_id":11001,
          "root":null,"morph":"ind","morph_display":"不變詞",
          "compound":null,"gloss":"如是","freq":9999 }
      ],
      "vernacular_gloss": {
        "generated_by":"mock","grounded_on":["t1"],
        "review_status":"draft","content":"「如是」對應 evaṃ…" }
    }
  ],
  "summary": { "review_status":"approved","content":"本經說明…" },
  "study_cards": [ { "review_status":"draft","sources":["mn1:1.1"],
                     "content":"重點：…" } ]
}
```

### 8.1 契約決策（由 fixture 實作逼出，務必遵守）

1. **morph 拆兩欄：`morph`（原始碼，如 `pp.nom.sg.nt`）+ `morph_display`（人讀，如 `過去分詞·主格·單數·中性`）。**
   原始碼→人讀的解碼是**建置期**步驟，不在前端做。前端只渲染 `morph_display`，`morph` 保留供索引/除錯。

2. **「無資料」一律用 `null`，禁用空字串。** 兩個 `null` 是降級的觸發訊號：
   - `passage.agama: null` → 該段落無漢譯阿含平行 → 欄 B 顯示「此段無對應漢譯平行」（§2.3）。
   - `pali_token.dpd_id: null`（相關欄位亦 `null`）→ DPD 查無此詞條 → popover 顯示「DPD 尚未收錄此詞」（§4.2）。
   空字串 `""` 代表「有此欄位但內容為空」，與「沒有」語意不同，不可混用。

3. **provenance 標記**：fixture 以 `_fixture_notes` 標明哪些是真實 L1、哪些是 placeholder（dpd_id、freq、漢譯 ref 在原型階段皆為假值）。正式資料以此為界，placeholder 不得當權威事實使用。

---

## 9. 驗收條件（原型過關標準）

1. 桌機三欄、平板兩欄+抽屜、手機頁籤皆正確塌縮，巴利欄永不被隱藏。
2. 在任一欄 hover/點某 segment，三欄同列同步高亮，active 黏著、再點他處解除。
3. 點巴利 token 開 DPD popover，欄位完整；無詞條時顯示「DPD 尚未收錄此詞」；`ambiguous` 時標「多解」並可展開候選。
4. 欄B 阿含(L1,暖墨,passage級)與白話(L2,冷灰,segment級)材質相反、視覺可分；L2 一律帶 AI 徽章。
5. `draft` 內容顯示「未校稿」、`approved` 不顯示。
6. `agama:null` 的 passage 在欄 B 顯示「此段無對應漢譯平行」，無留白、無假內容。
7. 「顯示逐字白話」與「顯示阿含對照」各自預設關閉，可獨立開關。
8. 全程零網路請求（DevTools Network 應為空）。

---

## 10. 明確排除（原型不做，避免 over-build）

- 任何 LLM / API 呼叫（L2 全用 fixture 假資料）
- 搜尋頁、字典頁、對話側欄、語意搜尋
- 多部經導航資料（上/下一經先佔位 disabled）
- 連續閱讀模式（先只做 segment 對齊模式）
- 帳號、書籤、註解、深色/淺色以外的主題
