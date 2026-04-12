# Issues

(none yet)

## T6: Visual Foundation (2026-04-13)

### shadcn scroll-area unused import
- `src/components/ui/scroll-area.tsx` shipped with `import * as React from "react"` but never uses it
- Fixed by removing the import. shadcn generate bug.

## T7: Import normalization and dataset shaping (2026-04-13)

### Data-model caveat
- Fixture contract from T3 only carries explicit previous-year actuals if the test data includes prior fiscal-year months. `generateComparisonData()` therefore infers `C` strictly from normalized rows present in the requested fiscal windows; missing historical rows intentionally stay `null` instead of silently defaulting to `0`
