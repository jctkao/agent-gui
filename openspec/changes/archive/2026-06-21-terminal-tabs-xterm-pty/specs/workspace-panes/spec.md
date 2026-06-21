## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Tab 初始狀態
應用程式啟動時，workspace SHALL 預設顯示四個 tab：Browser、Files、Editor、Terminal（PowerShell），其中 Browser 為 active tab。

#### Scenario: Tab 初始狀態
- **WHEN** 應用程式啟動
- **THEN** TabBar 顯示四個 tab（Browser、Files、Editor、Terminal），Browser tab 為 active 狀態
