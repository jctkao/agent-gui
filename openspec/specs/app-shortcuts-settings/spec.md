# Spec: App Shortcuts Settings

## Purpose

Defines requirements for displaying and editing app-context keyboard shortcuts within the Settings Keyboard Shortcuts tab.

## Requirements

### Requirement: App shortcuts table visible in settings
The settings Keyboard Shortcuts tab SHALL display a dedicated "App Shortcuts" table listing all `"app"` context actions from `ACTION_DEFINITIONS`, rendered above the existing browser shortcuts table.

#### Scenario: App shortcuts table is shown
- **WHEN** user opens Settings and selects the "Keyboard Shortcuts" tab
- **THEN** an "App Shortcuts" table appears with all app-context actions (open_settings, focus_chat, focus_workspace, tab_prev, tab_next, tab_first, tab_last)

### Requirement: App shortcuts are editable
Each app-context action in the table SHALL be editable via `KeybindingRow`, with save and reset behavior identical to browser shortcuts.

#### Scenario: User remaps an app shortcut
- **WHEN** user edits an app-context action's key and saves
- **THEN** the new binding is persisted to the overrides store and takes effect immediately without a page reload

#### Scenario: User resets an app shortcut
- **WHEN** user clicks reset on an app-context action
- **THEN** the binding reverts to its default key

### Requirement: Section description text is context-specific
Each table SHALL display a description line that matches its context. The "next page load" caveat MUST appear only under the browser table. The app table MUST note that changes take effect immediately.

#### Scenario: App table description text
- **WHEN** user views the App Shortcuts table
- **THEN** the description reads that changes take effect immediately (no page reload required)

#### Scenario: Browser table description text
- **WHEN** user views the Browser Shortcuts table
- **THEN** the description retains the "Changes take effect on the next page load" caveat
