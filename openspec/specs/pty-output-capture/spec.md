# Spec: PTY Output Capture

## Purpose

Defines how the frontend captures terminal output after a command is injected into the PTY, detects command completion via prompt detection, and handles cancellation and listener cleanup.

## Requirements

### Requirement: Frontend captures PTY output between command injection and next prompt
After writing a command to the PTY, the system SHALL listen to `pty-data-<ptyId>` events, accumulate bytes, strip ANSI escape codes, and detect the next PowerShell prompt line to delimit the command's output.

#### Scenario: Normal command output captured
- **WHEN** the user presses Enter and the command produces output followed by a new PS prompt
- **THEN** the system extracts all lines between the command echo and the prompt, trims them, and passes the result to `agent_terminal_result` as `output`

#### Scenario: Empty output command
- **WHEN** the user presses Enter and the command produces no output (only a new prompt)
- **THEN** `agent_terminal_result` is called with an empty `output` string and `cancelled: false`

### Requirement: Ctrl+C in the terminal is treated as a cancellation
If the user presses Ctrl+C to clear the pre-typed command instead of executing it, the system SHALL detect this as a cancellation.

#### Scenario: User presses Ctrl+C
- **WHEN** the PTY output after command injection contains `^C` followed immediately by a new prompt with no intervening output
- **THEN** `agent_terminal_result` is called with `cancelled: true`

### Requirement: PTY listener is cleaned up after each capture session
The `pty-data-<ptyId>` listener started for output capture SHALL be unregistered after `agent_terminal_result` is invoked, whether the result is success or cancellation.

#### Scenario: Listener cleanup on success
- **WHEN** a prompt is detected and `agent_terminal_result` is called
- **THEN** the `pty-data-<ptyId>` unlisten function is called and the accumulation buffer is cleared

#### Scenario: Listener cleanup on cancel
- **WHEN** the user clicks Cancel in Chat or Ctrl+C is detected
- **THEN** the `pty-data-<ptyId>` unlisten function is called before invoking `agent_terminal_result`

### Requirement: Prompt detection uses a universal heuristic in addition to the terminal snapshot
Before injecting a command, the system SHALL read the last non-empty line from xterm's active buffer to use as the primary prompt boundary. When the snapshot-based match fails, the system SHALL fall back to a universal prompt-ending heuristic that recognizes common shell prompt suffixes, rather than a PowerShell-only regex.

#### Scenario: Snapshot-based prompt detection
- **WHEN** the prompt is successfully read from xterm's buffer before injection
- **THEN** the captured text is used as the literal string to `endsWith`-match against each candidate line in the PTY stream

#### Scenario: Universal heuristic fallback — Linux bash/zsh prompt
- **WHEN** the snapshot does not match any line in the PTY stream
- **AND** a line that is 120 characters or shorter ends with one of the prompt characters `$`, `#`, `>`, `%`, or `❯` after ANSI stripping and right-trimming (a trailing space, if any, is ignored)
- **THEN** that line is treated as the prompt boundary and output capture completes

#### Scenario: Universal heuristic fallback — PowerShell prompt
- **WHEN** the snapshot does not match any line in the PTY stream
- **AND** a line ends with `>` after right-trimming and is 120 characters or shorter
- **THEN** that line is treated as the prompt boundary and output capture completes

#### Scenario: Long line ending in prompt-like character is not a false positive
- **WHEN** a line in the PTY stream ends with a prompt character but the right-trimmed line is longer than 120 characters
- **THEN** the heuristic does NOT treat it as a prompt; output accumulation continues
