## Context

The Keyboard Shortcuts settings tab already renders a table of browser-context actions using `KeybindingRow`. The `ACTION_DEFINITIONS` array in `keybindings.ts` includes both `"browser"` and `"app"` context actions, and the overrides system already persists and applies both contexts end-to-end. The only gap is the UI filter on line 76 of `SettingsModal.tsx` which excludes app actions from the rendered table.

## Goals / Non-Goals

**Goals:**
- Display app-level shortcuts in the settings UI so users can view and remap them.
- Keep the two contexts visually separated (two tables with headings).
- Show context-appropriate description text (page-load caveat only for browser section).

**Non-Goals:**
- Changes to the shortcuts storage, conflict detection, or `App.tsx` dispatch logic.
- Renaming the sidebar tab or restructuring the settings layout.
- Adding new app actions.

## Decisions

**Two separate tables, not one flat table with a divider row.**
Rationale: The two contexts have different semantics (app shortcuts fire immediately; browser shortcuts apply on next page load). Separate tables let each carry its own description text naturally, and avoids needing a special "section row" type in the table.

**Reuse `KeybindingRow` unchanged.**
Both contexts already work with the same `onSave`/`onReset` callbacks and `effectiveMap`. No component changes needed.

**Description text split by section.**
Move "Changes take effect on the next page load" under the browser table header only. Add "Changes take effect immediately" under the app table header.

## Risks / Trade-offs

- **Scroll length increases** — two tables means more content; the panel already has `overflowY: auto` so this is handled.
- No migration needed; existing overrides are already stored for both contexts and will render correctly once the filter is removed.
