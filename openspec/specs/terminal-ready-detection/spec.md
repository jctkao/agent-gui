## Purpose

Defines how the system detects that a newly created terminal is ready before injecting commands, ensuring startup output is fully drained before the capture listener is registered.

## Requirements

### Requirement: New terminal must drain startup output before command injection
When `handleInjectToTerminal` creates a new terminal tab (no existing terminal), it SHALL wait for the shell's initial prompt to appear in the PTY stream before injecting the agent's command or registering the capture listener.

#### Scenario: Initial prompt detected, then command injected
- **WHEN** a new terminal tab is created and `waitForInitialPrompt` is called
- **THEN** the helper listens on `pty-data-${ptyId}`, and resolves only after a line matching `looksLikePrompt` is detected in the accumulated output

#### Scenario: Timeout if prompt never appears
- **WHEN** `waitForInitialPrompt` has been waiting for more than 10 seconds without detecting a prompt line
- **THEN** the helper rejects, and `handleInjectToTerminal` falls through to the `ptyId = null` failure path (invoking `agent_terminal_result` with `cancelled: true` and "Failed to open terminal.")

### Requirement: Capture listener only starts after startup output is drained
After `waitForInitialPrompt` resolves, the system SHALL call `snapshotPrompt` and then inject the command via `pty_write`, with the capture listener registered only after that sequence.

#### Scenario: Capture listener registered after injection, not before
- **WHEN** `waitForInitialPrompt` resolves
- **THEN** `snapshotPrompt` is called, then `pty_write` injects the command, then `listen(pty-data-${ptyId})` registers the capture listener — in that order

#### Scenario: No false-positive finishCapture from startup output
- **WHEN** the capture listener is active on a newly created terminal
- **THEN** it SHALL NOT receive any `pty-data` events that originated from PowerShell's startup banner or initial prompt (those have already been consumed by `waitForInitialPrompt`)
