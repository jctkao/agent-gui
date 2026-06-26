---
name: host-lookup
description: Look up a host's IP address by name from a local hosts file
---

## When to use this skill

Use this skill whenever the user refers to a server or host by name and you need its IP address — for example, when constructing SSH commands, curl requests, or any network operation that requires an IP.

## Installation

Copy this folder to `~/.agent-skills/host-lookup/` and edit `hosts.txt` with your real host entries.

## How to look up a host IP

Run the lookup script via the terminal tool:

```
powershell -File "$HOME/.agent-skills/host-lookup/lookup.ps1" -HostName "<query>"
```

Replace `<query>` with the full or partial hostname the user mentioned.

**Single-word query** — case-insensitive substring match: `"web"` matches `web-server`, `web-app`, etc.

**Multi-word query** — split on whitespace and rank results: entries matching all words (AND) are listed before entries matching only some words (OR). If exactly one entry matches all words, its IP is returned directly without disambiguation.

## Interpreting the output

| Output | Meaning | What to do |
|--------|---------|------------|
| An IP address (e.g. `192.168.1.10`) | Exactly one host matched | Use the IP directly |
| `No host matching '...' found in hosts.txt` | No match | Tell the user the host was not found and ask them to check `hosts.txt` |
| `Multiple hosts match '...': name1 (ip1), name2 (ip2). Ask the user to specify.` | Ambiguous query | Show the list to the user and ask which host they meant, then retry with the exact name |
