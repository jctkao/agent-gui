## Why

The chat input is a single-line `<input>`, making it awkward to compose multi-line prompts. Users also have no way to recall previous messages without retyping them.

## What Changes

- Replace the `<input>` with an auto-growing `<textarea>` that expands as the user types (min 1 line, max ~5 lines then scrolls)
- `Enter` sends the message; `Shift+Enter` inserts a newline (Claude.ai style)
- `Alt+Up` / `Alt+Down` navigates session history (previous/next sent messages), preserving any in-progress draft
- Send button anchors to the bottom-right of the textarea instead of vertically centered

## Capabilities

### New Capabilities

- `multiline-chat-input`: Auto-growing textarea input for the AI chat panel with history navigation

### Modified Capabilities

<!-- none -->

## Impact

- `src/components/chat/ChatPanel.tsx` — only file changed
- No new dependencies; pure React/DOM
- History is session-only (in-memory); no persistence or backend changes
