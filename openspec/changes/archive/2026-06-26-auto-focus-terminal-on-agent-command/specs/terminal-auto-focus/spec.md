## ADDED Requirements

### Requirement: Terminal tab auto-focus on agent command
When the agent sends a command to the terminal, the UI SHALL automatically switch the active workspace tab to the target terminal tab and focus the xterm instance so the user can immediately press Enter.

#### Scenario: Agent commands to existing terminal tab
- **WHEN** the agent emits a command and the active tab is already a terminal with a valid PTY
- **THEN** the system SHALL keep that tab active, bring the Tauri window to the foreground, and focus the terminal

#### Scenario: Agent commands and no terminal is active
- **WHEN** the agent emits a command and no terminal tab is currently active
- **THEN** the system SHALL create a new terminal tab, wait for its PTY to initialize, switch to that tab, and focus the terminal

#### Scenario: Focus timing
- **WHEN** the tab switch triggers a DOM re-render
- **THEN** the terminal focus MUST be deferred until the terminal element is visible (≥80ms after tab switch)
