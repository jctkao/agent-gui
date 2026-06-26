## 1. Update SettingsModal

- [x] 1.1 Add `appActions` filter alongside `browserActions` in `SettingsModal.tsx` (filter `ACTION_DEFINITIONS` by `context === "app"`)
- [x] 1.2 Render an "App Shortcuts" section above the browser table: heading, "takes effect immediately" description text, and a `<table>` mapping `appActions` through `KeybindingRow`
- [x] 1.3 Add a "Browser Shortcuts" heading above the existing browser table and keep the "next page load" caveat description under it (remove from the shared header area)

## 2. Verify

- [x] 2.1 Open settings → Keyboard Shortcuts: confirm app shortcuts table appears with all 7 app actions
- [x] 2.2 Remap an app shortcut, close settings, confirm the new key triggers the action immediately
- [x] 2.3 Confirm "Restore all defaults" resets both app and browser overrides
- [x] 2.4 Confirm browser table description still shows the page-load caveat; app table description does not
