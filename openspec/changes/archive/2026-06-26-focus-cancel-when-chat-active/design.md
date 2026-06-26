## Context

`ChatPanel.tsx` handles the `agent-command-to-terminal` event. When it fires, it:
1. Adds a `terminal-waiting` message (with a cancel button) to the chat.
2. Calls `handleInjectToTerminal()` which sets the active workspace tab and then, after an 80ms delay, calls `getTerminal(id)?.focus()`.

Currently focus always goes to the terminal. The cancel button is rendered in the DOM but is never auto-focused.

## Goals / Non-Goals

**Goals:**
- When chat has focus at event time, give keyboard focus to the cancel button.
- Preserve all existing behavior when chat does not have focus.

**Non-Goals:**
- Keyboard navigation within the terminal-waiting widget beyond the cancel button.
- Any change to backend, PTY handling, or the Rust side.

## Decisions

### Decision: Detect focus by checking `#chat-input` element identity

At the moment `agent-command-to-terminal` fires, snapshot focus:

```js
const chatHasFocus = document.activeElement?.id === "chat-input";
```

**Why this over checking element containment in the chat panel div?**  
`#chat-input` is the only focusable element in the chat panel. Containment check would require a ref to the panel div and is unnecessary complexity.

### Decision: Pass flag via a ref, not component state

Store the snapshot in `shouldFocusCancelRef = useRef(false)`. State would trigger a re-render cycle and is unnecessary — focus management is a side effect, not display logic.

### Decision: Apply cancel button focus via callback ref

```jsx
<button
  ref={(el) => {
    if (el && shouldFocusCancelRef.current) {
      el.focus();
      shouldFocusCancelRef.current = false;
    }
  }}
  ...
>
```

**Why callback ref over `useEffect`?**  
A callback ref fires synchronously when the element mounts, before the browser paints. A `useEffect` would require tracking the message list and finding the right button by ID — more code, same result.

### Decision: Skip only `getTerminal().focus()`, keep everything else

`invoke("main_focus")` and `store.setActiveTab(targetTabId)` both still run. The workspace switches to the terminal so the user can see the pending command; the window comes to front so focus management works. Only the xterm focus is skipped.

## Risks / Trade-offs

- **Race: user clicks elsewhere after event fires but before button mounts** → The callback ref still calls `.focus()`. This is acceptable — the window is just now coming to foreground, so the user is unlikely to have clicked away meaningfully. If they did, `.focus()` on a mounted element is harmless.
- **`shouldFocusCancelRef` not reset on cancel/resolve** → The callback ref resets it to `false` immediately on use. If the button never mounts (shouldn't happen), the ref stays `true` until next command. Harmless.
