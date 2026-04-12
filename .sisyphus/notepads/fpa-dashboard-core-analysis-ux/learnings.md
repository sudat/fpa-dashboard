# Learnings

## 2026-04-13 Plan Init
- Repository is greenfield: no package.json, src/, vite.config.*, tsconfig.json
- shadcn Base UI preset (https://ui.shadcn.com/create?preset=b1tMK2lJz) to be used as visual foundation
- ui-ux-pro-max skill must be used for all visual-engineering tasks
- Tech stack: React / Vite 8 / shadcn/ui (Base UI) / zod / React Hook Form
- Delivery: Google Apps Script (HTML Service) + Vite build → clasp push
- Data: Loglass xlsx, ~60k rows/file, 10 columns
- Desktop-first, calm B2B SaaS UI tone
- TanStack Table + Virtual for large dataset handling
- Recharts for graph rendering (plan default)
- TanStack Query for data fetching (plan default)

## 2026-04-13 T4: Shared Schemas, Formatting, and Utility Layer

### Formatting Conventions Decided
- **Negative prefix**: `△` (Japanese business convention, not minus sign)
- **Empty state**: `―` (em dash) for null/undefined/invalid values
- **Positive delta**: `+` prefix for explicit positive deltas
- **Currency cells**: No ¥ symbol in table cells (per PRD comparison column grammar)
- **Rate display**: Default 1 decimal place (e.g., `12.3%`)
- **GMV ratio**: Denominator from GMV集計科目, division-by-zero → `―`
- **Compact currency**: `1.5億` (≥100M), `345万` (≥10K), integer 万 values keep comma separators

### Architecture Decisions
- `src/lib/ui/tokens.ts` is the single source of truth for display constants (DRY)
- Format functions import from tokens — no magic strings in format modules
- `clsx` + `tailwind-merge` installed for `cn()` utility (shadcn standard)
- Pure utility functions — no React imports, no UI library deps
- `parseCurrencyInput` included for future form input support

### Test Coverage
- 47 tests passing across currency.test.ts and rate.test.ts
- Tests cover: positive, negative, zero, null, undefined, compact mode, parsing
- `bun test` works natively (no additional test config needed)
