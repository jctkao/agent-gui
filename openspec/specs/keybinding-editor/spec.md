# Keybinding Editor

## Purpose

Provides the UI for viewing and editing keybindings in the Settings modal's Keyboard Shortcuts tab.

## Requirements

### Requirement: Editable keybinding table
The Settings modal's Keyboard Shortcuts tab SHALL display all bindable actions as an editable table. Each row SHALL show the action label, the current effective key, a capture button, and a per-row reset button.

#### Scenario: Table renders current effective bindings
- **WHEN** the user opens the Keyboard Shortcuts tab
- **THEN** each row shows the action's effective key (override if set, else default)

#### Scenario: Overridden binding is visually distinguished
- **WHEN** an action has a user override
- **THEN** the row is visually marked (e.g. bold key, asterisk, or highlight) to indicate it differs from the default

### Requirement: Key capture interaction
Clicking the capture button for a row SHALL enter capture mode for that row. In capture mode the system SHALL record the next key or key sequence pressed and propose it as the new binding. Only one row may be in capture mode at a time.

#### Scenario: Single-key capture
- **WHEN** the user clicks a row's capture button then presses a single key (e.g. `n`)
- **THEN** after the 1-second sequence window expires, the proposed binding is `"n"`

#### Scenario: Sequence capture (multi-key)
- **WHEN** the user clicks a row's capture button, presses `g`, then presses `g` again within 1 second
- **THEN** the proposed binding is `"gg"`

#### Scenario: Modifier combo capture
- **WHEN** the user clicks a row's capture button then presses Ctrl+Comma
- **THEN** the proposed binding is `"Ctrl+,"`

#### Scenario: Escape cancels capture
- **WHEN** the user presses Escape during capture mode
- **THEN** capture is cancelled and the binding is unchanged

#### Scenario: Clicking outside cancels capture
- **WHEN** the user clicks anywhere outside the capturing row while in capture mode
- **THEN** capture is cancelled and the binding is unchanged

### Requirement: Conflict detection — direct conflict
The system SHALL prevent saving if two actions in the same context are bound to the same key.

#### Scenario: Duplicate key blocked
- **WHEN** the user proposes a key already bound to another action in the same context
- **THEN** a warning identifies the conflicting action and the save button is disabled for that row

### Requirement: Conflict detection — prefix conflict
The system SHALL prevent saving if the proposed key is a prefix of an existing binding, or an existing binding is a prefix of the proposed key, within the same context.

#### Scenario: Proposed key is a prefix of existing sequence
- **WHEN** the user proposes `"g"` and `"gg"` is already bound to another action
- **THEN** a warning explains the prefix conflict and the save button is disabled

#### Scenario: Proposed sequence has existing binding as prefix
- **WHEN** the user proposes `"gg"` and `"g"` is already bound to another action
- **THEN** a warning explains the prefix conflict and the save button is disabled

### Requirement: Per-row reset
Each row SHALL have a reset button that restores the action to its default key. The reset button SHALL be disabled (or hidden) when the action is already at its default.

#### Scenario: Reset restores default
- **WHEN** the user clicks the reset button on a row with an override
- **THEN** the row reverts to the default key and the override is removed from the store

#### Scenario: Reset button inactive on default rows
- **WHEN** an action's effective key equals its default key
- **THEN** the per-row reset button is disabled or hidden

### Requirement: Restore all defaults
The Keyboard Shortcuts tab SHALL include a "Restore all defaults" button that resets every binding to its default and clears all stored overrides.

#### Scenario: Restore all defaults clears overrides
- **WHEN** the user clicks "Restore all defaults" and confirms
- **THEN** all rows revert to their default keys and no overrides remain in SQLite

### Requirement: Changes take effect on next page load
Binding changes saved by the user SHALL take effect the next time a page loads in the browser overlay (via navigation or reload). No immediate re-injection is required.

#### Scenario: Saved binding active after reload
- **WHEN** the user saves a new binding for scroll_down to `"n"`, then reloads the browser overlay page
- **THEN** pressing `n` scrolls the page down and `j` no longer scrolls
