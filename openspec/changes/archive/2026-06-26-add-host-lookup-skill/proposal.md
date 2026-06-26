## Why

Agents have no way to resolve a host name to an IP address without running arbitrary network commands or asking the user directly. A dedicated skill with a user-maintained hosts file gives the agent a fast, predictable lookup that the user can update without touching code.

## What Changes

- Add `skills/host-lookup/` to the repo, containing a `SKILL.md`, a PowerShell lookup script, and a template `hosts.txt`
- The agent uses the existing `run_terminal_command` tool to invoke the script — no new Rust code required
- Users install the skill by copying `skills/host-lookup/` to `~/.agent-skills/host-lookup/` and editing `hosts.txt` with real host entries

## Capabilities

### New Capabilities

- `host-lookup`: Agent skill that looks up a host IP from a user-maintained key=value file, with case-insensitive substring matching and multi-match disambiguation

### Modified Capabilities

## Impact

- New directory `skills/host-lookup/` added to the repo (no build changes)
- No changes to Rust source or Tauri configuration
- Depends on the existing `SkillManager` loading from `~/.agent-skills/` and the existing `run_terminal_command` tool
