## Context

`SettingsModal.tsx` is currently a self-contained ~120-line component: a fixed 420px centered overlay with inline styles, three input fields, and one Save button. The component reads from and writes to the settings DB via `lib/settings.ts`. No Rust changes are needed. Styling uses inline `React.CSSProperties` objects with design tokens from `index.css` — the pattern used everywhere in this codebase.

## Goals / Non-Goals

**Goals:**
- Replace the flat dialog with a two-panel layout (sidebar + content area)
- Size the modal at 75vw × 75vh
- Keep AI Models fields and save logic unchanged
- Add a read-only Keyboard Shortcuts reference panel

**Non-Goals:**
- Editable key bindings (deferred)
- New settings DB keys
- Any Rust/backend changes
- Extracting sub-components into separate files

## Decisions

**Single-file refactor**
Keep everything in `SettingsModal.tsx`. Two panels don't justify separate files — they share the same modal shell, the same `onClose` prop, and the save logic is 4 lines. Splitting would add indirection with no benefit.

**Active tab via `useState<'ai' | 'shortcuts'>`**
Simple string state; no router, no context. The modal is ephemeral and has exactly two panels.

**Modal sizing: `width: "75vw", height: "75vh"`**
Applied to the dialog container. `75vw`/`75vh` are viewport-relative so the modal scales with window size. The overlay backdrop remains `position: fixed, inset: 0`.

**Layout: flexbox, sidebar fixed at 180px**
```
dialog (flex row, 75vw × 75vh)
  ├── sidebar (180px, flex col, border-right)
  │     tab item × N
  └── content (flex: 1, flex col, overflow-y: auto)
        panel content
        [Save button — AI Models only]
```

**Active tab style**
Match the app's existing tab aesthetic: active item gets `background: var(--accent-bg)` and a `3px solid var(--accent)` left border. Inactive items get a hover state via `onMouseEnter`/`onMouseLeave` (same pattern as TitleBar window buttons).

**Keyboard Shortcuts table**
Plain HTML table with two columns (Key, Action). Styled with the existing `--border-dash` and `--text-muted` tokens. A small italicised note above the table: "快捷鍵僅適用於瀏覽器面板。"

## Risks / Trade-offs

[75vh can feel tall on small screens] → Acceptable; the app targets desktop. Min-height is not needed for now.

[Hover state requires component-level state or CSS] → Using `onMouseEnter`/`onMouseLeave` on each tab item, consistent with how TitleBar handles window button hover.
