## Context

`TitleBar.tsx` renders a custom title bar (the window has `decorations: false`). It currently has three 12px circle buttons on the left (macOS dot pattern) and a settings gear on the right. The component uses `@tauri-apps/api/window` for window actions and inline `React.CSSProperties` for all styling. The app's design language uses warm neutral CSS tokens defined in `index.css`.

## Goals / Non-Goals

**Goals:**
- Windows-native placement (right side), order (min → max/restore → close), and icon style
- Hover feedback consistent with the warm neutral palette
- Correct maximize/restore icon toggle reflecting live window state

**Non-Goals:**
- Animating the icon swap
- Supporting dark mode variants (no dark token set exists yet)
- Changing title text or font

## Decisions

**SVG icons over Unicode**
Rationale: The body font is Kalam (cursive). Unicode symbols like `─ □ ✕` render inconsistently across Windows font stacks in a cursive context. Inline SVG with explicit `strokeWidth` guarantees pixel-consistent rendering regardless of font.

SVG viewBox `0 0 10 10`, `stroke="currentColor"`, `fill="none"`:
- Minimize: horizontal line at y=5 (x: 1.5–8.5)
- Maximize: rect from (1,1) to (9,9)
- Restore: back rect (2.5,0.5)→(9.5,7.5) + front rect (0.5,2.5)→(7.5,9.5) with `fill="var(--bg-titlebar)"` to mask the overlap
- Close: two diagonal lines crossing center

**Hover via React state, not CSS classes**
Rationale: The component already uses inline `React.CSSProperties`. Adding a CSS class just for hover would mix two styling systems. Tracking `hoveredBtn: 'min'|'max'|'close'|null` with `onMouseEnter/Leave` stays consistent with the existing pattern.

**`isMaximized` state via `onResized` listener**
Rationale: Tauri doesn't fire a dedicated "maximized" event. Calling `win.isMaximized()` after every `onResized` event is the standard pattern. The listener is registered in a `useEffect` and cleaned up on unmount.

**Close button hover color: `#c0392b`**
Rationale: Pure red (`#ff0000`) clashes with the warm neutral palette. `#c0392b` is a brick-red that reads as "danger" while harmonising with `--border: #2a2a28`.

**`data-tauri-drag-region` on title span only, not the bar**
Rationale: On Windows WebView2, placing `data-tauri-drag-region` on a parent container can intercept mousedown events on child buttons, making React state-driven handlers (like opening the settings modal) unreliable. Tauri is documented to skip interactive elements, but in practice this is not guaranteed on WebView2. The fix is to put `data-tauri-drag-region` exclusively on the title `<span>` — the only element that should initiate a window drag. Buttons on either side are outside the drag region and receive events cleanly.

## Risks / Trade-offs

`onResized` fires on every resize drag, not just maximize/restore → `isMaximized()` is called frequently.
Mitigation: `isMaximized()` is a lightweight IPC call; no debounce needed for a title bar button.

Restore icon uses `fill="var(--bg-titlebar)"` to simulate occlusion between the two overlapping rects → if `--bg-titlebar` ever changes (dark mode), the fill will follow automatically.

## Open Questions

None — scope is fully defined.
