# TWETQ 本地版

TWETQ 是以 Podcast 為入口的台股資料整理與研究工具。支援的使用流程只有：

1. 下載或 clone 此 repository。
2. 雙擊 `start.bat`。
3. 開啟程式顯示的本機網址（預設為 <http://127.0.0.1:8787>）。

需要 Node.js 22 LTS 或更新版本。啟動程式使用 Node.js 內建模組，不需要額外安裝伺服器或登入任何帳號。網站查詢臺灣證券交易所與櫃買中心公開資料時需要網路；本機資料與快取會存放在未納入版本控制的 `.local-data/`。

開發與回歸檢查：

```text
npm ci
npm run check
```

`npm run refresh:tpex` 可在需要時更新 `public/data/tpex/` 的公開資料快照。`public/`、`src/`、`styles/` 與 `scripts/` 是網站程式、樣式、資產與檢查工具；`package.json` 與 `package-lock.json` 用於重現檢查環境。
