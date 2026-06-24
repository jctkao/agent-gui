## MODIFIED Requirements

### Requirement: Hint labels use home-row character set
Hint labels SHALL use the character set `sadfjklewcmpgh` (14 characters). The label set MUST be prefix-free: no assigned label may be a prefix of another assigned label. Single-character labels are preferred and assigned first; two-character labels are used when the element count exceeds 14. Characters reserved as two-char prefixes SHALL NOT also appear as single-char labels.

#### Scenario: Label assignment order — small page
- **WHEN** hint mode is entered on a page with up to 14 visible clickable elements
- **THEN** each element receives a distinct single-character label from `sadfjklewcmpgh`

#### Scenario: Two-char labels for large pages — prefix-free
- **WHEN** hint mode is entered on a page with more than 14 visible clickable elements
- **THEN** the first `j = ceil((count − 14) / 13)` characters of `sadfjklewcmpgh` are reserved as two-char prefixes; the remaining `14 − j` characters are assigned as single-char labels; and elements that exceed the single-char supply receive two-character labels formed from the reserved prefix characters

#### Scenario: Prefix char is not a single-char label
- **WHEN** a character (e.g. `s`) is used as the first character of any two-char label (e.g. `ss`, `sa`)
- **THEN** that character is NOT assigned as a standalone single-char label to any element

#### Scenario: Single-char label always uniquely activates
- **WHEN** the user types a single character that matches a single-char label
- **THEN** `matchCount` is exactly 1 and the element activates immediately, regardless of how many two-char labels exist
