## 1. Static Asset — Readability.js

- [x] 1.1 Download Mozilla Readability.js minified build (`Readability.min.js`) from the `@mozilla/readability` npm package or its GitHub release; place at `src-tauri/src/readability.min.js`
- [x] 1.2 Verify the file is Apache 2.0 licensed; no other action required (bundled as a static asset)

## 2. Rust — Tool Implementations (`src-tauri/src/agent/tools/browser.rs`)

- [x] 2.1 Create `browser.rs`; define a shared async helper `eval_and_wait(app, js) -> Result<serde_json::Value, ToolError>` that: registers `app.once("browser-tool-result", ...)`, calls `wv.eval(js)`, awaits the oneshot with a 10-second timeout
- [x] 2.2 Implement `BrowserGetPageInfoTool` (tool name: `browser_get_page_info`): JS reads `window.location.href` and `document.title`; emits them; returns `"url: ...\ntitle: ..."`
- [x] 2.3 Implement `BrowserGetPageTextTool` (tool name: `browser_get_page_text`): JS tries Readability on a cloned document, falls back to `document.body.innerText`; normalises whitespace; truncates to 4000 chars; emits `{ url, title, text }`
- [x] 2.4 Implement `BrowserGetSectionsTool` (tool name: `browser_get_sections`): JS queries `h1-h6, p, table, ul, ol, article, section, main, [role="main"], [class*="error"], [class*="alert"], [class*="message"]`; filters to visible, non-empty elements; stores as `window.__agentSections`; emits array of `{ index, tag, preview }` (first 120 chars of textContent); limit 30
- [x] 2.5 Implement `BrowserGetSectionTextTool` (tool name: `browser_get_section_text`, arg: `index: u32`): JS reads `window.__agentSections[index].innerText`; returns full text (no truncation); emits `{ ok, text }` or `{ ok: false, error }`
- [x] 2.6 Implement `BrowserGetElementsTool` (tool name: `browser_get_elements`): JS queries `button:not([disabled]), input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]`; filters to visible; stores as `window.__agentElements`; emits array of `{ index, tag, label, type?, href?, options? }`; limit 50; label priority: `aria-label → title → label.textContent → textContent → placeholder → name`
- [x] 2.7 Implement `BrowserClickTool` (tool name: `browser_click`, arg: `index: u32`): JS calls `window.__agentElements[index].click()`; emits `{ ok }` or `{ ok: false, error }`; Rust emits `agent-browser-action` with summary before returning
- [x] 2.8 Implement `BrowserFillTool` (tool name: `browser_fill`, args: `index: u32, value: String`): JS uses native setter + synthetic `input`/`change` events (React-safe); value is JSON-serialized in Rust before interpolation; emits `{ ok }` or `{ ok: false, error }`; Rust emits `agent-browser-action` before returning
- [x] 2.9 Implement `BrowserSelectTool` (tool name: `browser_select`, args: `index: u32, value: String`): JS matches option by `option.text.includes(value)` or `option.value === value`; fires `change` event; emits `{ ok }` or `{ ok: false, error }`; Rust emits `agent-browser-action` before returning

## 3. Rust — Wire Up (`src-tauri/src/agent/tools/mod.rs` and `commands.rs`)

- [x] 3.1 Add `pub mod browser;` to `src-tauri/src/agent/tools/mod.rs`
- [x] 3.2 In `agent/commands.rs` `run_agent()`, add all 8 browser tools to the agent builder (`.tool(BrowserGetPageInfoTool { app: app.clone() })` × 8)

## 4. Rust — Readability Injection (`src-tauri/src/lib.rs`)

- [x] 4.1 In the `on_page_load(PageLoadEvent::Finished)` callback, after the existing vimium.js injection, add `wv.eval(include_str!("readability.min.js")).ok();`

## 5. Frontend — ChatPanel (`src/components/chat/ChatPanel.tsx`)

- [x] 5.1 Add `"browser-action"` to the `Role` union type
- [x] 5.2 Add a `listen<{ summary: string }>("agent-browser-action", ...)` listener in the `useEffect` block; append a new `{ role: "browser-action", content: ev.payload.summary }` message
- [x] 5.3 Add a render branch for `msg.role === "browser-action"`: compact single-line badge, visually distinct from terminal `tool-ran` blocks (e.g. `[Browser] Clicked "Submit"` in a muted style)
- [x] 5.4 Clean up the new unlisten function in the `useEffect` return
