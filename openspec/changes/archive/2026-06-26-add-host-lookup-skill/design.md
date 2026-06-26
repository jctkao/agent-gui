## Context

The agent currently has two tools: `run_terminal_command` (runs shell commands) and `load-skill` (loads skill instructions). The `SkillManager` loads skill metadata from `~/.agent-skills/` at startup and injects a skill list into the agent's system prompt. When the agent decides a skill is relevant, it calls `load-skill` to get the full instructions from `SKILL.md`, which then guide subsequent tool calls.

This design adds a host-lookup skill that slots into the existing skill system without requiring any Rust changes.

## Goals / Non-Goals

**Goals:**
- Agent can resolve a partial or full host name to an IP
- Lookup data lives in a plain text file the user can edit directly
- File is read fresh on every lookup (no caching)
- Partial/fuzzy name matching with disambiguation when multiple hosts match

**Non-Goals:**
- No DNS resolution — only the user-maintained hosts file
- No UI for editing the hosts file — users edit it in a text editor
- No auto-installation of the skill — user copies the folder manually
- No Rust changes

## Decisions

### Script-based, not a native Rust tool

The lookup logic lives in a PowerShell script (`lookup.ps1`) invoked by the agent via `run_terminal_command`, rather than a new Rust `Tool` implementation.

**Why:** The `SkillManager` + `run_terminal_command` combination already supports this pattern. Adding a Rust tool would require modifying `commands.rs`, recompiling, and shipping a new binary for what is essentially a text file search. A script is simpler, and the skill folder is self-contained and user-editable without a rebuild.

**Alternative considered:** Native Rust tool with `HostLookupTool { file_path }`. Rejected because it couples the lookup path into the binary and requires recompilation to change behavior.

### `$PSScriptRoot` for path resolution

The script locates `hosts.txt` using `$PSScriptRoot` (the directory containing the script), so the skill folder is self-contained regardless of where the agent calls it from.

### Case-insensitive substring matching

If the query string appears anywhere in a host name (case-insensitive), it is a match.

- 0 matches → script prints: `No host matching '<query>' found in hosts.txt`
- 1 match → script prints: the IP address only
- 2+ matches → script prints: `Multiple hosts match '<query>': web-server (192.168.1.1), web-app (192.168.1.2). Ask the user to specify.`

The agent receives this as the terminal output and acts accordingly — returning the IP directly, or relaying the disambiguation message to the user.

### hosts.txt key=value format

```
# Lines starting with # are comments
web-server = 192.168.1.1
db-primary = 10.0.0.5
db-replica = 10.0.0.6
```

Whitespace around `=` is ignored. Empty lines and comment lines are skipped.

## Risks / Trade-offs

- [Risk] `run_terminal_command` requires user approval before each execution → the agent's lookup will pause for user confirmation. **Mitigation:** Acceptable for now; the existing terminal tool has the same behavior.
- [Risk] Script path in SKILL.md is hard-coded to `~/.agent-skills/host-lookup/lookup.ps1`. If the user installs the skill elsewhere, the instructions break. **Mitigation:** Document the expected install location clearly in `SKILL.md` and the repo README.
- [Risk] `hosts.txt` in the repo is a template; the real file is at `~/.agent-skills/host-lookup/hosts.txt`. Users must populate it. **Mitigation:** Ship an example `hosts.txt` with clear comments.

## Open Questions

None — decisions are fully settled from the exploration phase.
