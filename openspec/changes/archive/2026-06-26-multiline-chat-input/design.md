## Context

`ChatPanel.tsx` uses a single-line `<input>` for the chat entry field. The component is self-contained; no shared state store is involved. History and input value are local React state/refs.

## Goals / Non-Goals

**Goals:**
- Auto-growing textarea (1-line min, ~5-line max with scroll)
- Enter = send, Shift+Enter = newline
- Alt+Up / Alt+Down for session history navigation with draft preservation
- Send button bottom-aligned with textarea

**Non-Goals:**
- Persistent history (localStorage / backend)
- Markdown preview in textarea
- Rich text / attachments

## Decisions

### `<textarea>` with JS-driven auto-resize

Use a `<textarea>` with `resize: none`. On every `onChange`, set `el.style.height = 'auto'` then `el.style.height = el.scrollHeight + 'px'`, clamped to a `maxHeight` (~130 px ≈ 5 lines). This is the simplest approach — no hidden mirror div, no extra library.

Alternative considered: fixed `rows` attribute — rejected because it wastes space when the user types a short prompt.

### Alt+Up / Alt+Down for history (not bare Up/Down)

Bare Up/Down would conflict with cursor movement inside a multi-line textarea. Alt modifier is unambiguous and easy to remember. No cursor-position detection needed.

### In-memory history only

A `useRef` array of sent messages, appended on send. `historyIndexRef` tracks position (-1 = draft). `draftRef` saves the in-progress text when the user first enters history mode, restored on Alt+Down past the end of history.

## Risks / Trade-offs

- `el.style.height = 'auto'` flicker is imperceptible at this scale but theoretically causes a reflow on every keystroke — acceptable for a chat input.
- Alt+Up may conflict with OS-level shortcuts on some keyboards; no known conflict on Windows/Mac for this combination inside a desktop webview.
