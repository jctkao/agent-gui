## Why

When a page has 15 or more clickable elements, the current hint label algorithm assigns `s` to one element and `ss`, `sa`, … to others. Because `s` is a prefix of `ss`, typing `s` never produces a unique match — the hint overlay stays open indefinitely and the element labeled `s` cannot be activated. This breaks the core hint-mode contract for any moderately link-heavy page.

## What Changes

- Fix `generateLabels()` in `vimium.js` to produce a **prefix-free** label set: if a character is used as the first character of a two-char label, it is not also assigned as a single-char label.
- Update the spec scenario describing two-char label assignment to reflect the prefix-free invariant.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `browser-vimium-mode`: Hint label assignment now guarantees the prefix-free property — typing a single-char hint always resolves to exactly one element, even when two-char hints share that character as a prefix.

## Impact

- **`src-tauri/src/vimium.js`** — `generateLabels()` function only; no other logic changes.
- **`openspec/changes/browser-vimium-mode/specs/browser-vimium-mode/spec.md`** — scenario "Two-char labels for large pages" updated to describe prefix-free assignment.
- No Rust, React, or Tauri command changes.
