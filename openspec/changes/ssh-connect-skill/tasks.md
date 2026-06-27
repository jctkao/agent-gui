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

- [ ] 3.1 Run the app and confirm `window.__workspaceStore.getState()` is accessible from the browser console
- [ ] 3.2 With a terminal tab active, ask Claude "SSH to web-server as admin" and confirm the SSH command appears in the terminal
- [ ] 3.3 With a non-terminal tab active, ask Claude to SSH and confirm a new terminal tab opens and the command runs in it
- [ ] 3.4 Ask without a username and confirm Claude asks for one before proceeding
- [ ] 3.5 Use an unknown hostname and confirm Claude reports it was not found
