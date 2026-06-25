## ADDED Requirements

### Requirement: App-level shortcuts work regardless of focused pane
App-level keyboard shortcuts SHALL fire regardless of whether the main webview, the browser overlay webview, or a terminal pane currently holds OS or DOM focus.

#### Scenario: Tab navigation shortcut from browser
- **WHEN** the browser overlay webview has focus and the user presses an app-level tab shortcut (e.g., Alt+j)
- **THEN** the active workspace tab changes exactly as it would if the main webview had focus

#### Scenario: Focus-chat shortcut from browser
- **WHEN** the browser overlay webview has focus and the user presses the focus-chat shortcut (e.g., Alt+n)
- **THEN** OS keyboard focus moves to the main webview and the chat input receives DOM focus

#### Scenario: Tab navigation shortcut from terminal
- **WHEN** a terminal pane has focus and the user presses an app-level tab shortcut (e.g., Alt+k)
- **THEN** the active workspace tab changes; the shortcut key is NOT forwarded to the shell

#### Scenario: Focus-chat shortcut from terminal
- **WHEN** a terminal pane has focus and the user presses the focus-chat shortcut (e.g., Alt+n)
- **THEN** the chat input receives focus; the shortcut key is NOT forwarded to the shell

#### Scenario: Open-settings shortcut from browser
- **WHEN** the browser overlay webview has focus and the user presses the open-settings shortcut (e.g., Ctrl+,)
- **THEN** the settings modal opens
