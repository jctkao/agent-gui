# workspace-panes Specification

## Purpose
定義 workspace panel 的分頁與分割模式，以及 browser/file/editor/terminal 四種 pane 的骨架 UI。

## Requirements

### Requirement: 分頁模式 tab 管理
在「分頁模式」下，workspace panel SHALL 顯示分頁列（tabbar），使用者可切換 active tab，每次只顯示一個 pane 的內容。

#### Scenario: 點擊 tab 切換
- **WHEN** 使用者點擊 tabbar 上的某個 tab
- **THEN** 該 tab 變為 active（底部無邊框、白色背景），對應的 pane 內容顯示，其餘 pane 隱藏

#### Scenario: Tab 初始狀態
- **WHEN** 應用程式啟動
- **THEN** TabBar 顯示四個 tab（Browser、Files、Editor、Terminal），Browser tab 為 active 狀態

---

### Requirement: 四種 pane 類型的骨架 UI
workspace panel SHALL 支援四種 pane 類型，scaffold 階段各類型顯示對應的骨架畫面：

- **browser** — URL 列 + browser overlay 佔位 div
- **file** — 專案檔案樹狀骨架（靜態假資料）
- **editor** — 程式碼行號 gutter + 文字列骨架
- **terminal** — 深色背景 + 模擬 prompt 文字

#### Scenario: Browser pane 骨架
- **WHEN** browser tab 被選中
- **THEN** 顯示含 URL 輸入列的 browser pane，中央區域為 overlay 佔位 div

#### Scenario: File pane 骨架
- **WHEN** file tab 被選中
- **THEN** 顯示帶有假資料的檔案樹狀結構（folder/file icons + 灰色 bar 骨架）

#### Scenario: Editor pane 骨架
- **WHEN** editor tab 被選中
- **THEN** 顯示帶行號 gutter 和程式碼骨架列的編輯器外殼

#### Scenario: Terminal pane 骨架
- **WHEN** terminal tab 被選中
- **THEN** 顯示深色（`#2a2a28`）背景，含模擬的 `$ ` prompt 與游標閃爍動畫

---

### Requirement: 動態新增 tab
TabBar 的 `+` 按鈕 SHALL 展開一個下拉選單，讓使用者選擇要新增的 tab 類型。

#### Scenario: 點擊 + 展開選單
- **WHEN** 使用者點擊 TabBar 的 `+` 按鈕
- **THEN** 展開下拉選單，顯示可選項目：「網頁」、「檔案總管」、「PowerShell」、「bash (WSL)」

#### Scenario: 選擇後新增 tab
- **WHEN** 使用者從下拉選單選擇一個項目
- **THEN** 對應類型的新 tab 出現在 TabBar 末端並成為 active

#### Scenario: 點擊選單外部關閉
- **WHEN** 使用者點擊下拉選單以外的區域
- **THEN** 下拉選單關閉，不新增任何 tab

---

### Requirement: 關閉 tab
每個 tab SHALL 顯示 × 關閉按鈕，讓使用者關閉不需要的 tab。

#### Scenario: 點擊 × 關閉 tab
- **WHEN** 使用者點擊某個 tab 的 × 按鈕
- **THEN** 該 tab 從 TabBar 移除；若該 tab 為 active，則自動切換至相鄰 tab

#### Scenario: 關閉最後一個 tab
- **WHEN** 使用者關閉最後一個 tab
- **THEN** workspace 顯示空白狀態，無 pane 內容

---

### Requirement: 分割模式多窗格並排
在「分割模式」下，workspace panel SHALL 顯示多個 pane 並排（scaffold 階段固定為 wireframe B 的三窗格佈局：左側 browser、右上 file、右下 terminal）。

#### Scenario: 分割模式初始佈局
- **WHEN** 使用者切換至分割模式
- **THEN** workspace 顯示三個並排窗格，佈局與 wireframe Frame B 一致
