## Context

`vimium.js` generates hint labels via `generateLabels(count)`. The current algorithm runs two loops: first it pushes all 14 single-char labels (`s a d f j k l e w c m p g h`), then it pushes two-char combinations starting with those same chars (`ss sa sd …`). This means single-char label `s` coexists with two-char labels `ss`, `sa`, etc.

In `updateHints()`, a label auto-activates only when `matchCount === 1`. Because `s` is a prefix of every `s_` two-char label, typing `s` always matches more than one hint — the count never reaches 1 and the element labeled `s` is unreachable.

The fix is confined to `generateLabels`. No other logic in the file needs to change.

## Goals / Non-Goals

**Goals:**
- Produce a prefix-free label set: no assigned label is a prefix of another assigned label.
- Preserve the existing auto-activation contract: typing a complete label always results in `matchCount === 1`.
- Keep the change surgical — touch only `generateLabels`.

**Non-Goals:**
- Changing the hint character set (`sadfjklewcmpgh`).
- Optimising label ergonomics beyond what the current character ordering already provides.
- Supporting 3-char labels (196 two-char labels covers any realistic page).

## Decisions

### D1: Reserve prefix chars at the front of HINT_CHARS

When two-char labels are needed, the first `j` characters of `HINT_CHARS` become two-char prefixes only; the remaining `14 - j` characters stay as single-char labels.

```
j = ceil((count - 14) / 13)   // each sacrificed char nets +13 labels
```

Single-char labels (from index `j` onward) are emitted first, then two-char labels. This preserves the property that shorter labels go to earlier/more-prominent elements.

| count | j | single-char | two-char cap | total cap |
|-------|---|-------------|--------------|-----------|
| ≤14   | 0 | 14          | 0            | 14        |
| 15–27 | 1 | 13          | 14           | 27        |
| 28–40 | 2 | 12          | 28           | 40        |
| …     | … | …           | …            | …         |
| ≥196  | 14| 0           | 196          | 196       |

**Alternative considered**: keep the two-loop structure and add a post-pass to remove single-char labels that conflict with two-char prefixes. Rejected — harder to reason about and produces a non-deterministic ordering.

### D2: No change to `updateHints` activation logic

The `matchCount === 1 && typed.length > 0` guard is correct once labels are prefix-free. With prefix-free labels:
- Typing a single-char label: all other labels start with different chars → only 1 match → auto-activate.
- Typing the first char of a two-char label: multiple `x_` labels remain → no premature activation.
- Typing both chars of a two-char label: exactly 1 match → auto-activate.

No change needed.

## Risks / Trade-offs

- **Label assignment shift**: Elements 1–14 previously got `s a d f … h`; with `j=1` they now get `a d f j k l e w c m p g h ss` (element 14 shifts from `h` to `ss`). This is a cosmetic change with no functional impact.
- **Maximum capacity**: 196 two-char labels. A page with more than 196 visible clickable elements would receive empty labels for the overflow. This is identical to the current behaviour and affects no real-world page.

## Migration Plan

Pure additive fix. No migration needed. Rollback: revert `generateLabels` to the two-loop form.
