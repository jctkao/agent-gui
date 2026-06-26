## 1. Focus snapshot and conditional terminal focus

- [x] 1.1 Add `shouldFocusCancelRef = useRef(false)` to `ChatPanel`
- [x] 1.2 In the `agent-command-to-terminal` listener, snapshot `document.activeElement?.id === "chat-input"` into `shouldFocusCancelRef.current` before calling `handleInjectToTerminal`
- [x] 1.3 Add a `chatHasFocus` parameter to `handleInjectToTerminal` and skip `getTerminal(targetTabId)?.focus()` when it is `true`

## 2. Cancel button auto-focus

- [x] 2.1 Replace the `<button onClick={() => handleCancel(msg.id)}>` in the `terminal-waiting` render branch with a callback ref that calls `el.focus()` and resets `shouldFocusCancelRef.current` to `false` when `shouldFocusCancelRef.current` is true
