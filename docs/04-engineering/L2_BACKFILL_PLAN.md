# L2_BACKFILL_PLAN.md — 補完 10 部「有經無白話」的經（2026-07-05 立案）

> 執行方法以 `L2_SUBAGENT_WORKFLOW.md` 為準（sonnet sub-agent、l2-batch-dump→翻→l2-batch-merge、≥98% 覆蓋）。
> 本檔只定「做哪些、順序、驗收」。相關記憶：[[sutta-io-l2-via-sonnet-subagent]]、[[sutta-io-push-and-run-autonomy]]、[[communicate-traditional-chinese-taiwan]]、[[sutta-io-topics-system]]。

## 為什麼做這個（背景）

2026-07-05 盤點資料底盤：45 部經檔中 **34 部白話完整、mn8 差 14%、10 部有巴利骨架但白話全空**。
這 10 部**已經 fetch 進來（巴利＋段落結構都在）、只差 L2 白話沒生**，且都是重量級經。補完它們＝
一步餵飽三條線：①每部＝一個 `/read/mnXX` 可收錄研經頁（吃「XX經 白話」長尾）②解鎖被材料卡住的
主題頁 ③AEO 引用素材。這是「把半成品做完」，投報率高於往 mn43+ 擴新經（那是 pipeline-fetch 大工程、次優先）。

## 目標清單（10 部＋mn8 收尾）

按「流量 × 解鎖價值」排序，**建議分三波**，每波跑通驗收再進下一波：

### 第一波（最高價值，先跑通確認品質）
| 經 | 名稱 | 段數 | 解鎖什麼 |
|---|---|---|---|
| mn36 | 薩遮迦大經 Mahāsaccaka | 358 | 佛陀成道自述（苦行→中道→三明）→ 新主題「佛陀怎麼開悟」「中道 由來」 |
| mn38 | 愛盡大經 Mahātaṇhāsaṅkhaya | 443 | 渴愛與識、緣起 → 解鎖之前卡住的「渴愛止息」主題 |
| mn28 | 象跡喻大經 Mahāhatthipadopama | 164 | 四界＋「見緣起即見法」→ 補強 dependent-origination 叢集 |

### 第二波
| mn35 | 薩遮迦小經 Cūḷasaccaka | 233 | 無我論辯 → 解鎖「無常/無我」延伸 |
| mn27 | 象跡喻小經 Cūḷahatthipadopama | 199 | 完整漸次修行 |
| mn29 | 心材喻大經 Mahāsāropama | 179 | 修行目的、勿停枝葉 |
| mn30 | 心材喻小經 Cūḷasāropama | 161 | 同上（小經） |

### 第三波
| mn39 | 馬邑大經 Mahā-assapura | 189 | 漸修次第 |
| mn32 | 牛角林大經 Mahāgosiṅga | 166 | 僧團理想 |
| mn33 | 牧牛者大經 Mahāgopālaka | 116 | 十一種牧牛喻→比丘 |
| mn8（收尾）| — | 差 ~14% | 補齊 mn8 未完成的段（含之前發現的 12.25「資料不足」等） |

總計約 2,300+ 段。sonnet subagent 每批 ~20 段、可一則訊息併發多批多經 → 實際很快。

## 每部經的步驟（照 L2_SUBAGENT_WORKFLOW）

1. **L1 已存在**（data/mnXX.json 已有巴利，跳過 fetch）。
2. `node scripts/l2-batch-dump.mjs mnXX 20` → /tmp/l2-batch-mnXX.json（分批）。
3. **派 sonnet Agent 翻**（model:"sonnet"，prompt 用 L2_SUBAGENT_WORKFLOW 末的範本，補該經背景一句）；**一則訊息內多個 Agent 併發**翻不同批/不同經。
4. agent 回傳 JSON 存檔 → `node scripts/l2-batch-merge.mjs mnXX /tmp/out-mnXX-N.json`（只寫存在且未有白話的段、grounded_on=token、防捏造）。
5. 重複 2–4 到覆蓋 ≥98%：`node scripts/run-all-progress.mjs` 查。
6. **概要＋研經卡**（L2_SUBAGENT_WORKFLOW step 5）：派 sonnet 產 summary（150–250字）與 study_cards，寫進 data/mnXX.json。
7. **標題**：這 10 部目前 `title_zh/title_pali` 為空 → 起草時一併補（來源見 pipeline SUTTA_TITLES／content/seo/sutta-seo.json，照既有完整經格式）。

## 每波收尾（重建＋上線）

```bash
ALL=$(ls data/mn*.json | sed 's|data/||;s|\.json||' | paste -sd,)
SUTTAS="$ALL" pnpm -C pipeline exec tsx src/run.ts --only=index
SUTTAS="$ALL" pnpm -C pipeline exec tsx src/run.ts --only=embed
pnpm exec tsx scripts/validate-contract.ts && pnpm -C site build
git add -A && git commit -m "L2：補完第N波 <經號> 白話＋概要＋研經卡" && git push   # 常態授權
node scripts/seo-index-ping.mjs <本波 /read/mnXX/ 新頁>
```

## 驗收（每波）
- `node scripts/run-all-progress.mjs`：本波各經白話 ≥98%。
- `pnpm exec tsx scripts/validate-contract.ts` 綠、`pnpm -C site build` 綠。
- 各 `/read/mnXX/` 線上 200、標題正確、白話顯示、無「資料不足」殘留。
- 抽查：`node scripts/sample-l2.mjs --sutta=mnXX` 讀幾段確認品質（不裁決教義、無捏造、台灣用語）。

## 補完後的下游（另立，不在本計劃內執行）
L2 補完後，這些主題頁材料就解鎖，屆時走 TOPIC_WORKFLOW 產（draft 由 session 自轉 approved，見 [[sutta-io-topic-draft-autoapprove]]）：
- 「佛陀怎麼開悟／中道的由來」← mn36
- 「渴愛止息／愛盡」← mn38
- 「無常 是什麼」延伸 ← mn35/22
- dependent-origination 叢集補強 ← mn28

## 紅線提醒
- L2 白話走 sonnet subagent＋l2-batch-merge（防捏造），**不用 claude -p**。
- T1 不變：巴利 L1 永不 AI 生成；白話是 L2、grounded on token、標 sonnet。
- 全程台灣繁中；push 已獲常態授權。
