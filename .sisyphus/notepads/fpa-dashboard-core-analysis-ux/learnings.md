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

## 2026-04-13 Loglass data contract discoveries
- `docs/prototype/Code_v2.gs` prototype backend treats Loglass upload as 10 columns: `計画・実績`, `年月`, `ログラス科目コード`, `外部システム科目コード`, `科目`, `科目タイプ`, `ログラス部署コード`, `外部システム部署コード`, `部署`, `金額`
- Prototype normalizes `年月` with `_normalizePeriod()` into `yyyy-MM`; it accepts both Date objects and strings like `2026/02/01` or `2026-2-1`
- Prototype comparison logic is keyed by `シナリオ × 年月度`; re-upload replaces rows for the same combination wholesale
- Scenario semantics in prototype: exact `実績` is actuals, names containing `予算` / `計画` can be treated as budget, and monthly named forecast scenarios (for example `26年3月期着地見込0224時点`) are forecast snapshots
- PRD fixes the analysis grammar for all time axes as `A`, `B`, `B-A`, `C`, `B-C`; meanings differ by axis but the column grammar stays stable
- Time axes required by PRD are `単月`, `YTD`, `着地見込`; UI and selectors should reuse the same grammar across axes
- Account hierarchy requirement for the product is `集計科目 → 明細科目`; prototype CSV itself only carries one account name, so canonical raw contract should allow hierarchy fields to be supplied or defaulted from the detail account name
- Department views need both per-事業部 and `全社`; prototype facts are department-grain rows, while all-company views are derived downstream
- GMV ratio denominator must be the `GMV` aggregate account built from GMV detail accounts, so normalized contract should mark GMV aggregate rows explicitly
- A safe normalized row key needs department + account + yearMonth + periodType + metricType, and forecast/budget snapshots should also carry `scenarioKey` to avoid collisions between multiple forecast uploads for the same month

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

## 2026-04-13 T1 Scaffold Complete
- Bun 1.2 uses `bun.lock` (JSON) not `bun.lockb` (binary) — task spec referenced old format
- Vite 8 scaffold (`bun create vite --template react-ts`) does NOT install deps or tailwindcss — must `bun install` then `bun add -d tailwindcss @tailwindcss/vite` separately
- Tailwind CSS v4 uses `@tailwindcss/vite` plugin, NOT a `tailwind.config.js` file
- shadcn/ui init requires paths in BOTH `tsconfig.json` (root) AND `tsconfig.app.json` — shadcn only reads the root tsconfig for alias validation
- shadcn init with `-t vite -b base` requires interactive preset selection — pipe answer via `echo "Nova" | bunx shadcn@latest init -t vite -b base -f -y`
- TS 6.0 deprecates `baseUrl` — must add `"ignoreDeprecations": "6.0"` to tsconfig.app.json
- Pre-existing test files from other tasks use `bun:test` (not vitest) — must exclude `**/*.test.*` and `src/test` from tsconfig.app.json to prevent build failures
- `bun test` runs bun's built-in test runner (no jsdom), while `bun run test` runs vitest via the script — important distinction
- shadcn Base UI Nova preset installs: lucide-react, tw-animate-css, @fontsource-variable/geist, class-variance-authority

## 2026-04-13 T2: GAS Delivery/Build Pipeline

### Key Architecture Decision
- Separate Vite config (`vite.config.gas.ts`) for GAS builds instead of modifying the main `vite.config.ts`
- `vite-plugin-singlefile` inlines ALL JS/CSS into a single `index.html` — exactly what GAS HTML Service needs
- The plugin auto-configures: `assetsInlineLimit`, `cssCodeSplit: false`, `base: "./"`, `inlineDynamicImports`

### Build Pipeline Flow
1. `bun run build:gas` → `scripts/build-gas.ts`
2. Runs `vite build --config vite.config.gas.ts` (singlefile output)
3. Assembles `gas-dist/` with: `appsscript.json`, `Code.js`, `index.html`
4. Final `gas-dist/` is clasp-push-ready

### GAS Constraints Learned
- GAS HTML Service can only serve individual files — no directories
- `HtmlService.createHtmlOutputFromFile('index')` looks for `index.html` in the GAS project root
- `vite-plugin-singlefile` v2.3.2 works with Vite 8 (confirmed)
- Build output: ~320 KB single HTML file (gzip ~130 KB)
- Static assets in `public/` (favicon.svg, icons.svg) are copied to `dist/` but NOT included in `gas-dist/` by design

### Files Created
- `appsscript.json` — GAS manifest (timeZone: Asia/Tokyo, webapp access: DOMAIN)
- `.clasp.json` — clasp config (rootDir: ./gas-dist, scriptId: placeholder)
- `gas/Code.js` — GAS entry point with `doGet()`
- `scripts/build-gas.ts` — build orchestration script
- `vite.config.gas.ts` — GAS-specific Vite config with viteSingleFile plugin

### Files Modified
- `package.json` — added `"build:gas"` script, `vite-plugin-singlefile` devDep
- `.gitignore` — added `gas-dist` and `.clasp.json`

### Verification
- `bun run build:gas` → produces correct `gas-dist/` with 3 files
- No external `<script src=...>` or `<link rel="stylesheet">` in output HTML
- `bun run test` → 56 tests passing (unchanged)
- `vite.config.ts` → NOT modified

## T6: Visual Foundation (2026-04-13)

### shadcn Base UI (Nova) patterns
- Components use `@base-ui/react/*` primitives (not Radix), e.g. `@base-ui/react/tabs`, `@base-ui/react/separator`
- CVA (class-variance-authority) is used for variant management
- `data-*` attributes for state: `data-active`, `data-size`, `data-slot`
- `group-data-[variant=...]` for contextual styling
- Tabs use `data-active` (not `aria-selected`) for active state

### Tailwind v4 specific
- No `tailwind.config.js` — config via CSS `@theme inline` block
- Custom utilities defined in `@layer utilities`
- CSS variables must be registered in `@theme inline` for Tailwind to recognize `var(--xxx)` shorthand
- `oklch()` color space used throughout Nova theme

### Financial color system
- oklch values chosen to match Tailwind emerald/rose shades
- Light: positive=emerald-600, negative=rose-600
- Dark: positive=emerald-400, negative=rose-400
- SIGN_COLORS in tokens.ts already defined with Tailwind classes; theme.ts uses CSS variable approach
- Both approaches coexist: tokens.ts for Tailwind class composition, theme.ts CSS vars for chart/recharts use

### Gotchas
- scroll-area.tsx from shadcn had unused `import * as React` — build fails with `tsc -b`
- TYPOGRAPHY constant uses `small` not `meta` (key naming choice)
- App.test.tsx expects exact "FPA Dashboard" text — use `sr-only` div to preserve it

## T5: App Shell & Navigation Skeleton (2026-04-13)

### Base UI Tabs API
- `@base-ui/react@1.3.0` Tabs supports controlled `value` + `onValueChange` props
- `onValueChange` callback signature: `(value: TabsTab.Value, eventDetails: ChangeEventDetails) => void`
- shadcn wrapper in `src/components/ui/tabs.tsx` passes all `TabsPrimitive.Root.Props` through
- `TabsList` has `variant="line"` for underline-style tabs (used in org tabs)
- Default variant uses bg-muted background pill style (used in time axis pills)

### Layout Structure
- Sidebar: `aside` with `style={{ width: "var(--sidebar-width)" }}` — CSS vars from index.css
- Comment panel: hidden below `lg` breakpoint (`className="hidden border-l lg:block"`)
- App shell: `flex h-screen overflow-hidden` on root, main area uses `flex-1 overflow-hidden`
- AnalysisHeader: combines org tabs + time pills in `border-b` header strip

### State Pattern
- `ShellState` interface with `activeNav`, `activeOrgTab`, `activeTimeAxis`
- Simple `useState` in AppShell, spread via `setState(prev => ({...prev, key: val}))`
- This preserves unrelated state during tab switches (confirmed via tests)

### Test Gotcha
- Sidebar brand text "FPA Dashboard" creates duplicate with the `sr-only` div
- Fixed App.test.tsx to use `getAllByText` with length check instead of `getByText`
- Base UI ScrollArea triggers React `act()` warnings in jsdom (cosmetic, tests still pass)

## T7: Import normalization and dataset shaping (2026-04-13)

### Normalization pipeline decisions
- `normalizeRawRows()` expands every raw Loglass row into 3 canonical axes (`単月` / `YTD` / `着地見込`) instead of pre-aggregating per axis. これで selector 側は periodType ごとに同じ契約で扱える
- Duplicate raw rows are collapsed by canonical `rowKey` and their `amount` is summed. 同一 xlsx 行の重複混入でも deterministic に吸収できる
- `scenarioKey` is omitted only for `実績`; `予算` / `見込` は row key に残して forecast snapshot collision を防いでいる
- `isGmvDenominator` is derived from `集計科目名 === "GMV"`; GMV比率は selector ではなく pure util (`computeGmvRatio`) に寄せた

### Comparison semantics encoded
- `generateComparisonData()` chooses the latest 2 forecast scenario keys in the target fiscal year and treats them as `current forecast` / `previous forecast`
- 単月: `A=前月見込対象月`, `B=実績対象月`, `C=前年同月実績`
- YTD: `A=前月見込累計`, `B=実績累計`, `C=前年累計`
- 着地見込: `A=前月見込通期`, `B=実績累計 + 最新見込残月`, `C=前年通期実績`
- Null と 0 は分離した。行が存在しない比較値は `null`、行が存在して金額 0 のときだけ `0`

### Grouping / aggregation conventions
- `aggregateByDepartment()` synthesizes `全社` rows from `事業部` rows and keeps original rows in the returned array so downstream selectors can choose either grain
- 全社集計キーは `hierarchyKey + period + metric + scenario`。department code は落として、shared 科目体系ベースで rollup する
- Hierarchy/order-sensitive helpers preserve first-seen order unless a sorted unique list is explicitly better (`getAggregateAccounts`)

## T12: Graph/Table Primitives (2026-04-13)

### Recharts v3 (3.8.0) with shadcn ChartContainer
- ChartContainer wraps ResponsiveContainer which provides width/height to children
- ChartConfig registers series with label + color; colors set via CSS vars (`var(--chart-actual)`, etc.)
- ChartStyle component injects `<style>` tag mapping `--color-{key}` for each config entry
- Use `var(--color-{key})` (not `var(--chart-{key})`) inside Recharts components — the ChartStyle maps from config key
- In jsdom, ResponsiveContainer renders SVG but bar `<path>` elements may be empty because jsdom doesn't provide real dimensions
- ChartTooltipContent has its own formatter that works with `TooltipValueType` — type is `number | string | Array<string | number>`
- Recharts `onClick` on Bar passes `(data, index, event)` — the `data` parameter is the chart payload

### TanStack Table patterns
- `useReactTable` with `getCoreRowModel()` and `getExpandedRowModel()` for expandable rows
- `ExpandedState` is `Record<string, boolean> | true` — managed via useState + onExpandedChange
- `flexRender(columnDef.header/cell, context)` renders column templates
- Generic type parameter: `<T extends Record<string, unknown>>` for type-safe rows
- `getRowCanExpand` controls which rows show expand button

### Chart component architecture
- TrendChart transforms TrendSeries.points into flat chart data with separate `actual`/`forecast` fields per data point
- DifferenceChart uses `Cell` component for per-bar coloring (positive=var(--chart-positive), negative=var(--chart-negative))
- Both charts use ChartContainer + ChartConfig pattern from shadcn for consistent styling
- Empty states render as centered "―" text with h-[Npx] fixed height

### Test approach
- 133 tests total (114 existing + 19 new)
- Recharts bar DOM assertions must be lenient in jsdom — check SVG existence + innerHTML length instead of specific path counts
- All test files use `vitest` imports (not `bun:test`)

## T13: Major-Account Summary Section (2026-04-13)

### Component patterns
- SummaryCard: compact shadcn Card (`size="sm"`) with CardHeader (account name) + CardContent (values)
- data-value attributes on value divs (`data-value="B"`, `data-value="BA"`, etc.) for test selectors
- data-testid on cards with account name: `data-testid="summary-card-{accountName}"`
- deltaColor helper: maps null → FINANCIAL_COLORS.empty, >0 → positive, <0 → negative, 0 → neutral

### Layout
- MajorAccountSummary uses CSS grid: `grid-cols-3 lg:grid-cols-5` for responsive layout
- Empty state: centered `―` with `py-12` padding (calm, not error-like)
- Selected card highlighted with `ring-2 ring-primary`

### Props pattern
- Components accept data via props only — no direct selector calls inside components
- Optional `onAccountSelect` callback for click handling, optional `selectedAccount` for highlight
- Keyboard accessible: role="button", tabIndex, Enter/Space key handlers when onClick provided

### TypeScript strictness
- tsc catches unused destructured props — use `_BC` prefix for intentionally unused props
- Unused imports (cn) also cause build failure — clean imports before building

### Test count: 141 total (133 existing + 8 new)

## T17: Analysis screen composition (2026-04-13)

### Composition / data-shaping decisions
- `AnalysisPage` keeps AppShell state as the single source of truth; header tabs/pills stay in `AppShell`, page only derives fixture-backed data and passes it to `AnalysisWorkspace`
- `loglass-small` fixture does not include aggregate accounts like `売上高` / `営業利益`, so T17 synthesizes aggregate raw rows inside `AnalysisPage` before `normalizeRawRows()` → `aggregateByDepartment()` → `generateComparisonData()`
- `resolveDepartmentCode()` can stay KISS by deriving codes from `ORG_TABS` index: `全社 -> ALL`, then `SaaS事業部 -> D001`, `広告事業部 -> D002`, ...; this matches current fixture naming without introducing another config file
- `AnalysisWorkspace` keeps selector calls in `useMemo` and adapts state/child API mismatches locally (`metricMode: gmvRatio <-> rate`)
- Detail table composition reuses summary parent rows and builds expandable child rows from comparison data + normalized-row aggregate metadata, so no extra selector file was needed (YAGNI)

### Test / integration gotchas
- Existing `AppShell` tests still assert the old placeholder text, so `AnalysisPage` preserves that text as an `sr-only` status line while rendering the real workspace
- Whole-company difference-chart labels duplicated top-tab text in jsdom queries; adding an invisible word-joiner to whole-company bar labels keeps the visible Japanese label unchanged while avoiding false-positive `getByText()` collisions in legacy tests

## F4: Scope fidelity audit (2026-04-13)
- `src/features/comments/components/comment-pane-shell.tsx` is a true deferred boundary: it carries `data-comment-status="deferred"`, lists deferred items, and contains no form/input/submit/API code
- Comment-related usage in `src/` is limited to the shell import/render path plus tests asserting absence of interactive elements
- `src/features/analysis/components/shared/detail-table.tsx` uses `@tanstack/react-virtual` `useVirtualizer`; the only `rows.map(...)` path is a jsdom fallback for zero-height test environments, not the production render path
- Desktop-first intent is explicit in live layout code via `CommentPaneShell className="hidden lg:flex"`; no `sm:` / `md:` layout breakpoints were found under `src/features/layout`
- `docs/prototype/` remains a monolithic HTML/GAS reference, while `src/` is organized as feature-based React modules (`features/`, `components/`, `lib/`), showing no prototype structure copy-paste
- No API calls, database integration, file-upload handlers, export/print features, or AI-analysis features were found in `src/`; `AI研究開発費` appears only as mock warning data, not as product capability
