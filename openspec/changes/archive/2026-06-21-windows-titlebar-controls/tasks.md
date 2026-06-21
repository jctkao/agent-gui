## 1. State and layout restructure

- [x] 1.1 Add `isMaximized` state and `useEffect` with `win.isMaximized()` initial query and `win.onResized()` listener with cleanup
- [x] 1.2 Add `hoveredBtn` state (`'min' | 'max' | 'close' | null`) for hover tracking
- [x] 1.3 Restructure the flex layout: `[settingsBtn] [title flex-1] [windowControls]`

## 2. SVG icons

- [x] 2.1 Implement minimize SVG (horizontal line, viewBox 0 0 10 10)
- [x] 2.2 Implement maximize SVG (square outline rect)
- [x] 2.3 Implement restore SVG (two overlapping rects, front rect fills `var(--bg-titlebar)`)
- [x] 2.4 Implement close SVG (two diagonal crossing lines)

## 3. Button wiring and styles

- [x] 3.1 Render three buttons in order (min → max/restore → close), each with `onMouseEnter/Leave` updating `hoveredBtn`
- [x] 3.2 Apply hover background styles inline: `rgba(0,0,0,0.08)` for min/max, `#c0392b` for close
- [x] 3.3 Apply white icon color on close hover (`color: hoveredBtn === 'close' ? 'white' : 'var(--text-muted)'`)
- [x] 3.4 Remove old `dot`, `dots` styles; add new `winBtn` style (44×40px, no border, no border-radius, cursor pointer)
- [x] 3.5 Move `settingsBtn` to left of title, verify drag region still covers the title span
- [x] 3.6 Remove `data-tauri-drag-region` from bar div (Windows WebView2 intercepts child button clicks); keep it only on the title `<span>`
