## Why

The current settings modal is a flat 420px dialog that does not scale as more settings categories are added. Adopting an Obsidian-style two-panel layout now gives room for future settings sections without redesigning again.

## What Changes

- `SettingsModal.tsx` is refactored from a flat single-column dialog into a two-panel layout with a left sidebar for tab navigation and a right scrollable content area
- Modal size changes from a fixed 420px width to 75vw × 75vh
- Two tabs are added to the sidebar: **AI Models** (existing settings) and **Keyboard Shortcuts** (new read-only reference panel)
- Each panel with editable fields retains its own per-panel Save button; read-only panels have no Save button

## Capabilities

### New Capabilities

- `settings-modal`: Two-panel Obsidian-style settings modal with sidebar tab navigation and per-panel content

### Modified Capabilities

<!-- None — no existing spec-level behavior changes; this is a UI refactor -->

## Impact

- `src/components/settings/SettingsModal.tsx` — full refactor (single file)
- No backend changes
- No new settings DB keys
- No changes to `TitleBar.tsx`, `lib/settings.ts`, or any Rust commands
