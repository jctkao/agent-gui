## 1. Expose Workspace Store to Window

- [x] 1.1 In `src/App.tsx`, add `(window as any).__workspaceStore = useWorkspaceStore;` after the component is defined (at module level, outside the component function, so it runs once on import)

## 2. Create SSH Connect Skill

- [x] 2.1 Create directory `skills/ssh-connect/`
- [x] 2.2 Create `skills/ssh-connect/SKILL.md` with the following content:
  - Frontmatter: `name: ssh-connect`, `description: SSH into a remote machine by name`
  - **When to use**: trigger when the user asks to SSH, connect, or log in to a remote machine
  - **Step 1 — Extract hostname**: parse the machine name from the user's message
  - **Step 2 — Look up IP**: run `powershell -File "$HOME/.agent-skills/host-lookup/lookup.ps1" -HostName "<hostname>"` via PowerShell tool; handle single IP / multiple matches / not found / script missing
  - **Step 3 — Obtain username**: extract from message (patterns: "as admin", "user admin", "admin@host"); if absent, ask the user
  - **Step 4 — Determine terminal**: call `webview_execute_js` with JS that reads `window.__workspaceStore.getState()`, checks if `activeTabId` maps to a tab with `type === 'terminal'`, and returns `{ action: 'use', ptyId }` or `{ action: 'create' }`
  - **Step 5a — If reusing existing terminal**: proceed directly to Step 6 with the returned `ptyId`
  - **Step 5b — If creating new terminal**: call `webview_execute_js` to invoke `window.__workspaceStore.getState().addTab({ id: 'ssh-<timestamp>', type: 'terminal', label: 'SSH', shell: 'powershell' })`; then poll `webview_execute_js` up to 10 times to read `window.__workspaceStore.getState().tabs.find(t => t.id === newId)?.ptyId` until defined; if still undefined after retries, report error and stop
  - **Step 6 — Send SSH command**: call `ipc_execute_command("pty_write", { id: ptyId, data: <Array.from(new TextEncoder().encode("ssh user@ip\r\n"))> })` via the Tauri MCP tool

## 3. Verify

- [x] 3.1 Run the app and confirm `window.__workspaceStore.getState()` is accessible from the browser console
- [x] 3.2 With a terminal tab active, ask Claude "SSH to web-server as admin" and confirm the SSH command appears in the terminal
- [x] 3.3 With a non-terminal tab active, ask Claude to SSH and confirm a new terminal tab opens and the command runs in it
- [x] 3.4 Ask without a username and confirm Claude asks for one before proceeding
- [x] 3.5 Use an unknown hostname and confirm Claude reports it was not found

## 4. Fix Stale Terminal-Waiting Box

The ssh-connect skill runs two commands in one agent turn (host-lookup, then ssh).
Each `agent-command-to-terminal` event creates a `terminal-waiting` box and overwrites
the single `pendingWaitingId` ref, but the per-command cleanup path (`agent-tool-ran`
event) is no longer emitted by the backend (removed during the rig.rs migration). The
only remaining cleanup, `agent-done`, removes just the one box `pendingWaitingId` points
to — orphaning every earlier box. Fix entirely in `src/components/chat/ChatPanel.tsx` by
making each command self-clean when its output capture finishes, since `finishCapture`
already has `waitingMsgId`, `command`, `output`, and `cancelled` in scope.

- [x] 4.1 In `finishCapture` (inside `handleInjectToTerminal`), after computing the result, update the message list: on success, convert the `waitingMsgId` message from `terminal-waiting` to `tool-ran` with `command` = the run command and `content` = captured output; on cancel, remove the message
- [x] 4.2 In `finishCapture`, clear `pendingWaitingId.current` when it equals `waitingMsgId`, so a completed command no longer relies on `agent-done` for cleanup and a later command's id is not clobbered
- [x] 4.3 Remove the now-dead `agent-tool-ran` listener (`ChatPanel.tsx:135-147`); the backend no longer emits it and `finishCapture` now owns the waiting→result transition
- [x] 4.4 Keep `agent-done` as a safety net that clears any still-pending box, no longer the primary cleanup for completed commands

## 5. Verify Fix

- [x] 5.1 Ask "SSH to web-server as admin" and confirm BOTH the host-lookup and ssh waiting boxes resolve — none lingers after the turn ends
- [x] 5.2 Confirm a successful command's box becomes a `tool-ran` block showing `$ command` and its captured output
- [x] 5.3 Confirm clicking 取消 on a box still removes it and reports cancellation to the agent
- [x] 5.4 Confirm a single-command request (no skill chaining) still resolves its box correctly
