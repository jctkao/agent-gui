## Context

The app is a Tauri desktop application. The right-side browser pane is a child webview named `"browser-overlay"` (WebView2 on Windows), overlaid pixel-perfectly on a transparent placeholder `<div>` in the main React webview. JS is injected into it via `wv.eval()`. The overlay already has `window.__TAURI__.event.emit()` available — the existing SPA navigation monitor uses it.

The AI agent runs as a Tokio async task using the Rig framework. Tools implement `rig::tool::Tool` and park on a `oneshot::channel` while waiting for an external result. `TerminalTool` established this pattern: emit a Tauri event, wait on the channel, the result arrives via a Tauri command called by the frontend.

For browser tools the signal direction is reversed: JS in the overlay emits a Tauri event (`browser-tool-result`) directly back to Rust, so no frontend involvement is needed.

## Goals / Non-Goals

**Goals:**
- 8 agent tools covering reading and interaction: `browser_get_page_info`, `browser_get_page_text`, `browser_get_sections`, `browser_get_section_text`, `browser_get_elements`, `browser_click`, `browser_fill`, `browser_select`
- Fully automatic — no user confirmation step
- Page text extraction handles both article pages (Readability.js) and web apps (`innerText` fallback), truncated to 4000 chars
- React-safe input filling (native setter + synthetic events)
- Compact action log shown in chat after each tool call

**Non-Goals:**
- Playwright / Puppeteer integration (WebView2 CDP approach is too complex; `wv.eval()` achieves identical DOM access)
- Cross-tab automation
- Screenshot / vision model integration
- Network interception or request modification
- Waiting / confirmation UI (by design: fully automatic)

## Decisions

### 1. Result bridge: `app.once()` listener, not a new Tauri command

JS in the overlay emits `window.__TAURI__.event.emit('browser-tool-result', payload)`. On the Rust side, each tool call registers a `app.once("browser-tool-result", cb)` listener *before* calling `wv.eval()`, so the listener is always registered before JS can fire. The callback sends to the oneshot channel.

```
Tool::call()
  ├── let (tx, rx) = oneshot::channel()
  ├── app.once("browser-tool-result", move |ev| { tx.send(parse(ev.payload())) })
  ├── wv.eval(js_snippet)
  └── tokio::time::timeout(10s, rx).await  →  result
```

**Why not a new Tauri command?** A command would require: new fn, state to hold the pending sender, registration in `invoke_handler`. `once()` needs none of that — the sender is captured in the closure.

**Why not always-on `app.listen()`?** A permanent listener would need to handle concurrency if multiple tools ever ran simultaneously. `once()` is naturally scoped to one call.

**Timeout:** 10 seconds. If the JS throws silently (which `wv.eval` does not surface as an error), `rx` would block forever without it.

### 2. No `BrowserToolState` — no new managed state

Since `once()` captures the sender in its closure, nothing needs to be stored in `AppHandle`-managed state. This keeps `lib.rs` and `state.rs` untouched.

### 3. Element and section references: JS globals `window.__agentElements` / `window.__agentSections`

After `browser_get_elements` runs, it stores the matched DOM nodes as `window.__agentElements = [...]`. Subsequent `browser_click(index)`, `browser_fill(index, value)`, `browser_select(index, value)` retrieve `window.__agentElements[index]` and operate on it.

After `browser_get_sections` runs, it stores `window.__agentSections = [...]`. `browser_get_section_text(index)` reads from it.

**Why JS globals and not Rust state?** DOM node references cannot be serialized across the JS↔Rust boundary. They must remain as live JS objects.

**Staleness risk:** Globals reset on navigation. The agent will receive `"Element not found"` if it uses a stale index after navigation. No automatic detection — the agent must re-call `browser_get_elements` after navigating. This is documented in the tool's description string.

### 4. Readability.js: inject on every page load

Readability.js (Mozilla, Apache 2.0, ~15 KB minified) is stored as `src-tauri/src/readability.min.js` and injected in the existing `on_page_load(PageLoadEvent::Finished)` callback in `lib.rs`, alongside the existing vimium.js and SPA monitor injection:

```rust
wv.eval(include_str!("readability.min.js")).ok();
```

`browser_get_page_text` then runs:
```javascript
var doc = document.cloneNode(true);  // Readability mutates the doc — clone first
var article = new Readability(doc).parse();
var text = article ? article.textContent : document.body.innerText;
```

**Why clone before parsing?** Readability mutates the document to extract content. Cloning preserves the live page.

**Fallback:** `document.body.innerText` for web apps, dashboards, and SPAs where Readability returns null.

**Truncation:** Always applied after extraction — `text.replace(/\s{3,}/g, '\n\n').slice(0, 4000)`.

### 5. Interactive element selector and label extraction

```
Selector: button:not([disabled]), input:not([type="hidden"]):not([disabled]),
          textarea:not([disabled]), select:not([disabled]), a[href]
Filter:   bounding rect width > 0 && height > 0
Limit:    first 50 elements
```

Label priority: `aria-label` → `title` → associated `<label>` text (`el.labels[0]`) → `textContent.trim()` → `placeholder` → `name` attribute.

`select` elements include an `options` field: `Array.from(el.options).map(o => o.text)`.

### 6. Content section selector

```
Selector: h1,h2,h3,h4,h5,h6, p, table, ul, ol, article, section, main,
          [role="main"], [class*="error"], [class*="alert"], [class*="message"]
Filter:   visible (same rect check) && textContent.trim().length > 0
Limit:    first 30 sections
```

Each section record: `{ index, tag, preview }` where `preview = textContent.trim().slice(0, 120)`. The agent uses the preview to decide which section to read in full via `browser_get_section_text`.

### 7. React-safe fill

Plain `element.value = x` bypasses React's synthetic event system, leaving controlled components in a stale state. The correct technique:

```javascript
var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
          || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
if (setter) setter.call(el, value);
else el.value = value;
el.dispatchEvent(new Event('input', { bubbles: true }));
el.dispatchEvent(new Event('change', { bubbles: true }));
```

This is the same approach used internally by Testing Library and Playwright.

### 8. Dynamic values in JS snippets: JSON.stringify in Rust

Tool arguments (element index, fill value, select value) are injected into JS string literals. To prevent injection via values containing quotes or backticks, all dynamic values are `serde_json::to_string()` serialized in Rust before string interpolation:

```rust
let js = format!(
    "window.__agentElements[{}].click(); ...",
    args.index  // index is u32, safe to interpolate directly
);
let js = format!(
    "... nativeSetter.call(el, {}); ...",
    serde_json::to_string(&args.value).unwrap()  // value is a String — must be JSON-escaped
);
```

### 9. Chat UI: `browser-action` message role, no waiting state

Rust emits `agent-browser-action` after each tool completes:
```rust
app.emit("agent-browser-action", json!({ "summary": "Clicked \"Submit\"" })).ok();
```

ChatPanel adds a listener and renders a compact inline log bubble distinct from terminal `tool-ran` cards. No cancel button, no waiting state.

## Risks / Trade-offs

- **`window.__agentElements` stale after navigation**: Mitigated by clear tool description — "call `browser_get_elements` again after any navigation." The agent receives `"Element not found"` rather than silently clicking the wrong thing.
- **Readability.js on SPAs**: On React/Vue/Angular apps, Readability may return null (no article structure). The `innerText` fallback includes nav/footer text. Mitigated by truncation — the most important content is usually near the top of `innerText`.
- **Large section lists**: 30 sections with 120-char previews is ~3600 chars in the agent's context. Acceptable for most models.
- **`wv.eval()` silent JS errors**: If JS throws, the `once()` listener never fires. The 10s timeout surfaces this as a tool error rather than an infinite hang.
- **`window.__TAURI__` not yet available**: The overlay JS is injected only after `PageLoadEvent::Finished`, so `window.__TAURI__` is always present when tool JS runs. However, if the agent calls a tool while the page is mid-navigation, `eval()` will run on a blank page. Risk is low; no mitigation planned for v1.
