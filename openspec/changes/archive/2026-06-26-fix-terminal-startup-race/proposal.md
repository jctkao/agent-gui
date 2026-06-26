## Why

When the agent runs a terminal command and no terminal tab exists yet, PowerShell's startup output (banner text + initial prompt) races against the capture listener in ChatPanel, causing premature command completion — the agent receives garbage output and reports execution failure before the user has even confirmed the command.

## What Changes

- Add a `waitForInitialPrompt` helper in `ChatPanel.tsx` that listens on `pty-data-${ptyId}` and resolves once a shell prompt line is detected.
- In the new-terminal branch of `handleInjectToTerminal`, call `waitForInitialPrompt` before injecting the command and before snapshotting the prompt.
- The existing-terminal path is unchanged.

## Capabilities

### New Capabilities

- `terminal-ready-detection`: Detecting when a newly created terminal has finished its startup sequence and is ready to accept commands, so that the capture listener only sees post-injection output.

### Modified Capabilities

*(none — no spec-level behavior changes to existing capabilities)*

## Impact

- `src/components/chat/ChatPanel.tsx`: new `waitForInitialPrompt` function, modified `handleInjectToTerminal` new-terminal branch.
- No backend changes.
- No API or dependency changes.
