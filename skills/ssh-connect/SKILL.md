---
name: ssh-connect
description: SSH into a remote machine by name — looks up the host IP and opens an SSH connection in the terminal
---

## When to use this skill

Use this skill when the user asks to SSH, connect, or log in to a remote machine by name.

Examples: "SSH to web-server as admin", "connect to db-primary", "ssh admin@web-server"

## Steps

### 1. Extract hostname

Read the target machine name from the user's message.

### 2. Look up the IP

You must use the host-lookup skill to look up the IP address of the target machine first.

Interpret the output:
- An IP address (e.g. `192.168.1.10`): proceed to step 3
- `Multiple hosts match ...`: show the list to the user and ask which one; retry with the exact name
- `No host matching ... found`: tell the user the host was not found in hosts.txt; stop
- Script not found error: tell the user to install the host-lookup skill; stop

### 3. Get the username

Check the user's message for a username (e.g. "as admin", "user admin", "admin@hostname").

If no username is found, ask: "What username should I use to connect?"

### 4. Run the SSH command

Use the `run_terminal_command` tool to run:

```
ssh <username>@<ip>
```
