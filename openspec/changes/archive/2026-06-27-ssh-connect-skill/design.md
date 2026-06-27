## Context

The agent-gui Tauri app has a built-in terminal system backed by a PTY (pseudo-terminal). Each terminal tab spawns a PTY session via `pty_create` (Rust/Tauri command), which returns a `ptyId` UUID. Input is sent to the PTY via `pty_write(id, data: Vec<u8>)`.

The workspace state (tabs, active tab, ptyId per tab) is managed in a Zustand store (`useWorkspaceStore`). Claude can interact with the running Tauri app through the Tauri MCP server, specifically via `webview_execute_js` (run arbitrary JS in the webview) and `ipc_execute_command` (call a registered Tauri backend command).

An existing `host-lookup` skill at `$HOME/.agent-skills/host-lookup/` resolves hostnames to IPs via a local `hosts.txt` file.

## Goals / Non-Goals

**Goals:**
- Let Claude automate SSH connections end-to-end from a natural language request
- Reuse an active terminal tab if the workspace's current tab is a terminal
- Open a new terminal tab otherwise
- Wire into existing host-lookup for IP resolution

**Non-Goals:**
- SSH key management or credential storage
- Supporting non-PowerShell shells for the SSH wrapper
- Handling interactive password prompts (assumed key-based auth or password in SSH client)
- Creating a new `hosts.txt` entry if the host is not found

## Decisions

### 1. Bridge Zustand store to `window.__workspaceStore`

**Decision:** Add `(window as any).__workspaceStore = useWorkspaceStore;` in `App.tsx` after the store is initialized.

**Why:** The skill needs to (a) read `activeTabId` and `tabs` to determine if the active tab is a terminal, (b) call `addTab` to create a new terminal tab if needed, and (c) poll for the `ptyId` after the new tab mounts. All of this is in the Zustand store. Exposing the store to `window` is the minimal change that makes all these operations possible from `webview_execute_js` without adding new Tauri backend commands.

**Alternative considered:** Add a `pty_list` Tauri command on the Rust side. Rejected because it requires a Rust change and still wouldn't expose `activeTabId` or `addTab`.

### 2. Reuse active terminal vs. open new tab

**Decision:** Check `window.__workspaceStore.getState()` — if `tabs.find(t => t.id === activeTabId)?.type === 'terminal'`, reuse it. Otherwise call `state.addTab(...)`.

**Why:** Matches the user's stated preference exactly. Reusing avoids interrupting an existing session unnecessarily; opening new is clean when the user is in another pane.

### 3. Poll for ptyId after new tab creation

**Decision:** After calling `addTab`, repeatedly call `webview_execute_js` to check `window.__workspaceStore.getState().tabs.find(t => t.id === newId)?.ptyId` until it is defined (up to ~10 retries with a short wait).

**Why:** `TerminalPane` mounts asynchronously after the tab is added to the store, and `pty_create` is itself async. There is no synchronous way to get the ptyId at creation time. Polling is simple and reliable given the sub-second mount time in practice.

### 4. Send command via `pty_write` through Tauri MCP

**Decision:** Use `ipc_execute_command("pty_write", { id: ptyId, data: <UTF-8 bytes of "ssh user@ip\r\n"> })`.

**Why:** `pty_write` is already a registered Tauri command and accepts `Vec<u8>`. The `\r\n` ensures the command is submitted in the PTY. The Tauri MCP `ipc_execute_command` tool is the correct bridge for calling backend commands from Claude.

## Risks / Trade-offs

- **`window.__workspaceStore` is a global side-channel** — any JS running in the webview can access it. Since this is a local desktop app with controlled content, the risk is low, but it's not production-safe for a web context.
- **Polling race condition** → Mitigation: retry up to 10 times with `webview_wait_for` or explicit re-calls; if ptyId never appears, report an error to the user.
- **host-lookup not installed** → Mitigation: SKILL.md instructs Claude to tell the user if the lookup script is not found at `$HOME/.agent-skills/host-lookup/lookup.ps1`.
- **Multiple terminal tabs** — when active tab is not a terminal but multiple terminal tabs exist, the skill always opens a new one (does not pick an existing non-active terminal). This is intentional for predictability.
