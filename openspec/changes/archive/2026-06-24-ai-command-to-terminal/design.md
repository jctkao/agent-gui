## Context

The app is a Tauri desktop application with a split layout: left panel is a React-based Chat UI, right panel is a workspace with tabs (browser, file, editor, terminal). The terminal tabs use xterm.js over a PTY managed by the Rust backend (`portable_pty`). The AI agent runs as a Tokio async loop in Rust, calling Ollama for LLM inference and parking on a `oneshot` channel when it needs human approval before executing a tool call.

Currently the approval channel carries only `bool` (approve/reject). Commands execute in an isolated `powershell -Command` subprocess — independent of the terminal's working directory and shell state.

## Goals / Non-Goals

**Goals:**
- Inject AI-suggested commands into the active PTY terminal as pre-typed (editable) input
- Capture PTY output after the command runs and return it to the agent loop
- Record the actually-executed command (post-user-edit) in the AI message history
- Show a minimal waiting UI in Chat with a Cancel option

**Non-Goals:**
- WSL terminal support (PowerShell prompt detection only)
- Multiple simultaneous AI command requests
- Command timeout / watchdog
- Modifying `TerminalPane.tsx` or `workspace.ts`

## Decisions

### 1. Who selects the target terminal?

**Decision:** Frontend (ChatPanel) resolves the target PTY ID.

ChatPanel already has access to `useWorkspaceStore`. When `agent-command-to-terminal` fires, it reads `activeTabId` → finds the tab → if `type === "terminal"` uses `tab.ptyId`; otherwise calls `addTab` to open a new terminal and waits for `ptyId` to be set via a `useEffect`/store subscription.

**Alternative considered:** Pass the ptyId from the backend. Rejected because the backend has no knowledge of which tab is active — the frontend already owns that state.

### 2. How to inject the command into the PTY?

**Decision:** Call the existing `pty_write` Tauri command with the command bytes but **without a trailing `\n`**.

This writes the text into the shell's readline buffer, appearing as if the user typed it. The user can backspace, edit, then press Enter to execute, or press Ctrl+C to cancel.

**Alternative considered:** Write with `\n` to auto-execute. Rejected — removes the human-review step entirely.

### 3. How to capture output and detect completion?

**Decision:** ChatPanel subscribes to `pty-data-<ptyId>` (same event TerminalPane uses — Tauri supports multiple listeners). It accumulates bytes, strips ANSI escape codes, and scans for the next PowerShell prompt pattern (`/^PS .*>\s*$/m`) to delimit the output boundary.

Prompt detection logic:
1. Before injecting, snapshot the current prompt text (last non-empty line visible in the terminal buffer via xterm's buffer API).
2. After injection, start accumulating.
3. On each chunk: decode UTF-8, strip ANSI, split into lines.
4. Detect the first occurrence of a line matching the prompt pattern → that marks the end.
5. Everything between the injected command's echo line and the prompt line = output.

**The Ctrl+C case:** A cancelled command produces `^C\r\n` followed immediately by a new prompt with no output lines. Detection: prompt appears but extracted output is empty (or only `^C`) → treat as cancelled.

**Alternative considered:** Shell markers (`echo __START__; cmd; echo __END__`). Rejected — visible in terminal, confusing UX.

**Alternative considered:** xterm buffer API to read rendered lines post-completion. Rejected — requires polling or timing hacks to know when rendering is done; the PTY stream approach is event-driven.

### 4. What does the agent loop receive?

**Decision:** Replace `oneshot::Sender<bool>` with `oneshot::Sender<TerminalResult>`:

```rust
struct TerminalResult {
    command: String,  // actual command that ran (first echo line)
    output: String,   // captured output (trimmed)
    cancelled: bool,
}
```

The agent loop, on receiving `TerminalResult`, pushes a `tool` message with `content = output` and records `command` as the actual tool call. If `cancelled = true`, it pushes `"User cancelled the command."` and stops the loop.

**Alternative considered:** Keep `Sender<bool>` and add a separate channel for output. Rejected — two channels to synchronize is more complex than one richer type.

### 5. What does Chat show while waiting?

**Decision:** A lightweight "waiting" card showing the suggested command text and a Cancel button. No Execute button — execution happens via terminal Enter.

Cancel button calls `agent_terminal_result({ command: "", output: "", cancelled: true })` directly, bypassing the PTY capture flow.

## Risks / Trade-offs

- **Prompt detection fragility**: Custom PowerShell prompts (e.g., `oh-my-posh`, `starship`) may not match `/^PS .*>/`. → Mitigation: snapshot the actual prompt before injection and match against it literally, falling back to the regex.
- **Race condition on new terminal**: If a new terminal tab is opened, `ptyId` is set asynchronously after PTY creation. ChatPanel must wait for the store update before calling `pty_write`. → Mitigation: watch the store for the ptyId of the newly added tab, with a short timeout.
- **User edits the command**: The echo on the first line may include ANSI cursor-movement codes from readline's rendering, making it hard to extract the clean command string. → Mitigation: store the originally suggested command as a fallback; only use the echo if it parses cleanly.
- **pty-data listener cleanup**: If the user cancels and then sends a new message immediately, the old PTY listener must be cleaned up. → Mitigation: use a `ref` to the unlisten function; always call it before starting a new capture session.

## Open Questions

- Should the Cancel button in Chat also send Ctrl+C (`\x03`) to the PTY, to clear the pre-typed command? Currently the pre-typed text would remain in the terminal's readline buffer even after AI cancels.
