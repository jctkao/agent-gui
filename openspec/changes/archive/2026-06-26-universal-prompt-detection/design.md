## Context

The PTY output capture system (`ChatPanel.tsx`) detects command completion by scanning PTY stream output for a prompt line. It uses two strategies:

1. **Snapshot match** — reads the last non-empty line from xterm's buffer before command injection and waits for a line that `endsWith(promptSnapshot)`.
2. **Regex fallback** — `/^PS .*>\s*$/` matches PowerShell prompts when the snapshot is empty or mismatched.

When the user SSHes into a Linux host, the shell changes to bash/zsh/fish and the prompt format changes (e.g., `user@host:~$ `). Strategy 1 works when the snapshot is accurate, but strategy 2 always fails on Linux — there is no Linux-specific fallback, so the agent loop hangs indefinitely.

## Goals / Non-Goals

**Goals:**
- Prompt detection works when the PTY shell is PowerShell, bash, zsh, tcsh, fish, or any SSH-remote variant of those shells.
- No configuration required on the remote server.
- Minimal diff — only the fallback logic in `ChatPanel.tsx` changes.

**Non-Goals:**
- Detecting command completion for interactive TUI programs (vim, htop, etc.) — these don't return a prompt, by design.
- Sentinel injection or OSC 133 shell integration — out of scope; the remote server cannot be pre-configured.
- Changes to the Rust backend or PTY layer.

## Decisions

### Decision: Universal prompt-ending heuristic as secondary fallback

Replace `PS_PROMPT_RE` with a `looksLikePrompt` function that checks whether a stripped, trimmed line is short and ends with a known prompt-terminating suffix.

**Prompt endings covered:**

| Suffix | Shells |
|--------|--------|
| `$ `   | bash, zsh (user) |
| `# `   | bash, zsh (root) |
| `> `   | PowerShell, cmd, fish |
| `% `   | tcsh, some zsh themes |
| `❯ `   | Starship, Oh My Posh |

**Length guard:** lines longer than 120 characters are rejected unconditionally. Real prompts are short; command output lines that happen to end in `$` are typically part of longer content.

**Rationale over alternatives:**
- *OSC 133 shell integration*: requires remote shell configuration — ruled out by the constraint "any server, no pre-setup."
- *Sentinel injection* (`cmd; echo "==DONE=="`): breaks interactive commands (SSH itself, sudo, etc.) and would fire only after the SSH session ends — ruled out by the user's use case.
- *Silence-based timeout*: indeterminate latency, bad UX for slow commands.
- *Universal heuristic*: zero server-side requirements, instant detection, minimal false-positive risk when combined with the existing snapshot strategy.

**Detection order (three layers):**

```
1. endsWith(promptSnapshot)   — exact match, most precise
2. looksLikePrompt(line)      — universal heuristic (replaces PS_PROMPT_RE)
```

The snapshot strategy remains primary. The heuristic only fires when the snapshot fails to match (e.g., first command after SSH before a snapshot is taken, or a multi-line prompt theme where the snapshot captured the wrong line).

### Decision: Keep `snapshotPrompt` as-is

The snapshot function correctly reads `translateToString(true)` from the xterm buffer before injection. It works on Linux when the terminal is stable at the prompt. No changes needed there.

## Risks / Trade-offs

- **False positive on output ending in `$ `**: A command whose last output line is short and ends with `$ ` (e.g., `echo "cost: $5 "`) would be mistaken for a prompt. Risk is low because the scan starts from the last line of the stream, and real output followed by a real prompt would trigger on the real prompt line first. The length guard (≤ 120 chars) further limits exposure.
- **Unusual prompt themes**: Prompts using exotic Unicode endings (e.g., `λ `, `→ `) won't match the heuristic and will fall through to indefinite wait. Mitigation: the snapshot strategy covers these correctly as long as the snapshot is captured at the right time.
