# AGENTS.md：城市旅遊指南

這份文件是給 AI 協作者看的專案說明書。開始修改任何檔案前，請完整讀完這份文件，並遵守裡面的規則。

## 1. 專案目的

城市旅遊指南是一個給台灣旅客使用的靜態網站。每座城市一頁，用完全相同的格式整理景點、美食、交通、每日預算與建議行程，讓使用者可以快速了解一座城市，也方便比較不同城市。

專案的核心設計是**內容與版面分離**：

- 城市內容全部放在 `data/cities/<id>.json`
- 版面只有 `index.html` 與 `city.html` 兩個模板，由 `assets/app.js` 讀取 JSON 後產生畫面
- 新增城市時，只需要新增一個 JSON 檔並登記，**不需要寫任何 HTML、CSS 或 JavaScript**

## 2. 技術原則

- 純靜態網站：HTML、CSS、原生 JavaScript，部署在 GitHub Pages
- 不使用任何框架、套件管理工具或建置步驟，不要新增 package.json、React、Tailwind 等
- 唯一的外部資源是 Google Fonts 的 Noto Sans TC 與 Noto Serif TC
- 所有放進 HTML 的資料都必須經過 `app.js` 裡的 `esc()` 函式跳脫
- 本機預覽要用 `python -m http.server` 開啟，直接雙擊 HTML 檔會因為瀏覽器限制讀不到 JSON

## 3. 檔案結構

```
travel-city-guide/
├── AGENTS.md                     專案規則，也就是這份文件
├── CLAUDE.md                     指向 AGENTS.md
├── README.md                     給人看的專案介紹
├── index.html                    首頁：城市列表與地區篩選
├── city.html                     城市頁模板，用 ?id=<城市代號> 決定顯示哪座城市
├── assets/
│   ├── style.css                 全站唯一的樣式表
│   └── app.js                    全站唯一的程式
├── data/
│   ├── cities.json               城市登記表，決定首頁顯示哪些城市與順序
│   └── cities/<id>.json          每座城市一個資料檔
├── templates/
│   └── city.template.json        新增城市時複製的範本
├── scripts/
│   └── validate.py               檢查所有城市資料是否符合規則
└── .github/workflows/validate.yml  每次 push 自動執行檢查
```

### 命名規則

- 城市代號 `id` 使用英文小寫，多個單字用 `-` 連接，例如 `tokyo`、`ho-chi-minh`、`new-york`
- 資料檔名必須是 `<id>.json`，而且和檔案內的 `id` 欄位完全相同
- 不要新增其他 HTML 頁面來放城市內容，所有城市都共用 `city.html`

## 4. 網頁風格

整體風格是**旅行手帳與登機證**：米色紙張底色、白色卡片、虛線分隔、深色文字，搭配每座城市自己的主題色。

| 項目 | 規則 |
|---|---|
| 底色 | `--paper: #f6f1e7` |
| 卡片 | `--card: #fffdf8`，圓角 14px，柔和陰影 |
| 文字 | `--ink: #1f2a37`，次要文字 `--muted: #6b7280` |
| 標題字體 | Noto Serif TC 粗體 |
| 內文字體 | Noto Sans TC |
| 城市主題色 | 由 JSON 的 `theme_color` 決定，城市頁會自動套用到頂部色塊、標題色條、預算長條 |
| 分隔線 | 虛線 `1px dashed var(--line)` |

規則：

- 所有顏色、字體、圓角都只能使用 `style.css` 最上方 `:root` 定義的變數，不要在其他地方寫死新顏色
- 新城市的 `theme_color` 要選中等明度、能讓白字清楚顯示的顏色，並且不能和現有城市重複
- emoji 只用在城市圖示、交通區塊標題、小提醒 💡 與地點 📍，不要在內文裡加 emoji

## 5. 頁面結構

### 首頁 index.html

1. 頁首：網站名稱與導覽
2. 主視覺：標語與收錄城市數量，數量由程式自動計算
3. 地區篩選按鈕：依城市資料中出現過的 `region` 自動產生
4. 城市卡片：登機證造型，顯示航線代碼、城市名、國家、一句話介紹、飛行時間、時差、標準每日預算
5. 頁尾

### 城市頁 city.html

區塊順序固定如下，**不可調換、刪除或新增區塊**：

1. 主視覺：城市 emoji、中英文名稱、國家、一句話介紹
2. 快速資訊：貨幣、語言、時差、飛行時間、最佳季節、插頭電壓
3. 頁內目錄
4. 城市簡介 `#intro`
5. 必去景點 `#spots`
6. 在地美食 `#food`
7. 交通方式 `#transport`
8. 每日預算 `#budget`
9. 建議行程 `#itinerary`
10. 旅遊提醒 `#tips`
11. 上一個與下一個城市的切換按鈕、資料更新日期

如果真的需要新增一個區塊給所有城市使用，必須同時修改 `app.js`、`style.css`、`templates/city.template.json`、`scripts/validate.py`、所有既有城市 JSON，以及這份文件的第 5 節與第 6 節。

## 6. 城市資料格式

範本在 `templates/city.template.json`。每個欄位的規則如下，`scripts/validate.py` 會自動檢查標記 ✔ 的項目。

| 欄位 | 內容 | 規則 |
|---|---|---|
| `id` | 城市代號 | ✔ 英文小寫，和檔名相同 |
| `name` / `name_en` | 中文與英文名稱 | ✔ 必填 |
| `country` | 國家中文名稱 | ✔ 必填 |
| `region` | 地區 | ✔ 只能是 東北亞、東南亞、歐洲、北美洲、大洋洲、其他 |
| `emoji` | 城市代表圖示 | ✔ 一個 emoji |
| `theme_color` | 主題色 | ✔ `#RRGGBB`，不可和其他城市重複 |
| `tagline` | 一句話介紹 | ✔ 30 字以內，不加句號 |
| `intro` | 城市簡介 | ✔ 60 到 150 字，兩到三句 |
| `quick_facts` | 六項快速資訊 | ✔ 六個欄位都必填；`time_diff` 固定寫成 比台北快 1 小時、比台北慢 1 小時 或 和台北相同 |
| `spots` | 必去景點 | ✔ 4 到 6 個，每個都有 name、area、desc、tip |
| `food` | 在地美食 | ✔ 3 到 5 個，每個都有 name、desc、where |
| `transport` | 交通 | ✔ airport、city、pass 三段都必填 |
| `budget.per_day_twd` | 每日預算台幣 | ✔ save、standard、comfort 三個正整數，由小到大 |
| `budget.notes` | 預算說明 | ✔ 開頭必須是 不含機票 |
| `itinerary` | 建議行程 | ✔ 2 到 5 天，day 從 1 開始連續編號，每天 2 到 5 個項目 |
| `tips` | 旅遊提醒 | ✔ 2 到 5 則 |
| `updated` | 資料更新月份 | ✔ `YYYY-MM` |

## 7. 內容撰寫規範

- 使用繁體中文與台灣用語，例如 捷運、計程車、悠遊卡、台幣
- 讀者是第一次去這座城市的台灣旅客，語氣親切、實用，不要寫成百科全書
- 數字與中文之間加半形空格，例如 約 3 小時、NT$ 4,500
- 景點的 `desc` 說明這裡是什麼，`tip` 只放一個具體、可以照做的建議，例如最佳時段、要預約、服裝規定
- 美食寫的是一類料理或在地特色，不寫特定餐廳名稱，因為店家容易倒閉或搬遷
- 預算是每人每天的花費，包含住宿、餐飲、市區交通與門票，不含機票與購物
- 價格、票券、交通方式會變動，寫的時候用 約、起 等字眼，並更新 `updated`
- 不確定的事實寧可不寫，不要編造營業時間、票價或地址
- 不要在內容裡放外部連結和圖片網址，避免連結失效與版權問題

## 8. AI 工作流程

### 新增一座城市

使用者只會說：**新增城市 京都**。請依序完成：

1. 決定 `id`，例如 `kyoto`，確認 `data/cities/` 裡沒有同名檔案
2. 複製 `templates/city.template.json` 成 `data/cities/kyoto.json`
3. 依照第 6 節與第 7 節填寫全部欄位，挑一個和現有城市不重複的 `theme_color`
4. 把 `"kyoto"` 加到 `data/cities.json` 的 `cities` 陣列，同地區的城市放在一起
5. 執行 `python scripts/validate.py`，必須看到 ✅ 才算完成；出現 ❌ 就依訊息修正後再跑一次
6. 用 `python -m http.server` 開啟 `city.html?id=kyoto` 確認畫面正常
7. 在 README.md 的已收錄城市表格加上一列
8. commit 訊息格式：`新增城市：京都`

### 修改既有城市

- 只修改對應的 JSON，改完把 `updated` 改成當月，並執行驗證
- commit 訊息格式：`更新城市：<中文名稱> <改了什麼>`

### 修改版面或樣式

- 版面改動會影響所有城市，修改後要至少檢查兩座不同地區的城市頁，以及手機寬度 390px 的畫面
- commit 訊息格式：`調整版面：<改了什麼>`

### 禁止事項

- 不要為單一城市寫專屬的 HTML、CSS 或在 `app.js` 裡用 if 判斷特定城市
- 不要在 JSON 裡放 HTML 標籤，所有內容都是純文字
- 不要刪除或改名既有城市的 `id`，會讓別人分享的網址失效
- 驗證沒有通過時，不要 commit

## 9. 驗證與發布

- `python scripts/validate.py`：檢查格式、字數、數量、id 與檔名、登記表是否一致、主題色是否重複
- 每次 push 到 GitHub，`.github/workflows/validate.yml` 會自動執行同一個檢查
- GitHub Pages 設定為從 `main` 分支根目錄發布，push 後約一分鐘網站就會更新
- 網站網址：https://eva00921-prog.github.io/travel-city-guide/
