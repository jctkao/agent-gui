## ADDED Requirements

### Requirement: Auto-growing textarea
The chat input SHALL be a `<textarea>` that automatically grows in height as content is added, with a minimum height of one line and a maximum height of approximately five lines, after which it SHALL scroll vertically.

#### Scenario: Single line entry
- **WHEN** the user types a short message with no newlines
- **THEN** the textarea height SHALL equal one line (same as the original input)

#### Scenario: Multi-line growth
- **WHEN** the user types or pastes content that exceeds one line
- **THEN** the textarea SHALL expand to show all lines up to the five-line maximum

#### Scenario: Content exceeds max height
- **WHEN** the content exceeds five lines
- **THEN** the textarea height SHALL remain at the maximum and the content SHALL be scrollable

### Requirement: Enter sends, Shift+Enter inserts newline
The chat input SHALL send the message when `Enter` is pressed alone, and insert a newline when `Shift+Enter` is pressed.

#### Scenario: Enter key sends
- **WHEN** the user presses `Enter` without any modifier
- **THEN** the message SHALL be sent and the textarea SHALL be cleared

#### Scenario: Shift+Enter inserts newline
- **WHEN** the user presses `Shift+Enter`
- **THEN** a newline character SHALL be inserted at the cursor position and the message SHALL NOT be sent

### Requirement: Alt+Up / Alt+Down history navigation
The chat input SHALL maintain a session-only list of all sent messages and allow navigation via `Alt+Up` (previous) and `Alt+Down` (next).

#### Scenario: Navigate to previous message
- **WHEN** the user presses `Alt+Up` and there is at least one previously sent message
- **THEN** the textarea SHALL show the most recent sent message not yet navigated to

#### Scenario: Continue navigating backwards
- **WHEN** the user presses `Alt+Up` again while viewing a history item
- **THEN** the textarea SHALL show the next older message, or remain at the oldest if already there

#### Scenario: Navigate forward restores draft
- **WHEN** the user has navigated into history and presses `Alt+Down` past the newest history item
- **THEN** the textarea SHALL restore the draft text that was present before history navigation began

#### Scenario: Draft preserved on history entry
- **WHEN** the user has partially typed a message and presses `Alt+Up`
- **THEN** the in-progress text SHALL be saved and restored when the user navigates back past the newest history item

#### Scenario: No history available
- **WHEN** the user presses `Alt+Up` and no messages have been sent in the current session
- **THEN** the textarea SHALL remain unchanged

### Requirement: Send button bottom-aligned
The send button SHALL be aligned to the bottom edge of the textarea so its position remains stable as the textarea grows.

#### Scenario: Single-line input
- **WHEN** the textarea shows one line
- **THEN** the send button SHALL appear vertically aligned with the textarea (same as before)

#### Scenario: Multi-line input
- **WHEN** the textarea grows to multiple lines
- **THEN** the send button SHALL remain anchored to the bottom of the textarea, not float to the middle
