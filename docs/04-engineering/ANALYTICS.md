# 分析與站長工具識別碼（sutta.io）

> 供週報／數據自動化接入時取用。皆為公開或唯讀識別，**非機密**（金鑰/SA 私鑰不在此）。

## GA4
- **Measurement ID（收集端，已掛站）**：`G-N95VGGQD4V`
  - 接入處：`site/src/layouts/Base.astro`（gtag），由 repo Variable `PUBLIC_GA4_ID` 注入。
- **資源 ID / Property ID（Data API 讀取用）**：`542455353`
  - Data API 路徑：`properties/542455353`

## Google Search Console
- **資源型態**：網域（Domain property）`sutta.io`
- **API 資源字串**：`sc-domain:sutta.io`
- **驗證**：DNS TXT `google-site-verification=ylw505PrmOO3hNRc_BnwAkVAByKUVhAv_TK-x0SXF_E`
- **Sitemap**：`https://sutta.io/sitemap-index.xml`

## 唯讀服務帳號（由站長加入上述兩資源權限）
- `ga4-insights@yaocare.iam.gserviceaccount.com`（GCP 專案 yaocare）
  - GA4：檢視者(Viewer)；GSC：完整(Full)。自簽 JWT 唯讀拉數據。

## 接入週報（待定，見 repo 外的週報專案）
若 sutta.io 要進既有週報，於該報的設定加：
- GA4 property：`542455353`
- GSC 資源：`sc-domain:sutta.io`
（週報程式碼/服務帳號私鑰屬另一專案，不在本 repo。）
