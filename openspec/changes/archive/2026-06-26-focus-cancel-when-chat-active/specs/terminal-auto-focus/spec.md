## MODIFIED Requirements

### Requirement: Terminal tab auto-focus on agent command
When the agent sends a command to the terminal, the UI SHALL automatically switch the active workspace tab to the target terminal tab. If the chat panel does NOT have keyboard focus at the moment the event fires, the xterm instance SHALL also receive focus so the user can immediately press Enter. If the chat panel DOES have keyboard focus, the xterm instance SHALL NOT receive focus; instead the cancel button in the terminal-waiting widget SHALL receive focus so the user can press Space to cancel.

#### Scenario: Agent commands to existing terminal tab — chat not focused
- **WHEN** the agent emits a command and the active tab is already a terminal with a valid PTY
- **AND** the chat panel does not have keyboard focus
- **THEN** the system SHALL keep that tab active, bring the Tauri window to the foreground, and focus the terminal

#### Scenario: Agent commands and no terminal is active — chat not focused
- **WHEN** the agent emits a command and no terminal tab is currently active
- **AND** the chat panel does not have keyboard focus
- **THEN** the system SHALL create a new terminal tab, wait for its PTY to initialize, switch to that tab, and focus the terminal

#### Scenario: Agent commands — chat is focused
- **WHEN** the agent emits a command (regardless of which terminal tab is active)
- **AND** the chat panel has keyboard focus at the moment the event fires (i.e., `document.activeElement` is `#chat-input`)
- **THEN** the system SHALL switch the workspace tab to the terminal (making the pending command visible)
- **AND** bring the Tauri window to the foreground
- **AND** NOT focus the terminal xterm instance
- **AND** focus the cancel button in the terminal-waiting widget so the user can press Space to cancel

#### Scenario: Focus timing
- **WHEN** the tab switch triggers a DOM re-render
- **THEN** terminal focus (when applicable) MUST be deferred until the terminal element is visible (≥80ms after tab switch)
- **AND** cancel button focus (when applicable) SHALL be applied as soon as the button mounts in the DOM
