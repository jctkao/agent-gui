# Spec: host-lookup-multi-word-search

## Purpose

Extend the host lookup script to support multi-word queries by splitting the query into tokens, ranking results by AND/OR match quality, and returning a single IP directly when there is exactly one full match.

## Requirements

### Requirement: Multi-word AND/OR ranked search
When the agent provides a query containing more than one whitespace-separated word, the lookup script SHALL split the query into tokens, classify each host entry as an AND match (all tokens match), an OR match (some but not all tokens match), or no match, and return results according to the ranked output rules below. Single-word queries SHALL use existing substring match behavior unchanged.

#### Scenario: Single AND match returns IP directly
- **WHEN** the query contains multiple words and exactly one host entry matches all words (AND match)
- **THEN** the script outputs only that entry's IP address

#### Scenario: Multiple AND matches returns ranked disambiguation
- **WHEN** the query contains multiple words and two or more entries match all words
- **THEN** the script outputs a "Multiple hosts match" message listing AND matches first, followed by OR-only matches, in that order

#### Scenario: No AND matches, one or more OR matches returns ranked list
- **WHEN** the query contains multiple words, no entry matches all words, but one or more entries match at least one word
- **THEN** the script outputs a "Multiple hosts match" message listing the OR matches

#### Scenario: No matches found for multi-word query
- **WHEN** the query contains multiple words and no entry matches any word
- **THEN** the script outputs: `No host matching '<query>' found in hosts.txt`

#### Scenario: Single-word query is unchanged
- **WHEN** the query contains exactly one word (no whitespace)
- **THEN** the script uses existing case-insensitive substring match behavior with no change
