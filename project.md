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

**Consequence**: the browser overlay is always above all React UI. Two places that must call `browser_hide` before rendering UI over the pane area:
1. **Tab switching** — `WorkspacePanel.tsx` handles this in a `useEffect` on `activeTabId`
2. **`+` dropdown opening** — `TabBar.tsx` calls `browser_hide` when `dropdownOpen` becomes true (and `browser_show` on close), because the dropdown extends into the pane area which the overlay covers

### Vimium Keyboard Layer

On every `PageLoadEvent::Finished` (non-`about:blank`), `lib.rs` injects `src-tauri/src/vimium.js` via `wv.eval(include_str!("vimium.js"))`. The script is embedded at compile time.

The script is a self-contained IIFE with a `window.__vimiumInstalled` guard (safe to re-inject on full navigations; SPA navigations that don't trigger `PageLoadEvent::Finished` keep the already-installed handler).

**Three modes:**
- `normal` — Vim-style keys active (`j`/`k`/`d`/`u`/`gg`/`G` scroll, `H`/`L` history, `r` reload, `f` hint mode)
- `hint` — yellow `position:fixed` letter labels over all visible clickable elements; typing the label fires `mousedown → mouseup → click`; `Esc` cancels
- `insert` — auto-entered on `focusin` to editable elements; all keys pass through; `Esc` blurs and returns to normal

**Key design decisions to keep in mind:**
- `keydown` listener uses `useCapture: true` to intercept before page handlers
- Scrollable-ancestor lookup: walks up from `document.activeElement`, then from `document.elementFromPoint(center)`, fallback to `document.scrollingElement`
- Hint container attaches to `document.documentElement` (not `body`) to avoid `overflow:hidden` clipping
- Hint mode exits on `scroll` events (hints would be misaligned after scroll)
- Label character set: `sadfjklewcmpgh` — 14 home-row chars; single-char labels first, then pairs (covers up to 210 elements)

**To modify key bindings:** edit the `switch (key)` block in `vimium.js`. All key handling is in that single file.

### Terminal PTY Pattern

Each terminal tab connects to a real shell process via `portable-pty` (Rust, wezterm). The frontend renders with xterm.js.

```
TerminalPane mount
  → invoke("pty_create", { shell })     → Rust spawns shell, starts read thread
  ← returns ptyId (UUID)
  → terminal.open(divRef)              (xterm.js attach to DOM)
  → listen("pty-data-{ptyId}")         ← Rust thread emits on each read()
  → terminal.onData → invoke("pty_write")

Tab switch away: CSS visibility: hidden (PTY keeps running)
Tab switch back: fitAddon.fit() + pty_resize
Tab close: React unmount → invoke("pty_kill") + destroyTerminal(ptyId)
```

Shell resolution (Windows):
- `"powershell"` → `pwsh.exe` (checked via `where.exe`) or fallback `powershell.exe`
- `"wsl"` → `wsl.exe -e bash`; if WSL is not installed, `pty_create` returns an error, the tab is removed and an error is shown

xterm.js instances are **not** stored in Zustand (not serializable). They live in `src/lib/terminalRegistry.ts` — a module-level `Map<ptyId, Terminal>`.

### Data Flow

```
useWorkspaceStore (Zustand)
  ├── mode: 'tab' | 'split'
  ├── tabs: Pane[]          ← PaneType: browser | file | editor | terminal
  │                            Pane has optional shell?: "powershell" | "wsl"
  └── activeTabId

WorkspacePanel
  ├── watches activeTabId → invokes browser_hide / browser_show
  ├── tab mode:
  │     non-terminal tabs → only render active pane
  │     terminal tabs     → all mounted, CSS visibility toggled
  └── split mode → SplitLayout (fixed: browser left, file top-right, terminal bottom-right)

TabBar
  ├── × button per tab → closeTab(id)
  ├── + button → dropdown (網頁 / 檔案總管 / PowerShell / bash WSL)
  └── dropdown open on browser tab → browser_hide / browser_show
```

### Rust Backend (`src-tauri/src/`)

- **`lib.rs`** — app entry: registers SQL migrations, plugins, manages `BrowserOverlayState`, `PtyManager`, and `AgentState`; registers all Tauri commands; injects `vimium.js` and the SPA navigation monitor on each page load
- **`vimium.js`** — Vimium-style keyboard script embedded via `include_str!` and injected into the browser overlay on every page load (see Vimium Keyboard Layer above)
- **`commands/browser.rs`** — Tauri commands managing the overlay webview lifecycle via `Mutex<BrowserOverlayState>` (`last_rect: Option<(f64,f64,f64,f64)>`)
- **`pty.rs`** — PTY session management: `PtyManager` (`Mutex<HashMap<String, PtySession>>`), commands `pty_create / pty_write / pty_resize / pty_kill`. Each session spawns a background thread that reads PTY master output and emits `pty-data-{id}` Tauri events.
- **`agent/`** — Ollama-backed agentic loop:
  - `state.rs` — `AgentState`: conversation `messages` (JSON), optional `system_prompt`, and `approval_tx` (oneshot channel for terminal result handoff)
  - `ollama.rs` — `call_ollama()`: POST to Ollama `/api/chat` with tool definitions
  - `commands.rs` — `agent_start`: pushes user message, spawns `run_loop` on tokio; `run_loop` calls Ollama repeatedly, parks on `agent-command-to-terminal` events and resumes when `agent_terminal_result` delivers the output; `agent_terminal_result`: resolves the parked oneshot with terminal output
- SQLite DB (`settings.db`) is initialized on first launch via `tauri-plugin-sql` migrations; the schema is a single `settings (key, value)` key-value table. Keys in use: `anthropic_api_key`, `ollama_url`, `ollama_model`

### Frontend (`src/`)

- **`src/index.css`** — all design tokens as CSS custom properties (`--bg`, `--border`, `--accent`, etc.). All components use these variables; hardcoded colors are avoided.
- **`src/lib/settings.ts`** — thin wrapper over `@tauri-apps/plugin-sql` for reading/writing the `settings` table.
- **`src/lib/terminalRegistry.ts`** — module-level `Map<string, Terminal>` for xterm.js instances. Use `createTerminal(id)` / `getTerminal(id)` / `destroyTerminal(id)`. Never put Terminal objects in Zustand.
- **`src/store/workspace.ts`** — single Zustand store for all workspace state. `Pane.shell` holds the terminal shell type; ptyId is managed locally inside `TerminalPane` via `useRef`.
- Inline `React.CSSProperties` objects are used for styling (no CSS modules or Tailwind).

### Adding a New Pane Type

1. Add the type to `PaneType` in `src/store/workspace.ts`
2. Create `src/components/workspace/panes/<Name>Pane.tsx`
3. Add a case in `WorkspacePanel.tsx` `renderNonTerminalPane()` (terminal panes have a separate always-mounted render path — only add here for non-terminal types)
4. Add an icon entry in `TabBar.tsx` `PANE_ICONS`
5. Add an option in `TabBar.tsx` `ADD_OPTIONS` if the type should appear in the `+` dropdown

### Adding a New Rust Command

1. Implement in `src-tauri/src/commands/` (new file or existing module) or directly in `pty.rs` / `lib.rs` for small additions
2. If in a new file under `commands/`, export from `src-tauri/src/commands/mod.rs`
3. Import and add to `tauri::generate_handler![]` in `lib.rs`
4. Add required permissions to `src-tauri/capabilities/default.json`

## Design Reference

`AI Workbench Wireframes.dc.html` — the original low-fidelity wireframe (open in a browser with `support.js` in the same directory). Two frames: **A** (tab mode) and **B** (split mode). The warm neutral palette and dashed-border aesthetic from this wireframe are the visual target.

### Chat Panel / Agent Data Flow

```
ChatPanel (React)
  ├── sends: invoke("agent_start", { userMessage, ollamaUrl, ollamaModel })
  │     → Rust spawns run_loop (tokio task)
  │     → run_loop calls Ollama; on tool_call: parks, emits "agent-command-to-terminal"
  │
  ├── listens: "agent-command-to-terminal"
  │     → pre-types command into active Terminal PTY (without Enter)
  │     → listens to pty-data-{ptyId} to capture output after user confirms (Enter)
  │     → invoke("agent_terminal_result", { command, output, cancelled })
  │     → unblocks run_loop, which continues with tool result
  │
  └── listens: "agent-message" / "agent-done"
        → displays assistant reply, re-enables input
```

The user always sees the command before it runs — they press Enter in the terminal to confirm, or `Ctrl+C` to cancel. There is no auto-execution.

## OpenSpec Changes

Planning artifacts live in `openspec/changes/`. Completed changes are archived under `openspec/changes/archive/`. Main capability specs are in `openspec/specs/`.

Active change: `browser-vimium-mode` (implementation complete, pending manual verification). Use `/opsx:archive browser-vimium-mode` when verified.
