## 1. Update prompt detection in ChatPanel.tsx

- [x] 1.1 Remove the `PS_PROMPT_RE` constant
- [x] 1.2 Add a `PROMPT_ENDINGS` constant: `["$ ", "# ", "> ", "% ", "❯ "]`
- [x] 1.3 Add a `looksLikePrompt(line: string): boolean` function that returns true when the trimmed line is ≤ 120 chars and ends with any entry in `PROMPT_ENDINGS`
- [x] 1.4 Update `isPromptLine` to call `looksLikePrompt` as the fallback instead of `PS_PROMPT_RE.test`

## 2. Update the pty-output-capture spec

- [x] 2.1 In `openspec/specs/pty-output-capture/spec.md`, replace the "Prompt detection uses the terminal's actual prompt as the boundary marker" requirement text and scenarios with the updated wording from the delta spec
