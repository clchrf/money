# 極簡記帳

Mobile first 的極簡記帳 Web App。核心是一件事：**打開 → 輸入金額 → 選分類 → 完成**。

介面以 iOS 的質感為目標：大量留白、清楚的層級、僅使用黑／灰／白，沒有任何彩色 accent、漸層或多餘裝飾。

## 特色

- **極速記帳** — 自製數字鍵盤，金額是畫面唯一主角，一次操作完成一筆
- **預算導向** — 總預算與分類預算，支援每月／每週週期，超支以灰階對比呈現而非警示色
- **固定支出** — 房租、訂閱等週期性支出，可設定自動記帳
- **完全純灰階** — 全 App 經程式化掃描驗證：0 個彩色值、無漸層
- **PWA** — 可加入 iPhone 主畫面，standalone 顯示並正確處理 safe area
- **深色／淺色／跟隨系統** — 兩個主題共用完全相同的版面數值

## 設計系統

所有元件共用一套 token（`src/index.css` + `src/ui/`）：

| 類別 | 說明 |
| --- | --- |
| Color | 語意化 token（bg / surface / primary / secondary / divider…），主題只換值不改版面 |
| Typography | 單一字級階梯（display → caption），金額依位數自動降階避免溢出 |
| Icon | 全部來自 [lucide-react](https://lucide.dev)，統一 stroke 與 optical size，無 Unicode 字元充當 icon |
| Touch target | 一律 ≥ 44×44px，視覺尺寸與點擊區分離 |
| Safe area | 讀進 `--safe-top` / `--safe-bottom`，可模擬裝置進行測試 |

## 技術

React 19 · TypeScript · Vite · Tailwind CSS v4 · lucide-react · vite-plugin-pwa

## 開發

```bash
npm install
npm run dev      # 開發伺服器
npm run build    # production build（含型別檢查）
npm run preview  # 預覽 production build
npm run lint     # oxlint
```

## 相容性

以 iPhone 15 Pro Max（430×932）為主要基準，並於 iPhone 15 Pro、14 與 SE 尺寸驗證：無水平捲軸、無內容進入 Dynamic Island、Tab bar 不被 Home Indicator 遮擋。

## 後端

Supabase（PostgreSQL + Row Level Security）。使用者透過匿名登入取得真正的 `auth.uid()`，不需註冊；每張表的 RLS policy 都比對 `auth.uid() = user_id`，隔離由資料庫強制，不是前端自律。Schema 見 `supabase/schema.sql`。

## Email 提醒

`supabase/functions/` 下兩個 Edge Function：

| Function | 觸發時機 | 內容 |
| --- | --- | --- |
| `send-reminders` | 每天 12:00、19:00（台北時間） | 當天還沒記帳的使用者才會收到 |
| `send-monthly-report` | 每月 1 號 09:00（台北時間） | 上個月的消費總覽 + 分類明細 |

寄信服務使用 [Resend](https://resend.com)。排程由 `pg_cron` + `pg_net` 觸發（見 `supabase/cron.sql`），service role key 存放於 Supabase Vault，不出現在任何原始碼或版控紀錄中。部署與排程設定步驟見該檔案開頭的註解。
