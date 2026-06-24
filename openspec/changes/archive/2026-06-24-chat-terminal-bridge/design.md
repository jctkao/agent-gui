## Context

The app has two isolated panels: a chat panel (left) with stub messages and a no-op `handleSend`, and a workspace panel (right) with a fully functional PTY-backed terminal via xterm.js. The terminal's PTY session ID is stored only in a component-local `useRef` inside `TerminalPane`, making it invisible to the rest of the app.

Existing infrastructure that can be reused without modification:
- `pty_write(id, data)` Tauri command — writes bytes to a PTY
- `pty-data-{id}` Tauri event — streams raw PTY output bytes
- `pty_create(shell)` — already called by TerminalPane on mount
- Zustand `workspace` store — already manages tab state

## Goals / Non-Goals

**Goals:**
- Share the PTY ID of each terminal pane via the Zustand store so any component can interact with it
- Allow chat input to send commands to the active terminal PTY
- Auto-open a terminal tab when the user sends a command and none exists
- Capture PTY output for ~1.5s after sending a command and display it in chat as an assistant message

**Non-Goals:**
- Intelligent command parsing or AI interpretation of output
- Accurate command-completion detection (no prompt-sniffing)
- Multi-terminal routing (always targets the active terminal tab)
- ANSI color rendering in the chat panel (plain text only)
- Any changes to the Rust backend

## Decisions

### D1: PTY ID lives in the Zustand store

**Decision**: Add `ptyId?: string` to the `Pane` interface and a `setPtyId(tabId, ptyId)` action to the workspace store. `TerminalPane` calls this after `pty_create` resolves.

**Alternatives considered**:
- *React context / callback prop*: Would require threading props through `WorkspacePanel` → `TerminalPane` and back up to `ChatPanel`, which are siblings. Unnecessarily invasive.
- *Module-level registry (like `terminalRegistry.ts`)*: Could work, but mixing xterm terminals (UI) and PTY IDs (backend handles) in the same registry is semantically messy.

**Rationale**: The workspace store already owns tab state. PTY ID is per-tab state. This is the natural home.

---

### D2: Timed output collection (1.5s window)

**Decision**: After `pty_write`, subscribe to `pty-data-{ptyId}` for 1.5 seconds, accumulate bytes, then decode and strip ANSI escape codes before adding the result as an assistant message.

**Alternatives considered**:
- *Prompt-pattern detection* (`PS >`, `$ `): More accurate but brittle — requires per-shell heuristics, breaks with custom prompts.
- *Rust-side capture command*: Clean but requires new backend code, contradicting the non-goal of no Rust changes.

**Rationale**: Sufficient for a PoC. The 1.5s window covers most short commands (ls, pwd, git status). Can be replaced with prompt detection later.

---

### D3: Auto-open terminal on first command

**Decision**: If no terminal tab exists when the user sends a command, call `addTab` to create one. Wait for `setPtyId` to populate (poll the store with a short delay loop, max 5s) then send the command.

**Rationale**: Avoids requiring the user to manually open a terminal before using the chat. Keeps the UX frictionless.

---

### D4: ANSI stripping via regex

**Decision**: Use a regex to strip ANSI/VT escape sequences before displaying output in chat: `/\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\r/g`.

**Rationale**: No additional dependency. Covers the common cases (SGR colors, OSC sequences, carriage returns). Good enough for PoC output display.

## Risks / Trade-offs

- **Race condition on auto-open**: The poll loop waits for `ptyId` to be set, but if `pty_create` fails (e.g., PowerShell not found), the loop will time out silently. → Mitigation: show an error message in chat after timeout.
- **1.5s window is inaccurate**: Slow commands get truncated; fast commands show trailing prompt text. → Acceptable for PoC; can improve later with prompt detection.
- **Output includes echoed command**: PTY echo means the user's command appears at the start of the captured output. → Strip the first line that matches the sent command after decoding.
- **Concurrent commands**: If user sends two commands quickly, the output listeners may interleave. → Out of scope; the feature is single-command-at-a-time for now.
