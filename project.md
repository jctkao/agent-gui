# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Prerequisites

Rust is installed (rustup). WebView2 Runtime is pre-installed on this machine.

## Commands

```bash
# Frontend dev server only (no Rust)
npm run dev

# Full Tauri dev mode (Rust + frontend, first run compiles Rust ~2min)
npm run tauri dev

# TypeScript type check
npx tsc --noEmit

# Production build
npm run tauri build
```

## Architecture

This is a **Tauri 2 + React 18 + TypeScript + Vite** desktop app implementing an AI workbench with a chat panel on the left and a multi-pane workspace on the right.

### The Browser Overlay Pattern

The most unusual architectural element: the Browser pane cannot use `<iframe>` (blocked by X-Frame-Options on real sites). Instead, a second Tauri **WebView** is created via `Window::add_child()` in Rust and positioned precisely over a transparent `<div>` placeholder in React.

```
React BrowserPane (div#overlay-target, transparent)
     ↓  getBoundingClientRect()
invoke("browser_set_rect" / "browser_open")
     ↓
Rust: app.windows()["main"].add_child(WebviewBuilder, position, size)
      → "browser-overlay" webview floats on top, z-order fixed above React UI
```

**Tauri 2 API notes:**
- `WebviewBuilder` and `Window::add_child()` require the `unstable` feature in `Cargo.toml`: `tauri = { version = "2", features = ["unstable"] }`
- Use `app.windows().remove("main")` (returns `Window<R>`) — NOT `app.get_webview_window("main")` (returns `WebviewWindow<R>`) — to call `add_child`
- `Webview` (child webview type) has no `set_visible()`; show/hide is done by moving bounds off-screen (`-10000, -10000`) vs restoring from `BrowserOverlayState.last_rect`
- Icons are required to build on Windows: run `npm run tauri -- icon <source.png>` to generate `src-tauri/icons/`

**Consequence**: the browser overlay is always above all React UI. When switching away from the browser tab, `browser_hide` must be called before any React modal or dropdown appears over that area. `WorkspacePanel.tsx` handles this in a `useEffect` on `activeTabId`.

### Data Flow

```
useWorkspaceStore (Zustand)
  ├── mode: 'tab' | 'split'
  ├── tabs: Pane[]          ← PaneType: browser | file | editor | terminal
  └── activeTabId

WorkspacePanel
  ├── watches activeTabId changes → invokes browser_hide / browser_show
  ├── tab mode  → TabBar + single active pane
  └── split mode → SplitLayout (fixed: browser left, file top-right, terminal bottom-right)
```

### Rust Backend (`src-tauri/src/`)

- **`lib.rs`** — app entry: registers SQL migrations, plugins, and browser commands
- **`commands/browser.rs`** — four Tauri commands managing the overlay webview lifecycle via `Mutex<BrowserOverlayState>` (`created: bool`, `last_rect: Option<(f64,f64,f64,f64)>`)
- SQLite DB (`settings.db`) is initialized on first launch via `tauri-plugin-sql` migrations; the schema is a single `settings (key, value)` key-value table

### Frontend (`src/`)

- **`src/index.css`** — all design tokens as CSS custom properties (`--bg`, `--border`, `--accent`, etc.). All components use these variables; hardcoded colors are avoided.
- **`src/lib/settings.ts`** — thin wrapper over `@tauri-apps/plugin-sql` for reading/writing the `settings` table. The DB connection is lazily initialized and cached.
- **`src/store/workspace.ts`** — single Zustand store for all workspace state. Components read from it; only `WorkspacePanel` calls browser overlay invokes as a side effect.
- Inline `React.CSSProperties` objects are used for styling (no CSS modules or Tailwind).

### Adding a New Pane Type

1. Add the type to `PaneType` in `src/store/workspace.ts`
2. Create `src/components/workspace/panes/<Name>Pane.tsx`
3. Add a case in `WorkspacePanel.tsx` `renderActivePane()`
4. Add an icon entry in `TabBar.tsx` `PANE_ICONS`

### Adding a New Rust Command

1. Implement in `src-tauri/src/commands/` (new file or existing module)
2. Export from `src-tauri/src/commands/mod.rs`
3. Import and add to `tauri::generate_handler![]` in `lib.rs`
4. Add required permissions to `src-tauri/capabilities/default.json`

## Design Reference

`AI Workbench Wireframes.dc.html` — the original low-fidelity wireframe (open in a browser with `support.js` in the same directory). Two frames: **A** (tab mode) and **B** (split mode). The warm neutral palette and dashed-border aesthetic from this wireframe are the visual target.

## OpenSpec Changes

Planning artifacts live in `openspec/changes/`. The active change is `tauri-app-scaffold` (27/28 tasks complete — pending task 6.7: verify browser overlay renders an external site correctly). Use `/opsx:apply` to resume implementation.
