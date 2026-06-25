# browser-vimium-mode Specification

## Purpose
定義注入至 browser overlay webview 的 Vimium 鍵盤模式行為，包括 Normal mode 捲動/導航、Insert mode 直通、Hint mode 連結點擊，以及跨 SPA 導航的腳本持久化。

## Requirements

### Requirement: Normal mode scroll
The browser overlay SHALL support keyboard scroll commands in Normal mode, targeting the innermost scrollable ancestor of the focused element (or viewport-center element), falling back to `document.scrollingElement`.

#### Scenario: j / k scroll by line
- **WHEN** the user presses `j` or `k` in Normal mode
- **THEN** the page scrolls down or up by 80px using the correct scrollable container

#### Scenario: d / u scroll half page
- **WHEN** the user presses `d` or `u` in Normal mode
- **THEN** the page scrolls down or up by half the viewport height

#### Scenario: gg jumps to top
- **WHEN** the user presses `g` twice within 1 second in Normal mode
- **THEN** the page scrolls to the very top (`scrollTop = 0`)

#### Scenario: G jumps to bottom
- **WHEN** the user presses `G` (Shift+g) in Normal mode
- **THEN** the page scrolls to `document.documentElement.scrollHeight`

---

### Requirement: Normal mode history and reload
The browser overlay SHALL support keyboard history navigation and reload in Normal mode.

#### Scenario: H goes back
- **WHEN** the user presses `H` in Normal mode
- **THEN** the overlay calls `history.back()`

#### Scenario: L goes forward
- **WHEN** the user presses `L` in Normal mode
- **THEN** the overlay calls `history.forward()`

#### Scenario: r reloads
- **WHEN** the user presses `r` in Normal mode
- **THEN** the overlay calls `location.reload()`

---

### Requirement: Insert mode passes through to page
When an editable element (`input`, `textarea`, `select`, `contenteditable`) has focus, the Vimium layer SHALL suspend all key interception and pass events to the page. Pressing `Escape` exits Insert mode and blurs the element.

#### Scenario: Typing in an input field
- **WHEN** the user focuses an `<input>` element
- **THEN** all key presses are delivered to the input as normal; no Vimium shortcut fires

#### Scenario: Escape exits insert mode
- **WHEN** the user presses `Escape` while an editable element has focus
- **THEN** the element is blurred and the mode returns to Normal

---

### Requirement: Hint mode — f activates link hints
Pressing `f` in Normal mode SHALL enter Hint mode. All visible clickable elements receive a letter label overlay. Typing the label activates the corresponding element and returns to Normal mode. Pressing `Escape` cancels.

#### Scenario: Enter hint mode
- **WHEN** the user presses `f` in Normal mode
- **THEN** yellow letter labels appear over every visible clickable element (`a[href]`, `button`, `input`, `select`, `[role=button]`, `[role=link]`, `[onclick]`)

#### Scenario: Single-char label activates immediately
- **WHEN** the user types a letter that uniquely matches a single-char hint label
- **THEN** the hint overlay is removed, the target element receives `mousedown → mouseup → click` events, and mode returns to Normal

#### Scenario: Two-char label — first char narrows
- **WHEN** the user types the first character of a two-char label
- **THEN** all non-matching hints are hidden and the typed prefix is dimmed in the remaining hints

#### Scenario: Two-char label activates on second char
- **WHEN** the user types the second character completing a two-char label
- **THEN** the target element is activated and mode returns to Normal

#### Scenario: No match exits hint mode
- **WHEN** the typed sequence does not match any remaining label
- **THEN** the hint overlay is removed and mode returns to Normal

#### Scenario: Backspace narrows typed sequence
- **WHEN** the user presses `Backspace` in Hint mode
- **THEN** the last typed character is removed and non-matching hints are re-shown

#### Scenario: Escape cancels hint mode
- **WHEN** the user presses `Escape` in Hint mode
- **THEN** the hint overlay is removed and mode returns to Normal

#### Scenario: Scroll exits hint mode
- **WHEN** any `scroll` event fires while in Hint mode
- **THEN** the hint overlay is removed and mode returns to Normal (hints would be misaligned after scroll)

---

### Requirement: Hint labels use home-row character set
Hint labels SHALL use the character set `sadfjklewcmpgh` (14 characters). The label set MUST be prefix-free: no assigned label may be a prefix of another assigned label. Single-character labels are preferred and assigned first; two-character labels are used when the element count exceeds 14. Characters reserved as two-char prefixes SHALL NOT also appear as single-char labels.

#### Scenario: Label assignment order — small page
- **WHEN** hint mode is entered on a page with up to 14 visible clickable elements
- **THEN** each element receives a distinct single-character label from `sadfjklewcmpgh`

#### Scenario: Two-char labels for large pages — prefix-free
- **WHEN** hint mode is entered on a page with more than 14 visible clickable elements
- **THEN** the first `j = ceil((count − 14) / 13)` characters of `sadfjklewcmpgh` are reserved as two-char prefixes; the remaining `14 − j` characters are assigned as single-char labels; and elements that exceed the single-char supply receive two-character labels formed from the reserved prefix characters

#### Scenario: Prefix char is not a single-char label
- **WHEN** a character (e.g. `s`) is used as the first character of any two-char label (e.g. `ss`, `sa`)
- **THEN** that character is NOT assigned as a standalone single-char label to any element

#### Scenario: Single-char label always uniquely activates
- **WHEN** the user types a single character that matches a single-char label
- **THEN** `matchCount` is exactly 1 and the element activates immediately, regardless of how many two-char labels exist

---

### Requirement: Script persists across SPA navigations
The Vimium script SHALL install itself only once per page lifetime. SPA route changes (via `history.pushState` / `replaceState`) SHALL NOT reset the script or duplicate event listeners.

#### Scenario: SPA navigation preserves key bindings
- **WHEN** a SPA navigation occurs (pushState) while the Vimium script is installed
- **THEN** key bindings continue to work without re-injection or duplicate listeners

#### Scenario: Full page load re-injects safely
- **WHEN** a full page navigation completes and `on_page_load` re-injects the script
- **THEN** the `window.__vimiumInstalled` guard prevents duplicate listener registration

---

### Requirement: App-level shortcut forwarding via Tauri event
In Normal mode, when a keydown event matches a configured app-level shortcut, the vimium script SHALL call `window.__TAURI__.event.emit('app-action', actionId)` and suppress the event from reaching the page. App-level shortcut checking MUST occur before browser-context shortcut checking. (Tauri command invocation (`invoke`) is NOT used — the browser-overlay capability only grants `core:event:allow-emit`, blocking invoke.)

#### Scenario: App shortcut fires from browser overlay
- **WHEN** the browser overlay is in Normal mode and the user presses a key bound to an app-level action (e.g., Alt+j for tab_next)
- **THEN** the vimium script emits `"app-action"` with the action ID via `window.__TAURI__.event`, prevents default browser behavior, and does NOT trigger any browser-context Vimium action

#### Scenario: App shortcuts are suppressed in Insert mode
- **WHEN** the browser overlay is in Insert mode (an editable element has focus) and the user presses an app-level shortcut key
- **THEN** the key is passed through to the focused element as normal; no Tauri event is emitted

#### Scenario: App shortcuts are suppressed in Hint mode
- **WHEN** the browser overlay is in Hint mode and the user presses an app-level shortcut key
- **THEN** the key is consumed by hint-mode logic as normal; no Tauri event is emitted

#### Scenario: Non-matching modifier combos pass through
- **WHEN** the user presses a modifier-key combination that is not bound to any app-level action
- **THEN** the event is not intercepted by app shortcut handling and proceeds to normal Vimium or browser processing
