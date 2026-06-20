# TEST_SPEC.md — 測試策略

> 對應 BACKLOG H 區。把散在各規格的驗收條件 + golden 基準統整成一套策略。

---

## 0. 分層

| 層 | 測什麼 | 方式 |
|---|---|---|
| 契約層 | 產物形狀正確 | fixture/產物 ⟺ 型別 + JSON schema 驗證 |
| 資料層 | DPD join / 對齊正確 | golden segment 人工基準 + 回歸 |
| L2 層 | AI 沒亂講 | 反矛盾自動檢查 + 引用存在 + 人工抽審 |
| 前端層 | 頁面行為 | 各頁 §驗收 + 互動 + a11y + 離線 |
| 搜尋層 | 找得到 | 變音折疊 + 語意檢索健全性 |

---

## 1. 契約層（最先建,最便宜）

- **型別 ⟺ 資料**:沿用既有驗證(每個 segment/token/passage 欄位與 `study_page_types.ts` 比對,零漂移)。把它變成 CI 腳本,跑在 fixture 與每份 `data/` 產物上。
- **JSON schema**:由型別產 schema,驗所有 build 產物(經 JSON、索引、嵌入 meta)。
- **不變量**:如「每個 segment 必被某 passage 涵蓋」「ambiguous token 必有 candidates」「dpd_id===null 則相關欄位皆 null」。
- 任一不過 → build 失敗。

---

## 2. 資料層:golden segment（H-1）

🔒 一組**人工核過**的 segment 當基準:
- 內容:涵蓋常見字、複合詞、歧義(ambiguous)、無詞條(dpd_id null)、有/無阿含平行各數例。
- 每筆記錄正確的 lemma/root/morph、對齊、消歧結果。
- 規模:V1 首發經中抽 ~30–50 段足以當回歸哨兵。
- 存放:`fixtures/golden/`,版本化。

**回歸(H-2)**:改管線/換資料版後重跑 → 與 golden 逐欄 diff → 有差異即 fail,人工確認是改善還是退步。

---

## 3. L2 層

- **反矛盾**(L2_GENERATION §5):T1/T4 輸出的詞性/字根不得與 DPD 衝突 → 自動比對,衝突退 draft。
- **引用存在**:輸出的 `grounded_on` / sources 每個 id 必存在於該經。
- **不捏經號**:輸出不得出現 context 未提供的經號。
- **人工抽審(H-4)**:approved 前抽樣查事實/教義中立;背景層另依 SOURCING_STANDARD 查出處與爭議標注。

---

## 4. 前端層

- **頁面驗收**:彙整各頁 §驗收(STUDY_PAGE §9、SEARCH §10、LEXICON §9、SITE_IA §10)為一份可勾清單。
- **關鍵互動**:跨欄高亮同步、點字 popover、深連結捲動+高亮、白話/阿含開關。
- **a11y**:巴利變音正確渲染(非豆腐)、對比 AA、鍵盤焦點、`prefers-reduced-motion`、token 觸控區 ≥ 32px。
- **離線**:斷網後核心閱讀/搜尋可用(BUILD §8.5)。
- **L1/L2 視覺分離**:抽查 L2 一律有 AI 徽章與冷灰材質,不混入正典。

---

## 5. 搜尋層

- **變音折疊**:`samadhi` 命中 `samādhi`;簡體命中繁體。
- **語意檢索健全性**:中文/英文查詢命中對應 segment(語意表面=白話+釋義);一組固定查詢→預期 segment 的 smoke test。
- **策展問題**:點擊載入預排+審過結果。

---

## 6. CI 整合（建議）

| 觸發 | 跑 |
|---|---|
| 每次 commit | 契約層 + 不變量 + 前端單元 |
| 管線/資料變更 | + golden 回歸 |
| 生成後 | + L2 反矛盾/引用檢查(未過不得 approve) |
| 部署前 | + 金鑰掃描(BUILD §4) + 頁面驗收 smoke |

---

## 7. V1 不做

- 大規模 e2e 自動化、視覺回歸快照(🔧 可後補)。
- 任意查詢生成品質的自動評測(V2,屬 runtime LLM)。
