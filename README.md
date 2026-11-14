# TWETQ Podcast 本地版

TWETQ 是以 Podcast 為核心的台股資料研究工具。

## 快速開始

1. 下載或 clone 此 repository。
2. 雙擊 `start.bat`。
3. 開啟程式顯示的本機網址（預設為 <http://127.0.0.1:8787>）。

需要 Node.js 22 LTS 或更新版本。啟動程式使用 Node.js 內建模組，不需要額外安裝伺服器或登入任何帳號。

## 功能

- 查看最新一集 Podcast 摘要
- 瀏覽所有 Podcast 集數
- 查看 Podcast 逐字稿與專業分析
- 追蹤節目中提及的股票與產業

## 開發

```text
npm ci
npm run check
```

`public/`、`src/` 與 `styles/` 是網站程式、樣式與資產；`package.json` 與 `package-lock.json` 用於重現檢查環境。