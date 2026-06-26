# App Shortcuts

## Purpose

Defines the global keyboard shortcut dispatcher and all app-level shortcut actions, including focus management, tab navigation, and settings access.

## Requirements

### Requirement: Global shortcut dispatcher resolves configurable bindings
The system SHALL maintain a global keyboard event listener that reads user-configured keybinding overrides from storage, resolves them against defaults, and dispatches the corresponding action when a matching key combination is pressed anywhere in the app.

#### Scenario: Default binding triggers action
- **WHEN** the user presses `Alt+N` with no custom overrides configured
- **THEN** the chat input SHALL receive focus

#### Scenario: Custom override triggers action
- **WHEN** the user has rebound `focus_chat` to `Ctrl+Shift+C` via the settings UI
- **THEN** pressing `Ctrl+Shift+C` SHALL focus the chat input, and `Alt+N` SHALL have no effect

### Requirement: Focus chat panel shortcut
The system SHALL focus the chat panel's text input when the `focus_chat` action is triggered.

#### Scenario: Chat input receives focus
- **WHEN** the `focus_chat` shortcut is pressed
- **THEN** the text input at the bottom of the chat panel SHALL receive keyboard focus and be ready for typing

### Requirement: Focus workspace shortcut
The system SHALL focus the active pane's content when the `focus_workspace` action is triggered.

#### Scenario: Focus terminal pane
- **WHEN** the `focus_workspace` shortcut is pressed and the active tab is a terminal
- **THEN** the xterm.js terminal instance SHALL receive keyboard focus

#### Scenario: Focus browser pane
- **WHEN** the `focus_workspace` shortcut is pressed and the active tab is a browser
- **THEN** the native browser overlay webview SHALL receive focus via the `browser_focus` Tauri command

#### Scenario: Focus non-interactive pane
- **WHEN** the `focus_workspace` shortcut is pressed and the active tab is a file explorer or editor
- **THEN** no focus action is taken (these panes have no meaningful keyboard entry point yet)

### Requirement: Tab navigation shortcuts
The system SHALL select adjacent tabs via `tab_prev` and `tab_next` actions, and jump to boundary tabs via `tab_first` and `tab_last`.

#### Scenario: Navigate to previous tab
- **WHEN** the `tab_prev` shortcut is pressed and there is a tab to the left of the current tab
- **THEN** that tab SHALL become active and its pane content SHALL receive focus

#### Scenario: Navigate to next tab
- **WHEN** the `tab_next` shortcut is pressed and there is a tab to the right of the current tab
- **THEN** that tab SHALL become active and its pane content SHALL receive focus

#### Scenario: Stop at first tab boundary
- **WHEN** the `tab_prev` shortcut is pressed and the first tab is already active
- **THEN** no action is taken (no wrap-around)

#### Scenario: Stop at last tab boundary
- **WHEN** the `tab_next` shortcut is pressed and the last tab is already active
- **THEN** no action is taken (no wrap-around)

#### Scenario: Jump to first tab
- **WHEN** the `tab_first` shortcut is pressed
- **THEN** the first tab SHALL become active and its pane content SHALL receive focus

#### Scenario: Jump to last tab
- **WHEN** the `tab_last` shortcut is pressed
- **THEN** the last tab SHALL become active and its pane content SHALL receive focus

### Requirement: Auto-focus pane after tab selection shortcut
The system SHALL automatically focus the newly selected tab's pane content after any tab navigation shortcut.

#### Scenario: Auto-focus after tab switch
- **WHEN** a tab navigation shortcut activates a new tab
- **THEN** the new tab's pane content SHALL receive focus automatically (terminal → xterm focus, browser → webview focus)

### Requirement: Open settings shortcut
The system SHALL open the settings modal when the `open_settings` action is triggered.

#### Scenario: Settings modal opens
- **WHEN** the `open_settings` shortcut is pressed
- **THEN** the settings modal SHALL open

#### Scenario: Browser overlay hidden when settings opens
- **WHEN** the `open_settings` shortcut is pressed and the active tab is a browser pane
- **THEN** the browser overlay SHALL be hidden before the modal opens, and restored when the modal closes
