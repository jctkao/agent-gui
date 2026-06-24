## Context

The browser pane renders web pages via a child WebView2 webview (`browser-overlay`) that is overlaid on the main Tauri window. The overlay is created once at startup and repositioned at runtime. `on_page_load` in `lib.rs` fires on every `PageLoadEvent::Finished` and already injects an SPA navigation monitor script via `wv.eval()`. This is the natural injection point for a Vimium-style script.

Key constraint: the overlay webview is a full WebView2 process rendering arbitrary web pages. We cannot use a Tauri content-script API; `wv.eval()` is the only injection mechanism, and it runs at the top-level scope of the page after each full-page load.

## Goals / Non-Goals

**Goals:**
- Scroll: `j`/`k` (line), `d`/`u` (half-page), `gg`/`G` (top/bottom)
- History: `H`/`L` (back/forward), `r` (reload)
- Link hints (`f`): label all visible clickable elements with letter combinations, click on label match
- Three modes: Normal, Hint, Insert (auto-detect input focus)
- Zero new Tauri commands or React changes

**Non-Goals:**
- `F` (open in new tab / external browser)
- `o` / `O` (focus URL bar — requires React ↔ overlay IPC)
- `/` find-in-page
- Visual / caret mode
- Configurable key bindings (deferred to settings integration)
- Tab management

## Decisions

### D1: `include_str!` for the script file

Store the Vimium script as `src-tauri/src/vimium.js` and embed it at compile time with `include_str!("vimium.js")`. This keeps the JS editable as a plain file (syntax highlighting, linting) without a runtime file read. The resulting string is called in the existing `wv.eval()` call inside `on_page_load`.

Alternatives considered: inline string in Rust (unreadable), runtime file read (adds I/O and error handling surface).

### D2: `window.__vimiumInstalled` guard for SPA navigations

`on_page_load` fires on full navigations. The SPA monitor patches `history.pushState/replaceState`, but those don't retrigger `PageLoadEvent::Finished`. The Vimium script sets `window.__vimiumInstalled = true` and returns early if already set, so re-injection on full navigations is safe and SPA navigations keep the already-installed handler.

### D3: Scrollable-ancestor lookup, not `window.scrollBy`

Many modern apps (GitHub, Notion, Twitter) scroll a `div`, not `window`. The lookup walks:
1. Up from `document.activeElement`
2. Up from `document.elementFromPoint(innerWidth/2, innerHeight/2)` (viewport center)
3. Fallback: `document.scrollingElement`

An element is considered scrollable if `computedStyle.overflow/overflowY` matches `auto|scroll` AND `scrollHeight > clientHeight + 1`.

### D4: `useCapture: true` on the keydown listener

By listening in the capture phase, we intercept key events before the page's own handlers. This prevents Vim keys from leaking into page shortcuts (e.g., `j` on YouTube triggering seek). In Insert mode we return immediately, handing control back to the page.

### D5: Hint labels — `sadfjklewcmpgh` (Vimium default)

14 home-row characters. Single-char labels cover the first 14 hints; two-char labels cover up to 210. Three-char is available but unusual. This matches Vimium's ergonomics exactly.

### D6: Hints attached to `document.documentElement`, `position: fixed`

Appending to `<html>` (not `<body>`) avoids `overflow: hidden` on `body` clipping hints. `position: fixed` means hints don't scroll with the page. Consequence: hints become misaligned after page scroll — mitigated by exiting hint mode on any `scroll` event.

### D7: Activate element via dispatched MouseEvent sequence

`el.click()` alone fails in many React/Vue apps that only listen to `mousedown`/`mouseup`. We dispatch `mousedown → mouseup → click` with `bubbles: true` for broad compatibility.

## Risks / Trade-offs

- **CSP on eval**: Sites with `script-src 'none'` block inline scripts, but `wv.eval()` (WebView2 DevTools API) bypasses CSP. This is the same mechanism browsers' own extensions use. → No mitigation needed.

- **Very high z-index pages**: Some pages (chat overlays, modal backdrops) use `z-index: 2147483647` or create stacking contexts with `isolation: isolate`. Hints behind such elements won't be visible. → Accepted limitation; affects a small minority of pages.

- **SPA navigations losing scroll context**: When a SPA navigates, the DOM is replaced but the script persists. `document.activeElement` may reset to `<body>`, so the first scroll after an SPA nav falls back to `document.scrollingElement`. → Acceptable; the fallback is the correct behavior in most cases.

- **Re-injection on full navigation re-runs SPA monitor**: The SPA monitor script also has a `window.__overlayMonitorInstalled` guard, so double-injection is safe.

## Migration Plan

Pure additive change. No database schema changes, no Tauri command changes. Rollback: remove the `wv.eval(include_str!("vimium.js"))` line and delete the file.

## Open Questions

- Should hint mode exit on window `resize` (hints would be mispositioned)? → Yes, same treatment as scroll.
- Should `r` (reload) be guarded against accidental press in form-heavy pages? → Deferred; consistent with Vimium behavior.
