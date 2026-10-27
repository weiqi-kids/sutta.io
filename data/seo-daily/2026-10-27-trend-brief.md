# 外部搜尋趨勢自動優化 brief｜sutta.io｜2026-10-27

> 這份 brief 只回答「現在值得查證哪個題材」。趨勢詞不是法規依據，也不代表核准功效、產品推薦或個人適用性。

## 來源狀態
- Google Trends：正常（10 筆）｜https://trends.google.com/trending/rss?geo=TW
- Bing Webmaster：正常（100 筆）｜https://sutta.io/
- GSC 本站交叉證據：15 條目（2026-10-18..2026-10-24）

## 可進入自動內容優化佇列
### 1. 尼柯耶（分數 56｜refresh-existing-page）
- 訊號：／上升｜來源：Bing Webmaster。
- 對應頁面：[尼柯耶經藏](https://sutta.io/nikaya/)。
- 為什麼進佇列：本站 Google 搜尋位置正在上升或剛出現；對應既有頁面「尼柯耶經藏」。
- 安全自動化範圍：不自動改站台檔；只調整閱讀動線、入口或不含法規事實的文案。
- 來源查證：限量、公告字號、許可、警語、核准功效、用藥／孕哺／兒童等內容；未找到官方來源就不寫，自動流程直接跳過。
- 來源連結：[Bing Webmaster](https://sutta.io/)。

## 需要人工審核或暫不自動化的相關題材
無。

## 執行規則
- 符合 article-create-and-publish 的候選可由大腦建立獨立文章並自動發布；來源、內容與 build gate 任一失敗就不發布。
- 不得把熱門詞改寫成產品推薦或功效承諾。
- data/**、scripts/**、site/** 不在趨勢流程的自動化寫入範圍。
- 每次改動仍須通過站台既有 claims、copy、typecheck、test 與 build gates。
