# golden/ — 回歸基準（TEST_SPEC §2，H-1）

一組**人工核過**的 segment 當回歸哨兵：改管線/換資料版後重跑 → 與 golden 逐欄 diff →
有差異即 fail，人工確認是改善還是退步（H-2）。

## 內容要求（TEST_SPEC §2）
涵蓋常見字、複合詞、歧義（ambiguous）、無詞條（dpd_id null）、有/無阿含平行各數例。
每筆記錄正確的 lemma/root/morph、對齊、消歧結果。規模 ~30–50 段。

## 建立方式（待備料，H-1）
1. 從首發經（MN10）抽 ~30–50 段。
2. 人工核對 DPD 解析（特別是 ambiguous token 的擇一）。
3. 存為 `fixtures/golden/{sutta}.golden.json`，版本化。
4. 接回歸測試：`scripts/validate-golden.ts`（待實作）比對 `data/` 與 golden。

> 目前為佔位；golden 內容備料屬持續工作（與 L2 校稿、學界引用同為人工備料階段）。
