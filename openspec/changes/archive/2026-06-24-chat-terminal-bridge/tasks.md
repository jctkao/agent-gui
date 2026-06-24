## 1. Extend Workspace Store

- [x] 1.1 Add `ptyId?: string` to the `Pane` interface in `src/store/workspace.ts`
- [x] 1.2 Add `setPtyId: (tabId: string, ptyId: string) => void` action to the Zustand store

## 2. Wire TerminalPane to Store

- [x] 2.1 In `src/components/workspace/panes/TerminalPane.tsx`, read `setPtyId` from the workspace store
- [x] 2.2 Call `setPtyId(pane.id, ptyId)` immediately after `pty_create` resolves successfully

## 3. Implement Chat-to-Terminal Command Sending

- [x] 3.1 In `src/components/chat/ChatPanel.tsx`, replace stub messages with real `useState<Message[]>` initialized empty
- [x] 3.2 Read `tabs`, `activeTabId`, and `addTab` from the workspace store in `ChatPanel`
- [x] 3.3 In `handleSend`, find the active terminal tab (type `"terminal"` with a populated `ptyId`)
- [x] 3.4 If no terminal tab exists, call `addTab` to create a new PowerShell terminal tab
- [x] 3.5 Implement a `waitForPtyId(tabId, timeout=5000)` helper that polls the store until `ptyId` is set or times out
- [x] 3.6 Call `invoke("pty_write", { id: ptyId, data: encode(cmd + "\n") })` to send the command
- [x] 3.7 Add the user's message to the messages state before sending

## 4. Implement Output Capture and Display

- [x] 4.1 After sending the command, subscribe to `pty-data-{ptyId}` events using `listen`
- [x] 4.2 Accumulate raw byte arrays for 1.5 seconds, then unsubscribe
- [x] 4.3 Implement `stripAnsi(text: string): string` using regex `/\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\r/g`
- [x] 4.4 Decode accumulated bytes as UTF-8, apply `stripAnsi`, strip leading line that matches the sent command
- [x] 4.5 If output is non-empty, add it as an assistant message; if `waitForPtyId` timed out, add an error message instead

## 5. Verify

- [x] 5.1 Run the app, open a terminal tab, type a command in the chat input, verify it appears and executes in the terminal
- [x] 5.2 Verify the command output appears in the chat panel as an assistant-style message
- [x] 5.3 Close all terminal tabs, send a command from chat, verify a new terminal tab auto-opens and the command runs
