# Spec: Settings Modal

## Purpose

The settings modal provides a two-panel dialog for configuring application settings. The left sidebar lists available configuration tabs; the right content area displays the active panel's fields or reference information.

## Requirements

### Requirement: Two-panel layout
The settings modal SHALL render as a two-panel dialog: a fixed-width left sidebar for tab navigation and a scrollable right content area. The modal SHALL be sized at 75vw × 75vh relative to the current window.

#### Scenario: Modal opens at correct size
- **WHEN** the user clicks the settings button in the title bar
- **THEN** the modal appears at 75% of the current window width and 75% of the current window height

#### Scenario: Sidebar shows available tabs
- **WHEN** the modal is open
- **THEN** the left sidebar displays "AI Models" and "Keyboard Shortcuts" as selectable tab items

#### Scenario: Active tab is highlighted
- **WHEN** a tab is selected
- **THEN** that tab item displays a distinct active visual style (accent background and left border)

### Requirement: AI Models panel
The AI Models panel SHALL display input fields for Anthropic API Key, Ollama URL, and Ollama Model, and a per-panel Save button. It SHALL be the default active panel when the modal opens.

#### Scenario: AI Models is the default panel
- **WHEN** the modal first opens
- **THEN** the AI Models tab is active and its content is shown in the right area

#### Scenario: Fields are pre-populated from saved settings
- **WHEN** the AI Models panel is displayed
- **THEN** each input field shows the value currently stored in the settings DB

#### Scenario: User saves settings
- **WHEN** the user edits one or more fields and clicks 儲存
- **THEN** all three values are written to the settings DB and a brief confirmation is shown

### Requirement: Keyboard Shortcuts panel
The Keyboard Shortcuts panel SHALL display a read-only reference table of browser-pane vimium key bindings. It SHALL have no Save button.

#### Scenario: Switching to Keyboard Shortcuts panel
- **WHEN** the user clicks "Keyboard Shortcuts" in the sidebar
- **THEN** the right content area shows the read-only shortcuts table

#### Scenario: No Save button on read-only panel
- **WHEN** the Keyboard Shortcuts panel is active
- **THEN** no Save button is visible in the right content area

#### Scenario: Table lists all vimium bindings
- **WHEN** the Keyboard Shortcuts panel is displayed
- **THEN** the table includes entries for j/k, d/u, gg, G, H/L, r, f, and Esc with their descriptions
- **AND** a note states that shortcuts only apply in the Browser pane
