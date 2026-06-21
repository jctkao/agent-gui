## ADDED Requirements

### Requirement: 建立 terminal session
使用者 SHALL 能在 workspace 中建立一個連結至真實 shell 的 terminal tab。支援的 shell 類型為 PowerShell（Windows）與 bash（WSL）。

#### Scenario: 建立 PowerShell session
- **WHEN** 使用者從 + dropdown 選擇「PowerShell」
- **THEN** 新增一個標記為「PowerShell」的 terminal tab，並在其中顯示可輸入指令的互動式 PowerShell prompt

#### Scenario: 建立 bash (WSL) session
- **WHEN** 使用者從 + dropdown 選擇「bash (WSL)」
- **THEN** 新增一個標記為「bash (WSL)」的 terminal tab，並在其中顯示可輸入指令的互動式 bash prompt

#### Scenario: WSL 未安裝時建立失敗
- **WHEN** 使用者選擇「bash (WSL)」且系統未安裝 WSL
- **THEN** tab 不應留在 workspace 中，並顯示錯誤提示說明 WSL 未安裝

---

### Requirement: 執行 shell 指令並顯示輸出
Terminal session SHALL 將使用者的鍵盤輸入傳送至 shell process，並將 shell 的輸出即時顯示於 terminal UI。

#### Scenario: 輸入指令並取得輸出
- **WHEN** 使用者在 terminal 中輸入指令並按下 Enter
- **THEN** 指令於 shell process 中執行，輸出結果即時顯示於 terminal

#### Scenario: 互動式程式支援
- **WHEN** 使用者執行需要互動輸入的程式（例如 `python` REPL）
- **THEN** 程式的輸出與 prompt 正確顯示，使用者輸入正確傳達至程式

---

### Requirement: Terminal 尺寸自動適應容器
Terminal session SHALL 在容器尺寸改變時自動調整 PTY 的 rows 與 cols，使 shell 輸出排版與視窗大小一致。

#### Scenario: 視窗 resize 時 terminal 更新尺寸
- **WHEN** 使用者調整應用程式視窗大小
- **THEN** terminal 的 rows/cols 自動更新，shell 程式（如 `htop`）版面正確重排

#### Scenario: 切換回 terminal tab 時 fit
- **WHEN** 使用者切換至某個 terminal tab
- **THEN** terminal 尺寸重新 fit 至當前容器，確保 rows/cols 正確

---

### Requirement: 關閉 terminal tab 時終止 session
**WHEN** 使用者關閉 terminal tab，對應的 shell process SHALL 被終止，不留下殭屍 process。

#### Scenario: 關閉 tab 終止 shell process
- **WHEN** 使用者點擊 terminal tab 的 × 關閉按鈕
- **THEN** 對應的 shell process 被終止，tab 從 workspace 移除

---

### Requirement: 多個 terminal session 並存
應用程式 SHALL 支援同時存在多個 terminal session，各 session 彼此獨立。

#### Scenario: 切換 terminal tab 時 session 持續執行
- **WHEN** 使用者切換至另一個 tab（terminal 或其他類型）後再切換回來
- **THEN** 原 terminal session 的 shell 繼續執行中，輸出歷史完整保留
