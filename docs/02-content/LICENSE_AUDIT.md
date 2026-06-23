# LICENSE_AUDIT.md — 授權與合規稽核（BACKLOG F）

> 目的：對 sutta.io（原典研經庫）使用的每一項外部資料做一次**可執行**的授權稽核，
> 對兩個有約束力的 CC BY-NC-SA 授權做義務分析，並給維運者一份勾稽清單。
> 本檔為稽核結論，非法律意見；灰色地帶處標明**保守路線**與**風險**。
>
> 稽核日期：2026-06-23 ｜ 依據版本：當前 main 分支
> 稽核所據檔案：`site/src/pages/about.astro`、`site/public/llms.txt`、
> `site/src/i18n/zh-Hant.ts` / `en.ts`（footer + about）、`site/src/layouts/Base.astro`、
> `site/src/pages/read/[sutta].astro`、`site/src/pages/lexicon/[key].astro`。

---

## 1. 各來源授權表

| 來源 | 站上用到什麼 | 授權 | 須署名(BY) | 非商業(NC) | 相同方式分享(SA) | 連結 |
|---|---|:---:|:---:|:---:|:---:|---|
| **SuttaCentral / bilara-data**（Mahāsaṅgīti 底本） | 巴利原典文字、segment 分段 | 公共領域 / CC0（實質） | 否 | 否 | 否 | https://suttacentral.net |
| **Digital Pāḷi Dictionary（DPD）** | 逐字語法、字根、變化形、釋義、用法、DPD 編號 | **CC BY-NC-SA 4.0** | **是** | **是** | **是** | https://digitalpalidictionary.github.io |
| **CBETA** | 漢譯阿含（中阿含）對照經文 | **CC BY-NC-SA 3.0 Taiwan** | **是** | **是** | **是** | https://www.cbeta.org |
| **Malalasekera, DPPN**（透過 Bingenheimer glossaries） | 人地事專名 | 公共領域 | 否（建議署名） | 否 | 否 | https://github.com/mbingenheimer/buddhist_studies_glossaries |
| **intfloat/multilingual-e5-small** | 離線語意搜尋嵌入模型（build + 瀏覽器端） | MIT | 是（含授權文字） | 否 | 否 | https://huggingface.co/intfloat/multilingual-e5-small |
| **本站 L2/L3**（漢譯白話、概要、研經卡、用法摘要、策展重排） | AI 生成（claude-sonnet-4-6），grounded 於上述 | 站方自訂（見 §2.3 建議） | — | — | — | — |

**結論：只有兩個來源帶實質義務 — DPD（BY-NC-SA 4.0）與 CBETA（BY-NC-SA 3.0-TW）。** 其餘為公共領域或寬鬆相容授權（CC0 / PD / MIT），與 BY-NC-SA 相容、不增加新限制。

---

## 2. 義務分析（兩個有約束力的授權）

### 2.1 署名（BY）

**現況證據：**
- **站台頁尾（全站，`Base.astro` L245–246）**：`t.footer.sources` =「資料來源：SuttaCentral・DPD・CBETA・DPPN（皆具名、開放授權）」，`t.footer.rights` =「內容依各來源 CC BY-NC-SA／公共領域授權・非商業」。→ 全站每頁皆出現來源名稱與授權類別。
- **關於頁（`about.astro`）**：完整來源表（資料／來源連結／授權），逐項列出 DPD = CC BY-NC-SA 4.0、CBETA = CC BY-NC-SA 3.0 台灣，且各自帶**可點連結**回原始專案。另有授權段落明述 share-alike 與非商業立場，及一行「合規勾稽」。
- **llms.txt**：列出四來源 + 授權，供 LLM/爬蟲取用。
- **研經頁（`read/[sutta].astro` L55–58）**：DPD 與 CBETA 寫入 **JSON-LD `citation`** 結構化資料（機器可讀），但**非畫面可見文字**。
- **字典頁（`lexicon/[key].astro`）**：DPPN 專名帶**逐條可見**署名（L81「來源：…（公共領域）」）；但 **DPD 文法區塊（L85 起）沒有任何可見的「來源：DPD」行**——DPD 署名只靠全站頁尾。

**CC BY 的要求**：散布時須保留作者/授權標示，且署名須「以該媒介合理之方式」呈現。CC 4.0 明文允許以**連結至集中說明頁**的方式滿足署名（"may satisfy ... by providing a URI or hyperlink to a resource that includes the required information"）。BY-NC-SA 3.0（CBETA）類似，亦接受合理方式之署名。

**判定：**
- **站台層級署名：充足。** 全站頁尾 + 關於頁 + llms.txt 三重署名，名稱、授權、連結俱全，已超過 CC 4.0 最低要求。
- **逐頁署名（gap，低度風險但建議補）**：DPD/CBETA 屬於「實際在頁面上**呈現其資料**」的來源（字典頁顯示 DPD 文法、研經頁顯示 CBETA 阿含對照）。CC 並**未強制**逐頁署名（站內每頁皆有頁尾即可視為滿足），故**不構成違規**；但最佳實務（與站方自訂的 SOURCING_STANDARD「誰說的、出自哪」精神一致）是在**實際顯示該資料的區塊旁**加一行輕量署名：
  - 字典頁 DPD 文法區塊 → 加「文法・釋義：Digital Pāḷi Dictionary（CC BY-NC-SA 4.0）」（對齊現有 DPPN 的 `entity-src` 樣式）。
  - 研經頁阿含對照欄 → 加「漢譯阿含：CBETA（CC BY-NC-SA 3.0 台灣）」。
- JSON-LD citation 是加分，但**不可取代**人類可見署名；現有頁尾已補上人類可見部分。

### 2.2 非商業（NC）

**NC 條款的範圍**：限制的是**被授權素材（DPD 詞條、CBETA 經文）之散布／再散布不得「primarily intended for or directed toward commercial advantage or monetary compensation」**。NC 約束的是**素材的傳播行為**，**不是**「站台營運者能不能有成本」。維運自費跑伺服器、申請憑證、付 LLM API 費，皆非商業使用——NC 不禁止成本，禁止的是把（含）該素材的散布拿去換錢。

**現況：** 站台免費、無廣告、無付費牆、非任何官方/商業機構（`about.astro` 獨立工具聲明、頁尾 `unofficial`）。→ **目前合規。**

**風險點（須持續守住）：**
- **GA4 / 分析**：純流量分析**不**使 NC 失效（不向使用者收費、不販售該素材）。但若日後接**廣告聯播網**或將分析資料**商業化販售**，則整體散布染上商業性質 → 風險。目前無此情形。
- **未來 L3 付費 API（BACKLOG 提及）**：**最高風險項。** 若 L3 對外提供**付費**查詢，而回應中**夾帶或衍生自 DPD 詞條／CBETA 經文**，即構成「將含 NC 素材之散布用於金錢報酬」→ **直接抵觸 NC**。
  - 保守路線：L3 若要收費，**回應不得包含 DPD/CBETA 原文或其實質衍生**；或將付費功能限縮在「純 AI 解釋、不回傳受授權原文」的範圍，且仍須評估 SA（見 §2.3）。最安全是 **L3 維持免費**，或付費僅限不涉及 NC 素材的加值服務。
- **捐款／贊助**：接受無對價之捐款（非以提供素材換取）一般不視為商業使用；但**不可**做成「付費解鎖內容」。

### 2.3 相同方式分享（SA）——核心爭點

**SA 的觸發條件**：當你產生被授權素材的 **Adaptation（改作／衍生作品）** 並加以散布時，該衍生**必須**以相同或相容授權釋出。**關鍵在於：站上的產出是否構成 DPD / CBETA 的「改作」。** 分三類分析：

**(a) 直接呈現 DPD / CBETA 原文** — 字典頁的 DPD 文法表、研經頁的 CBETA 阿含對照。
- 這是**逐字重製（reproduction）**，不是改作；但散布重製品本身就受 BY-NC-SA 全部條款拘束（須署名、非商業，且**不得加上額外限制**）。
- 風險：若把 DPD/CBETA 原文置於**比 BY-NC-SA 更嚴格**的條款下（例如「保留所有權利」），即違反授權。→ 站方**不得**對含這些素材的頁面宣稱比 BY-NC-SA 更嚴的權利。

**(b) AI 漢譯白話／概要／研經卡「grounded on」DPD 形態學** — 本爭點的灰色核心。
- **站方立場（建議採納，保守）**：把這些產出**視為 DPD 的衍生／改作**，理由：站方自身的信任界線即「AI 必依據真實語法（DPD）生成、且可反查回 DPD 條目」（見 README、SOURCING_STANDARD §6、L2_GENERATION 反查規則）。當產出在事實層**不可與 DPD 切割**（拿掉 DPD 形態學就生不出該白話），把它當成「基於 DPD 的改作」是誠實且安全的歸類。
- **可主張的反面（風險論點）**：CC「Adaptation」指**改編、轉換、改作**原素材本身（如翻譯、改寫某詞條）。AI 用 DPD **作為事實依據**生出一段**新的**白話，類似「用字典查完字、自己寫一句翻譯」——產出的是站方**獨立著作**，DPD 提供的是**未受著作權保護的事實資訊**（字根、詞性、變化形多屬事實/資料，著作權保護薄弱），故**不必然**是衍生作品。這條路在學理上站得住，但**結果不確定**，且逐案而異（站方的散文釋義 vs DPD 的散文 gloss 若高度相似，仍可能落入衍生）。
- **判定（保守路線）**：**把整個衍生資料庫與 L2 內容一併以 `CC BY-NC-SA` 釋出**，以消除 SA 不確定性。這正是 `about.astro` 授權段現行立場——「其 share-alike 條款傳播至整個衍生資料庫，故本站衍生資料同樣以相同方式開放」。此立場**自願從嚴**，把法律灰色地帶轉成確定合規，代價極低（站台本就免費、開放），**建議維持**。
- **風險揭露**：若哪天站方想對 L2 內容**主張更嚴格的專屬權利**（例如全保留、禁止他人再用），則必須**先釐清** L2 是否為 DPD 衍生——若是，SA 不允許加嚴。在判明前，**不得**對 L2 宣稱比 BY-NC-SA 更嚴之權利。

**(c) 阿含對照「呈現」是否為 CBETA 衍生**
- 段落級並排對照 = **選取＋編排＋重製** CBETA 原文。重製受 §2.3(a) 拘束（須 BY-NC-SA、署名、非商業）。**編排（對照表）**可能構成 CBETA 的 Adaptation／或站方的彙編著作；無論哪種，**最安全做法同樣是整體掛 BY-NC-SA**，避免爭議。

**SA 對「整站」的傳染性**：
- SA **不會**把站台的程式碼（Astro/TS 原始碼）變成 CC BY-NC-SA——**程式碼與內容是可分離的兩層**。SA 只及於**含 DPD/CBETA 素材或其改作的「內容／資料庫」**，不及於不含該素材的引擎程式。
- 但**內容層**（字典頁、研經頁的 DPD/CBETA 顯示與 AI 衍生）應整體以 **CC BY-NC-SA** 釋出。

**SA 最終建議：站台「內容」採 `CC BY-NC-SA 4.0`**（4.0 與 CBETA 的 3.0-TW 相容方向：CC 官方相容機制允許以 BY-NC-SA 4.0 散布含 3.0 素材的改作）。程式碼可另採開放授權（如 MIT/AGPL，由站方自決），與內容授權分開聲明。

---

## 3. 合規勾稽清單（可執行）

**已滿足（附證據）：**
- [x] 全站頁尾列出四來源名稱 + 授權類別 + 非商業聲明（`Base.astro` L245–246；`zh-Hant.ts`/`en.ts` footer.sources/rights）。
- [x] 關於頁完整來源表，DPD/CBETA 授權逐項標明且帶可點連結（`about.astro` L26–60）。
- [x] 關於頁授權段明述 share-alike 傳染至衍生庫、站台非商業、衍生同以相同方式開放（`about.astro` L69–76）。
- [x] llms.txt 對機器讀者列出來源 + 授權（`llms.txt` L19–23）。
- [x] DPPN 專名於字典頁逐條可見署名（`lexicon/[key].astro` L81）。
- [x] DPD/CBETA 寫入研經頁 JSON-LD citation 結構化資料（`read/[sutta].astro` L55–58）。
- [x] 站台目前無廣告／無付費牆／非商業機構（`about.astro` 獨立聲明；頁尾 unofficial）。→ NC 合規。
- [x] e5-small（MIT）已在關於頁列出並標 MIT。

**已補完（2026-06-23）：**
- [x] **逐頁署名 DPD**：字典頁 DPD 文法區塊行內署名「Digital Pāḷi Dictionary（CC BY-NC-SA 4.0）」（`lexicon.grammarSrcName`，連 digitalpalidictionary.github.io）。
- [x] **逐頁署名 CBETA**：研經頁阿含對照欄行內署名「漢譯阿含對照：CBETA（CC BY-NC-SA 3.0 TW）」（`study.agamaSrc`，連 cbeta.org；ChineseColumn.tsx）。
- [x] **明確聲明站台「內容」授權**：頁尾 `contentLicense`=「本站內容（白話／概要／研經輔助）採 CC BY-NC-SA 4.0 釋出」（`Base.astro` L247）。
- [x] **NC 紅線寫入治理文件**：`COMPLIANCE_GOVERNANCE.md` R1（NC）、R4（譯文）等紅線 + 變更複查 checkpoint。

**待辦（open）：**
- [ ] **程式碼授權與內容授權分離聲明**：repo 尚無 `LICENSE` 檔；對外開源時須以 `LICENSE` 區分「程式碼授權（站方自決）」與「內容授權（CC BY-NC-SA 4.0）」，避免 SA 被誤讀為傳染至程式碼。（治理紅線 R2 已要求分離，待落為 LICENSE 檔。）
- [ ] **CBETA 署名格式精修（建議，非強制）**：行內已連 cbeta.org 首頁且內容含經號；可進一步深連至 CBETA 對應經目 URL（加分項）。
- [ ] **持續確認非商業**：每次新增功能（尤其分析、API、捐款）對照 §2.2 / `COMPLIANCE_GOVERNANCE.md` R1，確保不觸碰 NC。

---

## 4.「逐譯文授權」問題（BACKLOG 可據此關閉）

**問題**：SuttaCentral 託管大量譯文，各譯文授權不一（CC0、CC BY-NC、CC BY-SA、全保留……），逐譯文稽核工程浩大。

**本站事實認定**：
- 本站**只使用 SuttaCentral 的 Mahāsaṅgīti 巴利「原典」（root text）＋ 其 segment 分段**——該底本為**公共領域 / CC0**，無逐譯文授權問題。
- 本站的漢譯白話、概要、研經卡等是**站方自行 AI 生成**（claude-sonnet-4-6），**並未採用 SuttaCentral 的任何英譯／漢譯人工譯文**。此點已於 `about.astro` L61–65 明文聲明：「漢譯白話、概要、研經卡、用法摘要、策展重排為本站 AI 輔助生成……非採用任何第三方人工譯文，故無第三方譯文授權牽涉。」
- 漢譯對照採用的是 **CBETA 阿含**（已在 §1/§2 稽核），**非** SuttaCentral 的譯文。

**結論**：**SuttaCentral 逐譯文授權稽核對本站 N/A**（僅用 CC0 原典 + 自有 AI 譯文 + CBETA 阿含）。BACKLOG F 中「per-translation 授權」一節**可標記為不適用並關閉**，唯一須持續守住的前提是：**站方不得日後改採 SuttaCentral 的人工譯文而未重做逐譯文授權稽核**——此前提建議寫入治理文件作為紅線。

---

## 5. 一句話結論

兩個有約束力的授權（DPD BY-NC-SA 4.0、CBETA BY-NC-SA 3.0-TW）的**署名與非商業義務目前已合規**（站台層級署名充足、站台非商業）。**SA 是唯一灰色地帶**：採**保守路線——將站台「內容層」明確以 CC BY-NC-SA 4.0 釋出**，即可把不確定性轉為確定合規。**主要待辦**為：明寫站台內容授權版本、把 L3 收費對 NC 的紅線寫入治理、以及（建議性）在實際顯示 DPD/CBETA 的頁面加逐頁可見署名。SuttaCentral 逐譯文授權對本站 **N/A**。
