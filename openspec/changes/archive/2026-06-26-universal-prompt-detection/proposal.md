## Why

The PTY output capture system detects command completion by looking for a PowerShell prompt (`/^PS .*>\s*$/`), which breaks completely once the user SSHs into a Linux machine — the prompt changes to a shell-agnostic format (e.g., `user@host:~$`) and the agent loop never unblocks. This prevents the agent from running any commands on remote Linux hosts, which is a core use case.

## What Changes

- Replace the PowerShell-only prompt detection fallback with a universal heuristic that recognizes prompt endings common to all major shells (`$ `, `# `, `> `, `% `, `❯ `).
- Add a line-length guard so that long output lines ending in `$` are never mistaken for a prompt.
- The snapshot-based detection (`endsWith(promptSnapshot)`) remains as the primary strategy; the universal heuristic becomes the secondary fallback, replacing `PS_PROMPT_RE`.
- Remove the `PS_PROMPT_RE` constant.

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `pty-output-capture`: The prompt detection requirement currently specifies PowerShell-only regex as a fallback. It must be updated to describe a shell-agnostic heuristic that works across PowerShell, bash, zsh, tcsh, fish, and remote sessions reached via SSH.

## Impact

- `src/components/chat/ChatPanel.tsx` — prompt detection logic only; no other behavior changes.
- `openspec/specs/pty-output-capture/spec.md` — requirement and scenario wording updated.
