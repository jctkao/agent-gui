## MODIFIED Requirements

### Requirement: Prompt detection uses a universal heuristic in addition to the terminal snapshot
Before injecting a command, the system SHALL read the last non-empty line from xterm's active buffer to use as the primary prompt boundary. When the snapshot-based match fails, the system SHALL fall back to a universal prompt-ending heuristic that recognizes common shell prompt suffixes, rather than a PowerShell-only regex.

#### Scenario: Snapshot-based prompt detection (unchanged)
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
