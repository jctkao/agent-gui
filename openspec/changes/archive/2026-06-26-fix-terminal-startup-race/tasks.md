## 1. Add waitForInitialPrompt helper

- [x] 1.1 In `src/components/chat/ChatPanel.tsx`, add a `waitForInitialPrompt(ptyId: string, timeout?: number): Promise<void>` function that listens on `pty-data-${ptyId}`, accumulates decoded bytes, strips ANSI, and resolves when any line matches `looksLikePrompt`
- [x] 1.2 Add a timeout (default 10 000 ms) that rejects the promise and cleans up the listener if no prompt appears in time

## 2. Call waitForInitialPrompt in the new-terminal branch

- [x] 2.1 In `handleInjectToTerminal`, inside the `else` branch (new terminal created), call `await waitForInitialPrompt(ptyId)` after `ptyId` is confirmed non-null and before `snapshotPrompt` and `pty_write`
- [x] 2.2 Wrap the call in a try/catch so a timeout rejection falls through to the existing `ptyId = null` failure path (invoke `agent_terminal_result` with `cancelled: true`)
