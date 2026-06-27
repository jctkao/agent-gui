## Why

Users who need to SSH into remote machines from within the agent-gui Tauri app currently have to look up IPs manually and type commands themselves. An automated skill would let the AI handle hostname resolution and terminal setup end-to-end.

## What Changes

- New `ssh-connect` skill (`skills/ssh-connect/SKILL.md`) that Claude activates when the user asks to SSH into a remote machine
- `App.tsx` gains a one-line bridge exposing `useWorkspaceStore` to `window.__workspaceStore` so the skill can read and mutate workspace state from `webview_execute_js` calls

## Capabilities

### New Capabilities
- `ssh-connect`: A Claude skill that extracts a hostname and optional username from the user's message, resolves the host IP via the existing host-lookup skill, then opens (or reuses) a terminal tab in the Tauri workspace and runs the SSH command inside it

### Modified Capabilities
- `workspace-store`: Expose `useWorkspaceStore` to `window.__workspaceStore` after mount so external JS (MCP webview tools) can read and call store actions

## Impact

- `src/App.tsx` — one-line addition to expose the store to `window`
- `skills/ssh-connect/SKILL.md` — new file
- Depends on `host-lookup` skill being installed at `$HOME/.agent-skills/host-lookup/`
- Depends on Tauri MCP server tools: `webview_execute_js`, `ipc_execute_command`
