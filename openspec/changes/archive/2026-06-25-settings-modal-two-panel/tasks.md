## 1. Refactor Modal Shell

- [x] 1.1 Replace the fixed-width overlay dialog with a 75vw × 75vh flex-row container
- [x] 1.2 Add `activeTab` state (`'ai' | 'shortcuts'`) defaulting to `'ai'`

## 2. Left Sidebar

- [x] 2.1 Render sidebar (180px fixed width, border-right) with two tab items: "AI Models" and "Keyboard Shortcuts"
- [x] 2.2 Apply active tab style (`--accent-bg` background + 3px `--accent` left border) to the selected item
- [x] 2.3 Add hover state to inactive tab items via `onMouseEnter`/`onMouseLeave`

## 3. AI Models Panel

- [x] 3.1 Move existing three input fields (Anthropic API Key, Ollama URL, Ollama Model) into the right content area, conditionally rendered when `activeTab === 'ai'`
- [x] 3.2 Place the Save button (with saved-flash feedback) at the bottom-right of the AI Models panel

## 4. Keyboard Shortcuts Panel

- [x] 4.1 Render a read-only two-column table (Key / Action) for all vimium bindings when `activeTab === 'shortcuts'`
- [x] 4.2 Add a note above the table: "快捷鍵僅適用於瀏覽器面板。"

## 5. Cleanup

- [x] 5.1 Remove old flat-layout style objects that are no longer used after the refactor
- [x] 5.2 Run `npx tsc --noEmit` and confirm no type errors
