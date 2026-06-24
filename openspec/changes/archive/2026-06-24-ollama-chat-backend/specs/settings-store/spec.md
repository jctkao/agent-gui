## ADDED Requirements

### Requirement: Ollama connection settings
The application SHALL store and retrieve `ollama_url` and `ollama_model` in the existing `settings` SQLite table, with default values applied when the keys are absent.

#### Scenario: Save Ollama URL
- **WHEN** the user enters a URL in the Ollama URL field and saves
- **THEN** the value SHALL be written to `settings` with `key = 'ollama_url'` (upsert)

#### Scenario: Save Ollama model
- **WHEN** the user enters a model name in the Ollama Model field and saves
- **THEN** the value SHALL be written to `settings` with `key = 'ollama_model'` (upsert)

#### Scenario: Read saved Ollama settings
- **WHEN** the Settings modal opens
- **THEN** it SHALL read `ollama_url` and `ollama_model` from the database
- **AND** populate the corresponding input fields with the stored values

#### Scenario: Ollama URL not yet set
- **WHEN** `ollama_url` is absent from the settings table
- **THEN** the Settings modal SHALL display `http://localhost:11434` as a placeholder
- **AND** the agent SHALL use `http://localhost:11434` as the default

#### Scenario: Ollama model not yet set
- **WHEN** `ollama_model` is absent from the settings table
- **THEN** the Settings modal SHALL display `llama3.2` as a placeholder
- **AND** the agent SHALL use `llama3.2` as the default
