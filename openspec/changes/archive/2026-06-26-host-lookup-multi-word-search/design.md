## Context

The existing `lookup.ps1` treats the entire `$HostName` parameter as a single substring pattern. Multi-word inputs like "db primary" never match because no host name contains a literal space. The fix lives entirely within the script — no Rust, no Tauri, no new dependencies.

## Goals / Non-Goals

**Goals:**
- Split multi-word queries on whitespace and apply AND-then-OR ranked matching
- Return IP directly when there is exactly one AND match
- Preserve existing behavior exactly for single-word queries

**Non-Goals:**
- Hyphen-aware word splitting (hyphens in host names are not treated as word boundaries)
- Fuzzy or phonetic matching
- Caching or indexing of hosts.txt

## Decisions

**Split on whitespace only** — the query `"db primary"` yields tokens `["db", "primary"]`. Hyphens in host names (e.g., `db-primary`) are not split; a token `"primary"` still matches `"db-primary"` via substring. This keeps the split rule simple and consistent with how agents phrase queries.

**Option C output contract** — if exactly one AND match exists, output the IP and stop. In all other non-empty cases (multiple AND, or any OR without a sole AND), output the ranked disambiguation message. This gives the agent a clean IP when the query is precise, and a sorted list when it isn't.

**OR-only single result still disambiguates** — if AND=0 and OR=1, the script still emits the "Multiple hosts match" message rather than returning the IP directly. This signals to the agent that the match was not fully confident, giving the user a chance to confirm.

## Risks / Trade-offs

- [Token explosion] A query with many common tokens could produce a long OR list → Mitigation: hosts.txt is user-maintained and typically small; no pagination needed.
- [Behavior change for zero-space queries] None — single-word path is untouched.

## Migration Plan

Drop-in replacement. Users copy the updated `lookup.ps1` to `~/.agent-skills/host-lookup/`. No `hosts.txt` changes required.
