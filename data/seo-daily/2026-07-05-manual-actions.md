# 2026-07-05 手動介入紀錄（用戶指示加速收錄，非大腦層產出）

## 背景

用戶收到 07-04 紅綠燈報告後詢問「是否有優化空間、為何都沒流量」。盤點發現兩個可立即行動的訊號：

1. **服務帳號已升為 GSC `siteOwner`**（先前 2026-06-23 實測只是 `siteFullUser`，Indexing API 提交全被拒；用戶已在 GSC UI 補上擁有者授權）→ Indexing API 現在可用。
2. **GSC sitemap 最後下載時間停在 2026-06-29**，早於 07-03 主題頁上線——Google 從未看過含新頁的 sitemap，這解釋了 32 個追蹤頁全數「URL is unknown to Google」。

## 今日動作（協定 D+3 ping 提前一天執行，理由如上）

- `node scripts/seo-index-ping.mjs <35 URL>`：scoreboard 全部 33 個追蹤頁 ＋ `/topics/` ＋ `/en/topics/`，**35/35 提交成功**（type: URL_UPDATED）。
- GSC Sitemaps API 重新提交 `https://sutta.io/sitemap-index.xml`（HTTP 204），促使 Google 重新下載。

## 給大腦層（07-05 晚間起）的判讀提醒

- D+3（07-06）「未收錄頁全部 ping」已於今日提前完成，明日**不需重複 ping**（除非 07-06 抽查發現仍全數 unknown，可再 ping 一輪，Indexing API 配額 200/日，35 筆遠低於上限）。
- 後續每日抽查收錄狀態時，預期 07-06～07-08 應看到「unknown → Crawled/Indexed」的移動；若 07-08（D+5）仍大面積 unknown，屬異常訊號，值得 Slack 🟡。
- SA 已是 siteOwner，之後所有收錄相關動作（ping、URL inspection、sitemap 重提交）皆可程式化自動執行，不需再請用戶手動操作 GSC。

---

## 下午追加（用戶問「流量不足、為何比不上其他佛教網站」→ 三條建議全做）

競品實搜＋自站盤點後，執行三件事：

**① sitemap 內容稀釋修正（最大技術修正）**：發現 sitemap 11,120 URL 中 98.8% 是薄字典頁；lexicon/[key].astro 早標 noindex 但 sitemap 仍全收＝矛盾訊號（GSC 11030 submitted / 0 indexed）。改 astro.config.mjs 加 filter 對齊 noindex，並經用戶定案收緊門檻（只留有 usage∪entity 的 44 詞條）→ **sitemap 11,120 → 227**，真內容佔比 2%→~100%。模板 noindex 判準同步收緊（砍 occ≥3 一支）。

**② 主題頁加 DefinedTerm 結構化資料（AEO）**：topics/[slug].astro 既有 Article＋FAQPage，再加 DefinedTerm（詞＋原典白話定義），打「X 是什麼」查詢與 AI 引擎擷取。

**③ 情境化主題頁第一批 3 頁（draft，待校稿）**：依 TOPIC_WORKFLOW 產出 facing-fear/calming-angry-thoughts/facing-criticism（grounded on MN4/MN20/MN21，引文 segment_id 防捏造）；既有 6 頁補反向 related_topics 建雙向叢集。策略：攻老站（莊春江/法鼓山/維基）留下的生活情境查詢真空帶。

收錄推送：3 新頁 zh+en 6 URL＋/topics/ 已 index-ping（7/7）；sitemap 已重新提交（204）。

**給大腦層**：新 3 頁 review_status=draft（頁面標「人工校稿中」），**大腦層勿動其解說內文、勿自行轉 approved**（慣例 C1）；待用戶校稿。記分板已加 3 詞（S0，tier 5）＋6 頁。
