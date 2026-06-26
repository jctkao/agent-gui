## ADDED Requirements

### Requirement: Host IP lookup from file
The system SHALL provide a skill that allows the agent to look up a host's IP address by name from a user-maintained `hosts.txt` file. The file SHALL be read on every lookup call (no caching). The skill SHALL use the existing `run_terminal_command` tool to invoke `lookup.ps1`.

#### Scenario: Exact match found
- **WHEN** the agent calls the lookup script with a hostname that matches exactly one entry in `hosts.txt`
- **THEN** the script outputs only the IP address

#### Scenario: Partial/case-insensitive match found
- **WHEN** the agent calls the lookup script with a query string that is a case-insensitive substring of exactly one host name in `hosts.txt`
- **THEN** the script outputs only the IP address

#### Scenario: No match found
- **WHEN** the query string does not match any host name in `hosts.txt`
- **THEN** the script outputs: `No host matching '<query>' found in hosts.txt`

#### Scenario: Multiple matches found
- **WHEN** the query string matches two or more host names in `hosts.txt`
- **THEN** the script outputs: `Multiple hosts match '<query>': <name1> (<ip1>), <name2> (<ip2>). Ask the user to specify.`
- **THEN** the agent relays this message and asks the user to clarify before retrying

### Requirement: Skill shipped in repo
The skill folder (SKILL.md, lookup.ps1, hosts.txt template) SHALL be checked into the repository under `skills/host-lookup/`. Users install it by copying the folder to `~/.agent-skills/host-lookup/`.

#### Scenario: User edits hosts file
- **WHEN** the user edits `~/.agent-skills/host-lookup/hosts.txt` to add or change entries
- **THEN** the next lookup call reflects the updated entries without any app restart

### Requirement: hosts.txt format
The `hosts.txt` file SHALL use a `name = ip` key-value format, one entry per line. Lines beginning with `#` SHALL be treated as comments and ignored. Whitespace around `=` SHALL be trimmed.

#### Scenario: Comment lines ignored
- **WHEN** `hosts.txt` contains lines starting with `#`
- **THEN** those lines are not treated as host entries and do not affect lookup results

#### Scenario: Whitespace tolerance
- **WHEN** an entry is written as `web-server=192.168.1.1` or `web-server  =  192.168.1.1`
- **THEN** both are parsed identically and the host name `web-server` resolves to `192.168.1.1`
