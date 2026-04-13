# Draft: upload-metadata-only-bfirst

## Requirements (confirmed)
- Upload labels must switch from single-month labels to range labels derived from uploaded content.
- Upload history should center on original filename, upload timestamp, and generated range label.
- Dashboard comparison flow must become B-first: select B, then auto-select A/C relative to B, with optional manual override.
- Uploaded detail rows must NOT be written into the GAS-bound analysis spreadsheet.
- The bound spreadsheet may only receive metadata such as history / mapping / lookup records.

## Technical Decisions
- Planning will treat "no raw detail writes to spreadsheet" as a non-negotiable guardrail.
- The canonical post-upload raw-data source will be the archived Drive original, re-read on analysis requests.
- The plan will preserve the existing `ABCResolution` shape while changing how values are derived.

## Research Findings
- `src/lib/domain/scenario-label.ts` currently generates single-target-month labels and auto-resolves A/B/C by timestamp order.
- `src/lib/domain/upload-contract.ts` enforces the current label regex and uses `generatedLabel + scenarioFamily` as replacement identity.
- `gas/lib/upload.js` currently writes uploaded detail rows to per-upload sheets and `gas/lib/history.js` records metadata in `UploadHistory`.
- `src/features/analysis/lib/comparison-resolver.ts` dedupes and resolves uploads using `generatedLabel` and current ABC rules.
- `src/features/analysis/state/use-analysis-state.ts` and related UI components manage A/B/C independently today.

## Open Questions
- What exact internal replacement key should replace `generatedLabel + scenarioFamily`?
- Should old single-month upload history entries be migrated or supported in dual-read mode?

## Scope Boundaries
- INCLUDE: domain contracts, label generation, GAS upload/history flow, B-first dashboard resolution, UI wiring, tests, PRD updates.
- EXCLUDE: comment system, auth/permission changes, visualization redesign, master-mapping feature expansion, snapshot/versioning.
