## Why

Multi-word queries (e.g., "db primary") currently match nothing in the host-lookup skill because the entire string is used as a single substring, and no host name contains a literal space. Splitting the query into words and applying AND-then-OR ranked matching makes multi-word queries useful and precise.

## What Changes

- `skills/host-lookup/lookup.ps1`: Add multi-word search — split query on whitespace, compute AND matches (all words match) and OR matches (any word matches), return IP directly when exactly one AND match, otherwise return a ranked disambiguation list (AND results first)
- `skills/host-lookup/SKILL.md`: Update agent instructions to describe multi-word behavior
- Single-word queries retain existing behavior exactly

## Capabilities

### New Capabilities

- `host-lookup-multi-word-search`: Multi-word AND/OR ranked search in the host-lookup skill

### Modified Capabilities

## Impact

- Only `skills/host-lookup/lookup.ps1` and `skills/host-lookup/SKILL.md` are modified — no Rust, no Tauri, no build changes
- Users with existing `hosts.txt` files see improved results with no file changes required
