## 1. Skill folder structure

- [x] 1.1 Create `skills/host-lookup/` directory in the repo
- [x] 1.2 Create `skills/host-lookup/hosts.txt` template with comment header and 2-3 example entries

## 2. Lookup script

- [x] 2.1 Create `skills/host-lookup/lookup.ps1` accepting a `-HostName` parameter
- [x] 2.2 Implement hosts.txt parsing: read `$PSScriptRoot/hosts.txt`, skip comment and empty lines, split on `=`, trim whitespace
- [x] 2.3 Implement case-insensitive substring matching against all parsed host names
- [x] 2.4 Output single IP when exactly one match found
- [x] 2.5 Output "No host matching..." message when zero matches found
- [x] 2.6 Output "Multiple hosts match..." message with name+IP list when two or more matches found

## 3. Skill instructions

- [x] 3.1 Create `skills/host-lookup/SKILL.md` with YAML frontmatter (`name: host-lookup`, `description: ...`)
- [x] 3.2 Write skill body: when to use the skill, exact command to run (`powershell -File ~/.agent-skills/host-lookup/lookup.ps1 -HostName "<query>"`), how to handle each output case (single IP / no match / multiple matches → ask user)
