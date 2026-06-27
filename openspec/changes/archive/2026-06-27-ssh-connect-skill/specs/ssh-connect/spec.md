## ADDED Requirements

### Requirement: Extract hostname from user message
The skill SHALL identify the target remote machine name from the user's natural language message before attempting any connection.

#### Scenario: Hostname present in message
- **WHEN** the user says something like "SSH to web-server" or "connect to db-primary as admin"
- **THEN** the skill extracts the machine name (e.g., "web-server", "db-primary") and proceeds with IP lookup

### Requirement: Resolve hostname to IP via host-lookup
The skill SHALL run the host-lookup script at `$HOME/.agent-skills/host-lookup/lookup.ps1` with the extracted hostname to obtain an IP address.

#### Scenario: Single match found
- **WHEN** the lookup returns a single IP address
- **THEN** the skill uses that IP for the SSH command

#### Scenario: Multiple matches found
- **WHEN** the lookup returns a "Multiple hosts match" message
- **THEN** the skill presents the options to the user and asks them to specify which host

#### Scenario: No match found
- **WHEN** the lookup returns "No host matching ... found"
- **THEN** the skill tells the user the host was not found and suggests checking `hosts.txt`

#### Scenario: Lookup script not installed
- **WHEN** `$HOME/.agent-skills/host-lookup/lookup.ps1` does not exist
- **THEN** the skill tells the user to install the host-lookup skill and stops

### Requirement: Obtain SSH username
The skill SHALL use the username from the user's message if provided; otherwise it SHALL ask the user for one before proceeding.

#### Scenario: Username present in message
- **WHEN** the user says "ssh as admin" or "user admin" or "admin@web-server"
- **THEN** the skill uses that username without prompting

#### Scenario: Username absent from message
- **WHEN** no username can be identified in the user's message
- **THEN** the skill asks the user "What username should I use to connect?"

### Requirement: Reuse active terminal tab
The skill SHALL send the SSH command to the currently active workspace tab if that tab is a terminal.

#### Scenario: Active tab is a terminal
- **WHEN** `window.__workspaceStore.getState()` shows the active tab has `type === 'terminal'` and a defined `ptyId`
- **THEN** the skill uses that tab's `ptyId` directly without opening a new tab

### Requirement: Open new terminal tab when active tab is not a terminal
The skill SHALL create a new terminal tab and use it when the active workspace tab is not a terminal.

#### Scenario: Active tab is not a terminal
- **WHEN** the active tab has a type other than `'terminal'`
- **THEN** the skill calls `window.__workspaceStore.getState().addTab(...)` with a new terminal pane and waits for its `ptyId` to be assigned

#### Scenario: New terminal tab ptyId does not appear in time
- **WHEN** after repeated polls the new tab's `ptyId` remains undefined
- **THEN** the skill reports an error to the user and stops

### Requirement: Execute SSH command in terminal
The skill SHALL send the SSH command to the target terminal PTY via `pty_write`.

#### Scenario: SSH command sent successfully
- **WHEN** a valid `ptyId` is available and the IP and username are known
- **THEN** the skill calls `ipc_execute_command("pty_write", { id: ptyId, data: <UTF-8 bytes of "ssh user@ip\r\n"> })`
- **THEN** the SSH session appears in the terminal tab
