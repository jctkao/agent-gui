## 1. Rust — browser_focus command

- [x] 1.1 Add `browser_focus` function to `src-tauri/src/commands/browser.rs` using `wv.set_focus()`
- [x] 1.2 Export `browser_focus` from `src-tauri/src/commands/mod.rs` (if needed) and register it in `invoke_handler` in `src-tauri/src/lib.rs`

## 2. Keybindings — extend ACTION_DEFINITIONS

- [x] 2.1 Update `focus_chat` default key from `"Ctrl+l"` to `"Alt+n"` in `src/lib/keybindings.ts`
- [x] 2.2 Add 5 new `app`-context actions: `focus_workspace` (`Alt+m`), `tab_prev` (`Alt+j`), `tab_next` (`Alt+k`), `tab_first` (`Alt+1`), `tab_last` (`Alt+0`)

## 3. ChatPanel — mark input element

- [x] 3.1 Add `id="chat-input"` to the `<input>` element in `src/components/chat/ChatPanel.tsx`

## 4. TitleBar — accept onOpenSettings prop

- [x] 4.1 Add `onOpenSettings: () => void` prop to `TitleBar`; replace internal `openSettings()` call on the settings button with `props.onOpenSettings`
- [x] 4.2 Remove local `showSettings` state, `openSettings`, `closeSettings`, and the `SettingsModal` portal from `TitleBar`

## 5. App — lift settings state and add dispatcher

- [x] 5.1 Add `showSettings` state to `App.tsx`; implement `openSettings()` (hides browser overlay if active, sets state true) and `closeSettings()` (sets state false, restores browser overlay if active) using `useWorkspaceStore.getState()` imperatively
- [x] 5.2 Render `SettingsModal` portal in `App.tsx` (moved from `TitleBar`); pass `closeSettings` as `onClose`
- [x] 5.3 Pass `onOpenSettings={openSettings}` to `<TitleBar>`
- [x] 5.4 Implement `keyEventToString(e: KeyboardEvent): string` — builds canonical key string in format `"Ctrl+Alt+key"` (modifier order: Ctrl, Alt, Shift)
- [x] 5.5 Implement `focusActivePane(tabId: string, tabType: PaneType)` — calls `getTerminal(tabId)?.focus()` for terminal, `invoke("browser_focus")` for browser, no-op for others
- [x] 5.6 Implement `selectTab(index: number)` — calls `setActiveTab(tabs[index].id)`, then `setTimeout(() => focusActivePane(...), 80)`
- [x] 5.7 Add `useEffect` that loads overrides on mount, builds reverse map `{ keyString → actionId }`, attaches `document` keydown listener, and dispatches: `focus_chat` → focus chat input, `focus_workspace` → `focusActivePane`, `tab_prev/next/first/last` → `selectTab`, `open_settings` → `openSettings()`
- [x] 5.8 Verify: pressing `Alt+N` focuses chat input, `Alt+M` focuses active pane, `Alt+J/K` steps through tabs (stops at edges), `Alt+1`/`Alt+0` jump to first/last tab, `Ctrl+,` opens settings modal
