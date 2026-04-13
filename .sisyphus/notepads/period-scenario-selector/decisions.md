## Decisions Log

### 2026-04-13 Planning Session
- resolveComparisonData API change → Option A (optional `abcOverride?` parameter)
- Month picker → shadcn Calendar + Popover (no date-fns)
- Org tabs → dropdown in filter bar (TopTabs kept as file, just unused in header)
- Duplicate ABC assignment → allowed (YAGNI)
- Month change → resets ABC to null (triggers auto re-resolution)
- Default targetMonth → "2026-02" in DEFAULT_STATE
- GAS data storage → ImportData sheet abolished, 1 upload = 1 Google Sheet
- Upload auto-detection → scan XLSX "計画・実績" column + date column
- gas-client.ts API surface → unchanged (same function signatures)

### 2026-04-13 Task 4 Implementation
- Added `gas/lib/detect.js` as a standalone GAS namespace module (`Detect`) instead of extending `Upload`, keeping scenario scanning/classification isolated.
- Forecast detection uses the latest detected actual month as `targetMonth` when present; if no actual rows exist, it falls back to the forecast scenario's own latest month.
- `Upload.previewUpload()` now returns `preview.detectedScenarios`, while keeping the existing function signature and replacement warning flow unchanged.
