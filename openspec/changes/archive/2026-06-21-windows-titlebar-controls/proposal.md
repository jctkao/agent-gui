## Why

The current TitleBar uses macOS-style circular dots for window controls, but this is a Windows desktop app. Switching to Windows-native icons and placement improves platform consistency and user familiarity.

## What Changes

- Move window control buttons (minimize, maximize/restore, close) from the left side to the right side of the title bar
- Change button order to Windows native: minimize → maximize/restore → close
- Replace circle dots with inline SVG icons (─, □/❐, ✕)
- Add hover effects: min/max show subtle dark overlay, close button shows warm brick-red background with white icon
- Track window maximized state; swap maximize icon (□) for restore icon (❐) when window is maximized
- Move the Settings button (⚙) to the left side, to the left of the app title

## Capabilities

### New Capabilities

- `window-controls`: Windows-style title bar window control buttons with correct placement, order, icons, hover states, and maximize/restore toggle

### Modified Capabilities

<!-- none — this is a UI-only change to a single component -->

## Impact

- `src/components/layout/TitleBar.tsx` — sole file modified
- No new dependencies; uses existing `@tauri-apps/api/window` (`isMaximized`, `onResized`)
- No Rust changes, no capability permission changes
