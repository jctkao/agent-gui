# Browser Agent Tools

## Overview

The agent can read and interact with the active page in the browser overlay pane via 8 tools. Tools execute fully automatically — no user confirmation is required. The browser pane itself reflects all interactions in real time.

## Tools

### `browser_get_page_info`
Returns the current URL and page title. Call this first to orient the agent on what page is loaded.

**Output:**
```
url: https://example.com/login
title: Login — Example
```

---

### `browser_get_page_text`
Returns the main textual content of the page, truncated to 4000 characters. Uses Mozilla Readability for article/documentation pages (removes nav, ads, footers); falls back to `document.body.innerText` for web apps and SPAs. Whitespace is normalised (3+ consecutive newlines collapsed to 2).

**Output:** `{ url, title, text }` — text is always ≤ 4000 chars with `...` suffix if truncated.

**Use when:** The user asks what the page says, or the agent needs to extract information from the page content.

---

### `browser_get_sections`
Discovers content blocks on the page: headings (`h1–h6`), paragraphs, tables, lists (`ul`/`ol`), structural elements (`article`, `section`, `main`), and status/error elements (`[class*="error"]`, `[class*="alert"]`, `[class*="message"]`). Returns up to 30 visible, non-empty sections with index and a 120-character preview.

**Output:** Array of `{ index: number, tag: string, preview: string }`

**Use when:** The page is complex and the agent wants to identify a specific region before reading its full content. Follow up with `browser_get_section_text(index)` to read a section in full.

---

### `browser_get_section_text(index)`
Returns the full `innerText` of a section discovered by `browser_get_sections`. No truncation applied — individual section text is typically short.

**Args:** `index` — from the `browser_get_sections` result.

**Output:** Full text of the section, or an error if the index is invalid.

**Note:** The section list resets on page navigation. Re-call `browser_get_sections` after navigating.

---

### `browser_get_elements`
Discovers all visible interactive elements on the page: buttons, text inputs, textareas, dropdowns (`<select>`), and hyperlinks. Returns up to 50 elements with index, tag, label, and type information. Stores the live DOM references as `window.__agentElements` for subsequent interaction calls.

**Output:** Array of:
```json
[
  { "index": 0, "tag": "input",  "label": "Email address", "type": "email" },
  { "index": 1, "tag": "input",  "label": "Password",      "type": "password" },
  { "index": 2, "tag": "button", "label": "Sign in" },
  { "index": 3, "tag": "select", "label": "Country",       "options": ["Taiwan", "USA", ...] },
  { "index": 4, "tag": "a",      "label": "Forgot password?", "href": "/reset" }
]
```

**Label resolution:** `aria-label` → `title` → associated `<label>` text → `textContent` → `placeholder` → `name`.

**Note:** Disabled elements and hidden inputs are excluded. The element list resets on page navigation — re-call `browser_get_elements` after navigating.

---

### `browser_click(index)`
Clicks the element at `index` from the most recent `browser_get_elements` result. Works for buttons, links, checkboxes, and any other clickable element.

**Args:** `index` — from the `browser_get_elements` result.

**Output:** `"ok"` on success, error description on failure (element not found, index out of range).

**Side effects:** Clicking a link navigates the page — the element list becomes stale and must be refreshed.

---

### `browser_fill(index, value)`
Sets the value of an `<input>` or `<textarea>` at `index` and dispatches synthetic `input` and `change` events. Compatible with React and other frameworks that use controlled components.

**Args:**
- `index` — from the `browser_get_elements` result; must be an `input` or `textarea`
- `value` — the string to type into the field

**Output:** `"ok"` on success, error on failure.

---

### `browser_select(index, value)`
Selects an option in a `<select>` element at `index`. Matches by option visible text (substring) or by `option.value` attribute. Dispatches a `change` event after selection.

**Args:**
- `index` — from the `browser_get_elements` result; must be a `select`
- `value` — the option label (or value attribute) to select

**Output:** `"ok"` on success, error if the element is not a select or the option is not found.

## Typical Interaction Patterns

### Read page content
```
browser_get_page_info         → confirm we're on the right page
browser_get_page_text         → read main content
```

### Fill and submit a form
```
browser_get_elements          → discover form fields and submit button
browser_fill(0, "user@example.com")
browser_fill(1, "password123")
browser_select(3, "Taiwan")
browser_click(2)              → click "Sign in"
```

### Read a specific table or error message
```
browser_get_sections          → survey content blocks, spot "table" or error div
browser_get_section_text(5)   → read that section in full
```

## Chat UI

Each interaction tool (`browser_click`, `browser_fill`, `browser_select`) appends a compact `browser-action` log entry in the chat panel after it runs:

```
[Browser] Clicked "Sign in"
[Browser] Filled "Email address" → "user@example.com"
[Browser] Selected "Taiwan" in "Country"
```

Read-only tools (`browser_get_page_info`, `browser_get_page_text`, `browser_get_sections`, `browser_get_section_text`, `browser_get_elements`) produce no chat log entry — their output goes directly to the agent.
