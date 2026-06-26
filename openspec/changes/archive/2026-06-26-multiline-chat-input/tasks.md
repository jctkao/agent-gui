## 1. Replace input with auto-growing textarea

- [x] 1.1 Replace `<input>` with `<textarea>` in the JSX (ChatPanel.tsx ~line 357)
- [x] 1.2 Add `useRef` for the textarea element to drive height updates
- [x] 1.3 Implement auto-resize: on onChange set `el.style.height = 'auto'` then clamp to `scrollHeight` with a ~130px max
- [x] 1.4 Update `inputBox` style: remove fixed `height: 42`, add `minHeight`, `maxHeight`, `overflowY: auto`, `resize: none`, `paddingTop`/`paddingBottom` for vertical rhythm
- [x] 1.5 Update `inputRow` style: change `alignItems` from `"center"` to `"flex-end"` so send button anchors to bottom

## 2. Keyboard behaviour

- [x] 2.1 Update `onKeyDown`: `Enter` without `shiftKey` → call `handleSend()` and `e.preventDefault()`; let `Shift+Enter` fall through to default (textarea newline)
- [x] 2.2 After send, reset textarea height back to `minHeight` (since value clears, height won't auto-reset without a nudge)

## 3. History navigation

- [x] 3.1 Add `historyRef` (`useRef<string[]>([])`) to accumulate sent messages
- [x] 3.2 Add `historyIndexRef` (`useRef(-1)`) to track current position (-1 = not in history)
- [x] 3.3 Add `draftRef` (`useRef("")`) to save in-progress text when entering history
- [x] 3.4 In `handleSend`, push the sent text onto `historyRef.current` and reset `historyIndexRef.current` to -1
- [x] 3.5 In `onKeyDown`, handle `Alt+Up`: save draft if entering history for the first time, decrement index (clamped to 0), set input to `historyRef.current[index]`
- [x] 3.6 In `onKeyDown`, handle `Alt+Down`: increment index; if past end (-1), restore draft and reset index to -1
