# app-shell Specification

## Purpose
定義應用程式的整體版面外殼：左右兩欄結構、自定義視窗標題列，以及分頁/分割模式切換。

## Requirements

### Requirement: 兩欄版面結構
應用程式 SHALL 呈現左右兩欄的版面：左欄為 AI 對話區（固定最小寬度 260px），右欄為工作區（佔用剩餘空間）。兩欄之間有可拖曳的分隔線。

#### Scenario: 初始版面渲染
- **WHEN** 使用者啟動應用程式
- **THEN** 左側 chat panel 與右側 workspace panel 同時顯示，分隔線居中

#### Scenario: 分隔線拖曳
- **WHEN** 使用者拖曳左右欄分隔線
- **THEN** 左欄寬度隨拖曳調整，右欄佔用剩餘空間，兩欄最小寬度限制不得突破

---

### Requirement: 視窗標題列
應用程式 SHALL 使用自定義標題列（Tauri `decorations: false`），顯示三個 macOS 風格的圓形按鈕（關閉/最小化/最大化）與 "AI Workbench" 文字。

#### Scenario: 標題列顯示
- **WHEN** 應用程式視窗開啟
- **THEN** 頂部顯示 40px 高度的自定義標題列，背景色 `#eceae5`，含三個圓形控制按鈕與 "AI Workbench" 標題文字

#### Scenario: 視窗可拖曳
- **WHEN** 使用者點擊並拖曳標題列空白區域
- **THEN** 應用程式視窗隨游標移動

---

### Requirement: 模式切換按鈕
右側 workspace panel SHALL 提供「分頁」與「分割」模式切換按鈕，切換後版面立即更新。

#### Scenario: 切換至分割模式
- **WHEN** 使用者點擊「分割」按鈕
- **THEN** 右側工作區切換為多窗格並排顯示，切換按鈕中「分割」顯示為選中狀態（深色背景）

#### Scenario: 切換至分頁模式
- **WHEN** 使用者點擊「分頁」按鈕
- **THEN** 右側工作區恢復為單一分頁顯示，切換按鈕中「分頁」顯示為選中狀態
