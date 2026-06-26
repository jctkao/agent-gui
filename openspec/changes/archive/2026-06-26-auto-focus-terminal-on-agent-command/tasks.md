## 1. Implementation

- [x] 1.1 In `ChatPanel.handleInjectToTerminal`, after PTY is confirmed valid, call `store.setActiveTab(targetTabId)` and `setTimeout(() => { invoke("main_focus"); getTerminal(targetTabId)?.focus(); }, 80)`

## 2. Verification

- [x] 2.1 Start the app, send an agent message that triggers a terminal command — confirm the workspace switches to the terminal tab automatically
- [x] 2.2 Verify the terminal has keyboard focus so pressing Enter executes the command without clicking
- [x] 2.3 Verify the flow also works when no terminal tab exists yet (agent creates a new one)
