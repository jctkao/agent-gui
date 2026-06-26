## Context

The app is a Tauri v2 app with a React frontend. The existing keybinding system (`src/lib/keybindings.ts`) defines `ACTION_DEFINITIONS` with two contexts: `"browser"` (handled inside the native overlay webview via injected JS) and `"app"` (currently unimplemented). Two `app` actions already exist as stubs: `open_settings` and `focus_chat`.

The workspace has a Zustand store (`useWorkspaceStore`) for tab state. The browser overlay is a native child webview positioned off-screen when inactive. Settings modal state lives locally in `TitleBar`.

## Goals / Non-Goals

**Goals:**
- Implement all `app` context actions including the 6 new ones
- Keep shortcuts user-configurable via the existing settings UI (no hardcoding)
- Focus the native browser webview correctly after tab switch or `Alt+M`

**Non-Goals:**
- Changing the browser-context (vimium-style) keybinding system
- Adding focus behavior to file/editor panes (no meaningful entry point yet)
- Shortcut hints / visual indicators

## Decisions

### 1. Dispatcher lives in App.tsx via useEffect

**Decision:** A single `useEffect` in `App.tsx` attaches a `document` keydown listener that resolves bindings and dispatches actions.

**Why:** App.tsx is the root component — it's the natural place for app-wide concerns. Alternatives considered:
- *Separate hook file* (`useAppShortcuts`): Minor organizational win, no behavioral difference. Not worth the indirection for 6 actions.
- *Tauri global shortcut plugin*: Would intercept keys even when another window is focused — not desired here.

### 2. Bindings loaded once on mount, not reactive

**Decision:** `loadOverrides()` is called once in the `useEffect`, not re-fetched when the settings modal closes.

**Why:** Overrides only change when the user explicitly saves settings. A page reload (or remount) after save is acceptable; there is no real-time hot-reload requirement. The `BrowserPane` uses the same "load once" pattern.

If live-reload is needed later, the `saveOverrides` function can emit a Tauri event that triggers a reload of the resolver.

### 3. Settings modal state lifted to App.tsx

**Decision:** `showSettings` state moves from `TitleBar` to `App.tsx`. `TitleBar` accepts an `onOpenSettings` prop.

**Why:** The dispatcher in `App.tsx` needs to open the modal. The two options were:
- *Lift to App.tsx* (chosen): straightforward, no new abstractions.
- *Add to Zustand store*: couples UI state to the domain store; not worth it for a single boolean.

The browser hide/show logic that previously lived inside `TitleBar.openSettings` moves to `App.tsx`, using `useWorkspaceStore.getState()` imperatively (same pattern as `ChatPanel`).

### 4. Key string format: `"Modifier+key"` canonical form

**Decision:** Key combinations are represented as `"Alt+n"`, `"Ctrl+,"` etc. — built from `KeyboardEvent` as `[...modifiers, e.key].join("+")` with modifier order: Ctrl, Alt, Shift.

**Why:** Matches the existing `defaultKey` format already used in `ACTION_DEFINITIONS`. Case-sensitive: `e.key` is `"n"` for unshifted N, `"N"` for shifted N.

### 5. browser_focus via Tauri command, with 80ms setTimeout after tab switch

**Decision:** After a tab navigation shortcut activates a browser tab, `browser_focus` is called inside a `setTimeout(..., 80)`.

**Why:** `WorkspacePanel` calls `browser_show` inside a React `useEffect` (async, after render). The native webview must be visible and positioned before `set_focus()` is called, or focus goes nowhere. 80ms covers one render cycle reliably. Terminal focus has no such delay since terminals are always mounted (CSS visibility toggle).

### 6. Chat input targeted by id attribute

**Decision:** Add `id="chat-input"` to the `<input>` in `ChatPanel`, targeted via `document.getElementById("chat-input")`.

**Why:** Avoids prop-drilling a ref from App.tsx through ChatPanel. The input is a singleton — `id` is appropriate and stable.

## Risks / Trade-offs

- **80ms timer is fragile** → If `browser_show` takes longer on a slow machine, focus still won't land. Mitigation: this is the same tradeoff that exists elsewhere in the Tauri browser overlay code; a future fix could add an acknowledgement event from `browser_show` and focus in response.
- **Alt key on Windows** → Alt activates the system menu in some native windows. Tauri's webview captures Alt key events before they reach the OS menu, so this is not an issue in practice.
- **Bindings not hot-reloaded** → If the user saves new keybindings in the settings modal, the shortcut changes only take effect after reopening the app. Acceptable for now; can be fixed by emitting a reload event from `saveOverrides`.

## Open Questions

- None — all decisions are resolved.
