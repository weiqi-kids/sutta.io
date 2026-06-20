# DATA_PIPELINE_SPEC.md — 資料管線規格

> 對應 BACKLOG A-1~A-5、B-1~B-7。落定資料模型那條岔路。
> 原則：L1 一律來自權威源、可追溯、不可由 LLM 生成或改寫。

---

## 0. 決策記錄（A 區，已拍板，可否決）

| ID | 決策 | 理由 |
|----|------|------|
| A-1 | **「漢譯阿含」與「漢譯白話」分離**（見 §1） | 阿含是另一古譯本，與巴利僅段落級平行；白話是從巴利生成的逐字解釋。混為一談會逼出做不到、且不誠實的逐字對齊。 |
| A-2 | surface→DPD **規則式消歧 + 歧義標記 + 人工複核；LLM 不參與 L1 語法判定** | L1 不可由模型決定。模型選 lemma 等於讓 L1 變生成內容，違反核心原則。 |
| A-3 | **V1 所有 L2 於 build-time 預生成，runtime 零 LLM** | 免金鑰 proxy、可全離線、成本可控、且所有 L2 上線前都人工校稿過（教義內容信任度最高）。對話/語意搜尋延到 V2。 |
| A-4 | 收錄集 = **中部 MN**（對應中阿含 T26，平行良好）；首個完整樣板選一部**有確定中阿含平行的代表經**，MN1 因平行有爭議僅作邊界測試 | 首版要能展示阿含對照，需挑平行紮實的經。 |
| A-5 | **版本鎖定**：釘住 dpd-db tag、CBETA 年版、SuttaCentral commit，寫入 build manifest | 可重現、可回歸。 |

---

## 1. 兩種「漢」的分離（本規格的核心）

```
巴利原文 (L1) ──逐字──> DPD token (L1: lemma/root/morph)
     │                        │
     │                        └──生成依據──> 漢譯白話 (L2，逐字，grounded on token)
     │
     └──段落級平行──> 漢譯阿含 (L1，CBETA，另一古譯本，可為 null)
```

| | 漢譯阿含 | 漢譯白話 |
|---|---|---|
| 是什麼 | 古代另一傳本（中阿含等） | 巴利的現代中文逐字解釋 |
| 層級 | **L1** 權威 | **L2** 生成 |
| 來源 | CBETA | LLM，依據巴利 token |
| 對齊粒度 | **段落級**（一段對多 segment，常分歧/缺） | **token 級**（因為就是從 token 生的） |
| 缺值 | 常 null（多數深層段落無平行） | 有巴利就能生 |
| 呈現 | 並排對照，標明「另一傳本」 | 鉛筆旁註材質（DESIGN §4） |

**這解掉了對齊難題**：不對阿含做逐字對齊（做不到也不誠實），只對「自己生成的白話」對 token（trivial）。

### 1.1 對既有規格的影響（需後續更新，已記入 BACKLOG）
- `study_page_types.ts`：`chinese`（阿含）應改為**段落級**附掛，非每 segment 一份；新增 passage 分組。`chinese_gloss`（白話）維持 segment/token 級。→ 新增 **B-8 型別修訂**。
- `STUDY_PAGE_SPEC §5` 欄 B：明確分「漢譯白話層(L2)」與「阿含對照(L1, 段落級, 可摺疊)」兩塊。→ 新增 **D-1a 欄B修訂**。
- `fixtures/mn1.json`：目前每 segment 配 `chinese` 是簡化；正式應反映段落級。

---

## 2. 來源與版本鎖定（A-5）

| 資料 | 來源 | 鎖定方式 |
|---|---|---|
| 巴利經文 + 分段 | SuttaCentral `bilara-data` | git commit |
| 巴利詞形/字根 | `dpd-db`（SQLite） | release tag |
| 漢譯阿含 | CBETA | 年版號 |
| 平行對照 | SuttaCentral parallels | 隨 bilara commit |

build 輸出一份 `manifest.json` 記錄上述版本 + build 時間，供可重現與回歸（H-2）。

---

## 3. 管線階段

```
P1 擷取巴利     bilara-data → segments[{id, pali_text}]
P2 斷詞         巴利分詞 → token surface 序列
P3 DPD join     每 surface 查 dpd-db → 候選解析
P4 消歧(§4)     候選→單一解析 + 歧義旗標；不確定送人工
P5 阿含平行     parallels API → 段落級 CBETA 對照(可 null)
P6 白話交棒     把 segment+token 交給 L2 管線(見 L2_GENERATION_SPEC)
P7 索引         全文 / lemma 索引(B-5)
P8 打包         合併成每部經預建 JSON(對齊修訂後型別)
P9 嵌入         算每段向量 → 靜態嵌入檔(離線語意搜尋,SEARCH §6a)
P10 策展重排    固定研經問題經 Claude Code/Sonnet 重排+校稿 → 靜態結果(L2 T5)
```

P1–P5、P7、P8、**P9 零 LLM**(P9 用嵌入模型,非生成)。P6、P10 為 build-time 生成,標 L2、待校稿。

### 3.1 嵌入步驟(P9)細節
- **語意表面**:對每段算嵌入時,輸入用**中文白話(已校稿)+ 英文 DPD 釋義**,非羅馬化巴利(巴利低資源,嵌入品質不確定)。向量仍指向該 segment_id。
- 輸出:`embeddings.bin`(可量化縮小),隨站打包;查詢期瀏覽器端小模型算查詢向量比對(離線)。
- 與 build 用的嵌入模型維度須一致;模型版本入 manifest(A-5)。

---

## 4. surface→DPD 消歧規則（A-2）

一個 surface 常對多個 DPD 解析。處理順序：

1. **先查 dpd-db 是否已附正典逐字解析**（DPD 對部分正典有現成 mapping）。有 → 直接採用，免自行消歧。*（此為待確認事項，列 B-3a。）*
2. 唯一候選 → 直接採用。
3. 多候選 → 規則式擇一：
   - 規則 a：偏好該經/語境高頻解析；
   - 規則 b：偏好與相鄰 token 語法相容者（如格位一致）；
   - 仍不決 → 標 `ambiguous:true`，保留全部候選，UI 在 popover 標「多解」。
4. **LLM 一律不參與此判定。** L1 語法事實不可由模型決定。
5. 歧義 token 全數進 golden 複核集（H-1），人工裁定後回填為權威。

> 輸出契約新增欄位（型別修訂 B-8）：`token.candidates?`, `token.ambiguous?`。

---

## 5. 輸出 JSON（修訂後形狀，差異處）

相對 study_page_types.ts 的增修：
```jsonc
{
  "segments": [{
    "segment_id": "...",
    "pali_tokens": [{ /* ...原欄位... */
      "ambiguous": false,
      "candidates": null          // ambiguous 時為候選陣列
    }],
    "chinese_gloss": { /* L2 白話，token 級，不變 */ }
  }],
  "passages": [{                  // 新增：段落級阿含對照
    "passage_id": "mn10:p1",
    "segment_ids": ["mn10:1.1","mn10:1.2"],
    "agama": { "source":"CBETA","ref":"T01n0026...","text":"..." } // 可 null
  }],
  "manifest": { "dpd":"...", "cbeta":"...", "sc":"...", "built_at":"..." }
}
```

---

## 6. 索引與嵌入檔格式（B-5 / P9;前端讀取契約）

build 期產生以下靜態檔,runtime 本地查詢,零後端。**格式為契約**,前端據此讀取。

### 6.1 全文索引 `index-fulltext.json`
反向索引,鍵為正規化詞(去變音/繁簡折疊),值為出現位置:
```jsonc
{ "model": "fulltext-v1",
  "postings": { "sati": [{"seg":"mn10:3.2","lang":"pi"}, ...],
                "正念": [{"seg":"mn10:3.2","lang":"zh"}, ...] } }
```

### 6.2 lemma 索引 `index-lemma.json`
```jsonc
{ "sati": { "forms": ["sati","satiṃ","satiyā"], "occurrences": ["mn10:3.2", ...] } }
```

### 6.3 surface 索引 `index-surface.json`
鍵為變音折疊後的字形 → token 定位:
```jsonc
{ "sati": [{"seg":"mn1:1.1","token":"t3"}, ...] }   // 折疊鍵,原形在 token 內
```

### 6.4 嵌入檔 `embeddings.bin` + `embeddings-meta.json`
🔒 build 與 client 須同模型同維度(BUILD §1)。
- `embeddings.bin`:緊湊 Float32(或量化 int8)向量序列,順序對應 meta 的 id 清單。
- `embeddings-meta.json`:
```jsonc
{ "model": "intfloat/multilingual-e5-small", "dim": 384, "dtype": "float32",
  "count": 1234, "ids": ["mn10:1.1","mn10:1.2", ...],
  "semantic_surface": "vernacular_gloss+en_gloss" }
```
查詢期:client 以同模型算查詢向量 → 與 bin 逐筆餘弦 → 取 top-N 的 ids(SEARCH §6a)。

### 6.5 策展結果 `curated/{sutta}.json`
T5 build 期重排+校稿後的靜態結果(SEARCH §6c):
```jsonc
{ "questions": [{ "q":"這部經在問什麼", "ranked":[{"seg":"mn1:2.2","reason_zh":"..."}],
                  "review_status":"approved", "generated_by":"..." }] }
```

所有索引/嵌入的模型與版本一併入 `manifest.json`(§2)。

---

## 7. 風險

| 風險 | 緩解 |
|---|---|
| 巴利斷詞錯誤連鎖污染 DPD join | golden 集驗證 P2/P3；錯誤可回溯 surface |
| 消歧規則過度自信 | 不決就標 ambiguous，寧可顯示多解，不猜死 |
| 阿含平行被誤當「巴利的翻譯」 | UI 明標「另一傳本」，段落級呈現，不逐字對齊 |
| 版本漂移致不可重現 | manifest 鎖版 + 回歸測試 |
