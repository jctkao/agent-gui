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

### Requirement: Prompt detection uses the terminal's actual prompt as the boundary marker
Before injecting a command, the system SHALL read the last non-empty line from xterm's active buffer to use as the prompt boundary, falling back to the regex `/^PS .*>\s*$/` if the buffer read fails.

#### Scenario: Snapshot-based prompt detection
- **WHEN** the prompt is successfully read from xterm's buffer before injection
- **THEN** the captured text is used as the literal string to match at the start of the next prompt line

#### Scenario: Regex fallback
- **WHEN** the xterm buffer read returns an empty or whitespace-only string
- **THEN** the system uses the pattern `/^PS .*>\s*$/m` to detect the next prompt
