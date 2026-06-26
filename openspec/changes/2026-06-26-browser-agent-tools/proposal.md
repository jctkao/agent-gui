## Why

The agent can currently only run terminal commands. The browser pane on the right is inert from the agent's perspective — the agent has no way to read what's on the page, interact with forms, or click buttons. Users who want to automate browser tasks must switch between telling the agent what to do in chat and manually operating the browser themselves.

## What Changes

- 8 new Rig tools registered with the agent: read page info, read full page text, discover content sections, discover interactive elements, read a section's text, click an element, fill an input, and select a dropdown option
- Mozilla Readability.js bundled as a static asset and injected into the browser overlay on every page load — enables clean article/doc text extraction without nav/footer noise
- Result bridge: each tool injects JS into the overlay via `wv.eval()`, the JS emits a `browser-tool-result` Tauri event, a Rust `once()` listener fires the oneshot channel that unblocks the tool — same pattern as `TerminalTool` but without a confirmation step
- All browser tool calls execute **fully automatically** — no user confirmation UI, no waiting card
- After each tool call, Rust emits `agent-browser-action` so ChatPanel can display a compact inline action log (e.g. `[Browser] Clicked "Submit"`)

## Capabilities

### New Capabilities

- `browser-agent-tools`: Agent can read and interact with the active browser overlay page using 8 tools covering page reading, section discovery, interactive element discovery, clicking, text input, and dropdown selection

## Impact

- `src-tauri/src/agent/tools/browser.rs` — new file; 8 `Tool` implementations
- `src-tauri/src/agent/tools/mod.rs` — add `pub mod browser`
- `src-tauri/src/agent/commands.rs` — register all 8 browser tools in the agent builder
- `src-tauri/src/lib.rs` — inject Readability.js on page load; no new managed state (channel sender is captured in `once()` closure)
- `src-tauri/src/readability.min.js` — new static asset (Mozilla Readability, Apache 2.0)
- `src/components/chat/ChatPanel.tsx` — add `agent-browser-action` event listener; render new `browser-action` message role
