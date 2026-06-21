## ADDED Requirements

### Requirement: URL bar 左側有 Back、Forward、Reload 三個導航按鈕
BrowserPane SHALL 在 URL 輸入框左側顯示三個按鈕：← 上一頁、→ 下一頁、↺ 重新載入。

#### Scenario: 點擊 Back 按鈕
- **WHEN** 使用者點擊 ← 按鈕
- **THEN** browser overlay 導航至瀏覽歷史的上一頁（等同執行 `history.back()`）

#### Scenario: 點擊 Forward 按鈕
- **WHEN** 使用者點擊 → 按鈕
- **THEN** browser overlay 導航至瀏覽歷史的下一頁（等同執行 `history.forward()`）

#### Scenario: 點擊 Reload 按鈕
- **WHEN** 使用者點擊 ↺ 按鈕
- **THEN** browser overlay 重新載入目前頁面（等同執行 `location.reload()`）

---

### Requirement: 整頁導航後 URL bar 自動更新
當 browser overlay 完成整頁導航（包含使用者點擊連結、Back/Forward、手動輸入網址）後，URL bar SHALL 自動顯示目前頁面的 URL。

#### Scenario: 點擊頁面內連結後 URL bar 更新
- **WHEN** 使用者在 browser overlay 內點擊連結，觸發整頁導航
- **THEN** 導航完成後，URL bar 顯示新頁面的 URL

#### Scenario: 按 Back 後 URL bar 更新
- **WHEN** 使用者點擊 ← 按鈕，觸發整頁導航
- **THEN** 導航完成後，URL bar 顯示回退頁面的 URL

#### Scenario: 手動輸入網址後 URL bar 保持同步
- **WHEN** 使用者在 URL bar 輸入網址並按 Enter
- **THEN** 導航完成後，URL bar 顯示最終落地 URL（包含 HTTP redirect 後的 URL）

#### Scenario: SPA 內部路由切換不觸發更新
- **WHEN** browser overlay 內的 SPA 透過 `history.pushState()` 切換路由（無整頁重載）
- **THEN** URL bar 不更新（此為已知限制）
