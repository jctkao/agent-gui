## Context

The agent command flow is: Rust backend emits `agent-command-to-terminal` → `ChatPanel.handleInjectToTerminal` resolves a target terminal tab and PTY, then writes the command text to the PTY without a newline. The user must manually switch to the terminal tab and press Enter.

The workspace tab system uses a Zustand store (`useWorkspaceStore`). Switching tabs is `store.setActiveTab(id)`. Focusing a terminal is `getTerminal(id)?.focus()` (from `terminalRegistry`), preceded by `invoke("main_focus")` to bring the Tauri window to the foreground. Both utilities are already imported in `ChatPanel.tsx`.

## Goals / Non-Goals

**Goals:**
- After a PTY is confirmed ready and the command is injected, switch the active tab to the terminal and focus it.
- Works for both reuse (existing terminal tab) and creation (new tab opened by the agent).

**Non-Goals:**
- Not changing the approval model — user still presses Enter manually.
- Not adding any visual indicator or animation.
- Not handling the split-layout mode differently (the tab switching call is a no-op if already on the correct tab).

## Decisions

**Where to insert the focus call**: After `pendingPtyId.current = ptyId` and before `pty_write`. This is the single convergence point for both the reuse and create-new-tab paths. The PTY is guaranteed valid here, so focus will land on an active terminal.

**Alternatives considered**: Inserting focus inside each branch (reuse vs. new tab) separately — rejected because it duplicates code with no benefit.

**80ms setTimeout for focus**: Matches the existing `selectTab` pattern in `App.tsx`. The DOM needs one render cycle to make the newly-active terminal visible before `xterm.focus()` works. Using `requestAnimationFrame` was considered but `setTimeout(fn, 80)` is already the established project pattern.

## Risks / Trade-offs

- [Race: user types in chat while command is being prepared] → Terminal steals focus mid-typing. Accepted — the agent sending a command is a deliberate action the user triggered; switching focus is expected behavior.
- [Multiple rapid agent commands] → Each re-focuses the terminal. Acceptable; the terminal is where the user needs to be.
