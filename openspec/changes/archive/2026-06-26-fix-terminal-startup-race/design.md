## Context

`ChatPanel.tsx` contains `handleInjectToTerminal`, which the agent's `agent-command-to-terminal` event triggers. When no terminal tab is open, it creates one and calls `waitForPtyId` to wait for the PTY to initialize.

The problem is in the timing contract between `TerminalPane.tsx` and `ChatPanel.tsx`:

1. `TerminalPane` calls `setPtyId` (resolving `waitForPtyId`) **before** it sets up its own `pty-data` listener on xterm.
2. `ChatPanel` then immediately injects the command via `pty_write` and registers its capture listener.
3. PowerShell's startup output (banner + initial prompt) is already in flight and arrives at the capture listener.
4. The listener's `enterDetected` flag triggers on the first `\r\n` in the startup banner (mistaken for the user pressing Enter), and `looksLikePrompt` matches the PS prompt (e.g., `PS C:\...>`), causing `finishCapture` to fire prematurely.

The existing-terminal path is unaffected — the PTY is already settled.

## Goals / Non-Goals

**Goals:**
- Ensure the capture listener in `handleInjectToTerminal` never sees startup output from a newly created terminal.
- Keep the code change minimal and scoped to `ChatPanel.tsx`.
- Existing-terminal path remains unchanged.

**Non-Goals:**
- Changing TerminalPane's initialization order or the Tauri PTY backend.
- Adding a general "terminal ready" event from the backend.
- Fixing any other edge cases in the capture listener.

## Decisions

### Decision: Drain startup output in the frontend before injecting

**Chosen approach:** Add a `waitForInitialPrompt(ptyId)` helper in `ChatPanel.tsx`. It opens a temporary listener on `pty-data-${ptyId}`, accumulates incoming bytes, strips ANSI, and resolves once any line matches `looksLikePrompt`. After it resolves, the startup sequence is fully drained, and `snapshotPrompt` will read an accurate prompt from xterm.

**Alternative considered:** Add a backend event (`terminal-ready`) emitted after the PTY first outputs a prompt. Rejected — adds Rust-side complexity and couples the backend to shell-specific prompt detection.

**Alternative considered:** Sleep a fixed delay (e.g., 500 ms) after getting `ptyId` before injecting. Rejected — fragile on slow machines, wastes time on fast ones.

**Alternative considered:** Change `setPtyId` to be called only after `TerminalPane`'s xterm listener is registered. Rejected — `await listen(...)` is async, and the ordering of React render + Tauri event subscription is non-trivial to control safely.

### Decision: Only apply to the new-terminal branch

`waitForInitialPrompt` is only called inside the `else` branch of `handleInjectToTerminal` (when no active terminal tab exists). Existing terminals are already settled, so calling it there would add latency for no reason.

## Risks / Trade-offs

- **Risk**: `waitForInitialPrompt` never resolves if the shell produces no prompt (e.g., custom shell, startup error). → Mitigation: add a timeout (e.g., 10 seconds) that rejects and falls through to a `ptyId = null` failure path.
- **Risk**: `looksLikePrompt` is heuristic-based (ends with `$`, `#`, `>`, `%`, `❯`) and could false-positive on banner text. → Acceptable: the same heuristic is used in the existing capture listener; this is consistent behavior.
- **Trade-off**: Adds latency to the first-use path proportional to PowerShell startup time (typically 200–500 ms on Windows). This is acceptable because the user is already waiting for the terminal to open.
