## 1. Lookup script

- [x] 1.1 Split `$HostName` on whitespace into `$words`; if `$words.Count -le 1`, fall through to existing single-word path unchanged
- [x] 1.2 For multi-word queries, loop through parsed host entries and classify each as AND match (all words are case-insensitive substrings of the host name) or OR match (at least one word matches)
- [x] 1.3 If exactly one AND match: output its IP and exit
- [x] 1.4 If no matches at all: output `No host matching '<query>' found in hosts.txt`
- [x] 1.5 Otherwise: output the "Multiple hosts match" disambiguation message with AND matches listed before OR matches

## 2. Skill instructions

- [x] 2.1 Update `SKILL.md` to document multi-word behavior: split on whitespace, AND results first, IP returned directly when single AND match
