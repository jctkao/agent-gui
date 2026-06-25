# Keybinding Store

## Purpose

Manages the definition of all bindable actions and the persistence/resolution of user keybinding overrides.

## Requirements

### Requirement: Action definition table
The system SHALL maintain a static definition table of all bindable actions. Each entry SHALL include an `id` (kebab-case string), a human-readable `label`, a `context` (`"browser"` or `"app"`), and a `defaultKey` (string encoding the key or sequence, e.g. `"j"`, `"gg"`, `"Ctrl+,"`).

#### Scenario: Browser actions are defined
- **WHEN** the keybinding module is loaded
- **THEN** all ten browser vimium actions (scroll_down, scroll_up, scroll_half_down, scroll_half_up, scroll_to_top, scroll_to_bottom, history_back, history_forward, reload, hint_mode) are present in the table with their default keys

#### Scenario: App-context slots exist
- **WHEN** the keybinding module is loaded
- **THEN** app-context action slots are present in the table (e.g. open_settings, focus_chat) with `context: "app"` and a `defaultKey`, even if unimplemented

### Requirement: Override storage
The system SHALL persist user keybinding overrides as a JSON object in the existing SQLite `settings` table under the key `"keybindings"`. Only actions whose current key differs from the default SHALL be stored; unmodified actions SHALL NOT appear in the stored JSON.

#### Scenario: Saving an override
- **WHEN** the user rebinds an action to a new key and saves
- **THEN** that action's id and new key are written to SQLite under `"keybindings"`

#### Scenario: Resetting to default removes override
- **WHEN** the user resets an action to its default key
- **THEN** that action's id is removed from the stored JSON

#### Scenario: Restoring all defaults
- **WHEN** the user triggers "Restore all defaults"
- **THEN** the `"keybindings"` entry in SQLite is deleted or set to `{}`

### Requirement: Effective binding resolution
The system SHALL resolve the effective key for each action by merging the action definition table with stored overrides: an override replaces the default; an absent override means the default applies.

#### Scenario: Override present
- **WHEN** an action has an override stored in SQLite
- **THEN** the resolved effective key is the override value

#### Scenario: No override present
- **WHEN** no override exists for an action
- **THEN** the resolved effective key is the action's `defaultKey`

### Requirement: Binding injection into browser overlay
The system SHALL inject effective browser-context bindings into the browser overlay webview as `window.__bindings` before `vimium.js` executes on every page load.

#### Scenario: Bindings available in vimium.js
- **WHEN** a page finishes loading in the browser overlay
- **THEN** `window.__bindings` is set to a map of action id → effective key before vimium.js runs

#### Scenario: vimium.js reads from window.__bindings
- **WHEN** vimium.js executes
- **THEN** all key handlers use `window.__bindings` values instead of hardcoded key literals
