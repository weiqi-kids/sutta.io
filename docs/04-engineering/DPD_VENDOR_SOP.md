# DPD 辭典資料庫「下載→應用→刪除」SOP

> `pipeline/vendor/dpd.db`(約 2.1G)是離線管線 P3/P4 的 L1 權威來源(巴利屈折形 → lemma/字根/詞性),**線上網站用不到**——分析結果已烘進 `data/mn*.json`。為省磁碟,平時本機不保留;需要重跑管線時依本 SOP 取回、用完即刪。

## 什麼時候需要

- BACKLOG **J-3 觸發**(某經成為有流量主題的錨經,要補 L2)或任何要新增/重跑經文管線(`pnpm -C pipeline build` / `--only=dpd`)的時候。
- 只改 `site/`(前端呈現層)或 `content/`,**不需要**。

## 1. 下載(管線內建,通常不用手動)

`pipeline/src/run.ts` 的 `ensureDpdDb()` 會在 `dpd.db` 不存在時自動下載並解壓,直接跑管線即可:

```bash
cd /mnt/customer/sutta.io && pnpm -C pipeline build   # 或原本要跑的管線指令
```

手動等價指令(自動下載失敗時的備援;tag 以 `pipeline/src/config.ts` 的 `dpd_tag` 為準,並須與 `data/manifest.json` 的 `dpd` 版本一致,否則屬升版、另議):

```bash
cd /mnt/customer/sutta.io/pipeline/vendor
curl -sL -O https://github.com/digitalpalidictionary/dpd-db/releases/download/v0.4.20260531/dpd.db.tar.bz2
tar xjf dpd.db.tar.bz2
```

## 2. 應用

跑原本要跑的管線工作(產出寫入 `data/*.json`),確認產出無誤、`data/manifest.json` 的 `dpd` 版本正確。

## 3. 刪除(用完必做,站主定調)

```bash
rm -f /mnt/customer/sutta.io/pipeline/vendor/dpd.db \
      /mnt/customer/sutta.io/pipeline/vendor/dpd.db.tar.bz2 \
      /mnt/customer/sutta.io/pipeline/vendor/dpd.db-shm \
      /mnt/customer/sutta.io/pipeline/vendor/dpd.db-wal
```

注意:自動下載後 tarball 會留在 vendor/,所以刪除清單含 `.tar.bz2`;`-shm`/`-wal` 是 SQLite 讀取殘留。`vendor/dppn.xdxf`(約 1.3M)不在此列,保留。

## 沿革

- 2026-08-17:站主定調本機不常駐 dpd.db,改採本 SOP(當日已刪 db+tarball,釋出約 2.3G)。release URL 當日實測可下載(HTTP 200)。
