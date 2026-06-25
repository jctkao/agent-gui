## Context

The app has a Tauri browser overlay webview that runs independently from the main React window. Keyboard shortcuts for that overlay are implemented in `vimium.js`, which is injected via `wv.eval()` on every `PageLoadEvent::Finished` in `lib.rs`. The shortcuts are currently hardcoded in a `switch(key)` block. The Settings modal already has a Keyboard Shortcuts tab, but it is a read-only reference table.

The challenge: bindings must reach two separate JS runtimes — the main React window (for future app shortcuts) and the overlay webview (for browser shortcuts). They share one SQLite store but cannot share in-memory state directly.

## Goals / Non-Goals

**Goals:**
- Users can remap all ten browser vimium actions to custom keys or sequences
- Bindings persist in SQLite and survive app restarts
- Conflict detection blocks direct conflicts and prefix conflicts within a context
- Action definition table is context-aware (`"browser"` | `"app"`) for future extension

**Non-Goals:**
- App-level shortcut execution (slots are defined but not wired up)
- Real-time re-injection into the current overlay page (takes effect on next load)
- Importing or exporting binding profiles
- Binding to mouse events or gestures

## Decisions

### D1: Store overrides only, not full binding map

**Decision**: SQLite stores only user overrides (`{ action_id: key }`). Defaults live in `keybindings.ts` and are merged at runtime.

**Rationale**: Adding new default actions in future releases automatically gets the correct default for users who never touched that action. If we stored the full map, every schema change would need a migration.

**Alternative considered**: Store complete map — simpler read path, but requires migration on every new action.

---

### D2: Inject bindings as `window.__bindings` before vimium.js

**Decision**: In `lib.rs`'s `on_page_load` handler, read the effective bindings from the managed Rust state and inject `window.__bindings = {...}` via `wv.eval()` before calling `wv.eval(include_str!("vimium.js"))`. `vimium.js` is refactored to read from `window.__bindings`.

**Rationale**: The page load callback is synchronous/fire-and-forget; async SQLite access inside it is awkward. Keeping a copy of the effective bindings in Tauri managed state (updated whenever the user saves) lets the callback read synchronously.

**Managed state shape** (Rust):
```rust
pub struct KeybindingState {
    pub browser: HashMap<String, String>, // action_id → effective key
}
```

**Alternative considered**: Pass bindings as a parameter to `browser_open` from the frontend — simpler but requires the frontend to load bindings and thread them through every navigate call, adding coupling.

---

### D3: Sequence capture with 1-second window

**Decision**: After the first key in capture mode, a 1-second timer starts. A second keypress within that window extends the sequence; expiry commits the current sequence as the binding.

**Rationale**: Matches the timeout already used in `vimium.js` for `gg` detection — consistent mental model for users.

**Edge case**: Modifier combos (`Ctrl+X`) commit immediately on keydown (no timer needed — modifiers are unambiguous).

---

### D4: Prefix conflict is a hard block

**Decision**: If the proposed key is a prefix of any existing binding (or vice versa) in the same context, saving is blocked with an explanatory message.

**Rationale**: A shadowed prefix makes the longer sequence unreachable. Warning-only would leave users with a broken binding they might not notice until they test it.

**Check implementation**: For each proposed key `p` and each existing effective key `e` (excluding the row being edited), block if `e.startsWith(p) || p.startsWith(e)`.

---

### D5: Tauri command to save bindings updates both SQLite and managed state atomically

**Decision**: A new `save_keybindings(overrides: HashMap<String, String>)` Tauri command writes to SQLite and updates `KeybindingState` in a single call.

**Rationale**: Keeps the managed state and SQLite in sync without a separate reload step. The next page load in the overlay will pick up the updated state.

---

### D6: Sequence representation

**Decision**: Keys are encoded as strings. Single keys use their `KeyboardEvent.key` value (e.g. `"j"`, `"G"`, `"Escape"`). Modifier combos use `"Ctrl+"`, `"Alt+"`, `"Shift+"` prefixes (e.g. `"Ctrl+,"`). Sequences are concatenated with no separator (e.g. `"gg"`).

**Constraint**: Sequences are only supported for non-modifier keys (matching vimium.js's existing sequence model). Modifier combos are always single-step.

## Risks / Trade-offs

- **vimium.js sequence parser complexity**: The existing `gg` special case must be generalized to support arbitrary sequences from `window.__bindings`. The sequence matching becomes a prefix-trie walk rather than a hardcoded timer. → Mitigation: implement a simple linear scan since the number of sequences is small (< 20 actions).

- **Managed state initialization**: On app start, `KeybindingState` must be loaded from SQLite before the first page load, or the overlay will use defaults even if overrides exist. → Mitigation: load from SQLite in the `setup()` closure before the window is shown.

- **SQLite access in setup()**: The `tauri-plugin-sql` plugin is async; setup() runs before the async runtime is fully warm. → Mitigation: use `std::thread::spawn` + `block_on` or Tauri's `async_runtime::block_on` to load synchronously during setup.

## Migration Plan

1. SQLite schema unchanged — `keybindings` is a new key in the existing `settings` table; no migration needed.
2. On first launch after update, `keybindings` is absent → all defaults apply → no behavior change for existing users.
3. No rollback concern: removing the `keybindings` key restores defaults automatically.

## Open Questions

*(none — all decisions made during exploration)*
