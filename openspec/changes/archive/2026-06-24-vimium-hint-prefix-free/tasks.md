## 1. Fix generateLabels in vimium.js

- [x] 1.1 Replace the two-loop body of `generateLabels` with the prefix-free algorithm: compute `j = ceil((count - n) / (n - 1))`, emit single-char labels from index `j` onward, then emit two-char labels using the first `j` chars as prefixes
- [x] 1.2 Verify with count=14: result is `['s','a','d','f','j','k','l','e','w','c','m','p','g','h']` (unchanged)
- [x] 1.3 Verify with count=15: result has 15 labels, none of which is a prefix of another (e.g. `['a','d','f','j','k','l','e','w','c','m','p','g','h','ss','sa']`)
- [x] 1.4 Verify with count=28: result has 28 labels, prefix-free, with 12 single-char and 16 two-char

## 2. Update spec scenario

- [x] 2.1 In `openspec/changes/browser-vimium-mode/specs/browser-vimium-mode/spec.md`, replace the "Two-char labels for large pages" scenario with the updated prefix-free wording from this change's delta spec
