# FPA Dashboard Core Analysis UX Plan

## TL;DR

> **Quick Summary**: Build the first production-grade core of the FPA dashboard as a greenfield React/Vite 8 application delivered through Google Apps Script, using the existing GAS prototype only as a business-logic reference.
>
> **Deliverables**:
> - React/Vite/shadcn/ui frontend scaffold deployable to GAS
> - Core analysis IA: 全社/事業部 tabs, 着地見込/YTD/単月 pills, summary rows, trend graph, difference graph, detail table
> - Import/admin minimal flow for upload result review and master-diff warnings
> - Deferred placeholder boundaries for comment UX and FPA review UX
>
> **Estimated Effort**: XL  
> **Parallel Execution**: YES - 4 waves  
> **Critical Path**: T1 → T3 → T7 → T8 → T13/T14/T15/T16 → T19 → T20 → FINAL

**難易度**: ★★★  
**根拠**: 20+ planned files, greenfield frontend + GAS delivery + 60k-row performance concern, multi-view analytical UX  
**リスク**: データ契約の未固定、GAS配信時のバンドル/パフォーマンス、Deferred 範囲のスコープ膨張

---

## Context

### Original Request
Create a plan file for the modernized dashboard. Clearly mark the areas that will be finalized later, then proceed to planning.

### Source of Truth
- Product PRD: `docs/prd/prd_fpa_dashboard_master.md`
- Historical prototype spec: `docs/prd/prd_fpa_dashboard.md`
- Prototype backend behavior reference: `docs/prototype/Code_v2.gs`
- Prototype frontend behavior reference: `docs/prototype/index.html`
- Planning draft / interview memory: `.sisyphus/drafts/fpa-dashboard-modern-saas.md`

### Current Repository Reality
- Repo is still planning/prototype-only. No `package.json`, `src/`, `vite.config.*`, `tsconfig.json`, `components.json`, CI workflow, or existing React code was found.
- The plan must therefore treat implementation as **greenfield**, not refactor.

### Interview Summary
- Core business goal is to improve the quality of budget review meetings, not merely automate document preparation.
- Meeting flow is: **difference cause → landing impact → decision**.
- Main IA is already mostly fixed:
  - top-level nav = `予実分析 / 管理`
  - inside analysis: `全社 + 各事業部` top tabs
  - time-axis pills = `着地見込 / YTD / 単月`
  - first view = fixed major-account summary rows
  - default secondary view = trend graph
  - detail table keeps current business column grammar
- Trend graph and difference graph behavior are decided enough for implementation.
- Comment UX and FPA review UX will be refined later, but placeholder shells/boundaries must exist now.

### Research Findings Incorporated
- GAS remains the delivery/runtime boundary and materially affects bundling, asset size, and data loading strategy.
- TanStack Table + virtualization should be planned from day one because source files are ~60k rows.
- Vite + GAS plugin / clasp delivery should be treated as foundational infra, not an afterthought.
- Prototype UI structure should not drive component architecture. Only behavior and domain rules should be borrowed.

### Metis Review (addressed)
- Missing guardrail added: this plan explicitly isolates deferred comment/review workflow.
- Missing guardrail added: data contract + fixture definition are first-wave tasks.
- Missing guardrail added: performance validation with representative large fixtures is a required wave, not polish.
- Missing guardrail added: desktop-first assumption is explicit.

---

## Work Objectives

### Core Objective
Deliver the first implementation-ready version of the dashboard’s core analysis UX so FPA can upload data, validate it, open the dashboard, and navigate summary → graph → table flows for 全社 and each 事業部 using consistent information architecture.

### Concrete Deliverables
- New frontend application scaffold using React/Vite 8/shadcn/ui/zod/RHF
- GAS-compatible build/deploy pipeline
- Normalized dashboard data contract + representative fixtures
- Analysis shell with tabs, pills, summary rows, trend graph, difference graph, detail table
- Minimal admin surface: upload result log, master-diff warnings, handoff to analysis screen
- Explicit deferred placeholders for comment panel behaviors and FPA review workflow details

### Definition of Done
- [ ] `bun test` passes for transform logic, selectors, UI interactions, and deferred-boundary placeholders
- [ ] `bun run build` succeeds for GAS delivery target
- [ ] Representative large fixture can drive the analysis UI without unusable slowdown
- [ ] Core flows from PRD are executable without relying on manual spreadsheet/docs work

### Must Have
- Desktop-first, calm B2B SaaS UI
- Stable IA matching confirmed PRD decisions
- Time-axis views sharing one table grammar
- Weak-link interactions instead of disorienting auto-navigation
- Import/admin kept minimal

### Must NOT Have (Guardrails)
- No full comment system workflow in v1 core implementation
- No approvals, mentions, notifications, or threaded workflow automation
- No prototype-driven component structure copy-paste
- No “render all rows first, optimize later” approach
- No mobile-first scope expansion
- No AI analysis scope in this wave

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: YES (TDD)
- **Framework**: Vitest + Testing Library (planned)
- **If TDD**: Every logic/UI slice follows RED → GREEN → REFACTOR

### QA Policy
Every implementation task must include agent-executed verification. No “user manually checks” criteria are allowed.

- **Frontend/UI**: Playwright-based browser scenarios against local app
- **Library/logic**: Vitest fixture-driven assertions
- **Build/GAS**: build command, generated artifact inspection, GAS manifest/deploy smoke checks
- **Performance**: representative fixture scenarios, not subjective judgment

### Required Fixture Strategy
- Create at least one small deterministic fixture and one representative large fixture.
- Validate that summary rows, trend graph values, difference graph values, and detail table totals reconcile from the same normalized source.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (foundation + contracts)
├── T1: Frontend/tooling scaffold
├── T2: GAS delivery/build pipeline
├── T3: Normalized data contract + representative fixtures
├── T4: Shared schemas, types, and formatting utilities
├── T5: App shell + top-level navigation skeleton
└── T6: Visual foundation using shadcn Base UI direction

Wave 2 (core data/model layer)
├── T7: Import normalization and dataset shaping logic
├── T8: Derived selectors for summary/table/graphs
├── T9: Global analysis state model (tabs/pills/weak links)
├── T10: Minimal auth/role surface assumptions + route gating shell
├── T11: Admin minimal shell (upload result log + warnings)
└── T12: Shared graph/table primitives and data adapters

Wave 3 (core analysis UX)
├── T13: Major-account summary section
├── T14: Trend graph view
├── T15: Difference graph view
├── T16: Detail table with expand/drill behavior
├── T17: Analysis tab composition for 全社 + 各事業部
└── T18: Deferred comment pane placeholder boundaries

Wave 4 (integration + quality)
├── T19: Weak-link cross-view interactions
├── T20: Large-fixture virtualization/performance hardening
├── T21: Loading/empty/error/accessibility polish
└── T22: Admin-to-analysis handoff and snapshot boundary hooks

Wave FINAL
├── F1: Plan compliance audit
├── F2: Code quality review
├── F3: Real scenario QA
└── F4: Scope fidelity / deferred-boundary audit
```

### Dependency Matrix

- **T1**: none → T5, T9, T10, T12
- **T2**: none → T22
- **T3**: none → T7, T8, T20
- **T4**: none → T7, T8, T13-T18
- **T5**: T1, T6 → T17, T18, T21
- **T6**: none → T5, T13-T18, T21
- **T7**: T3, T4 → T8, T11, T22
- **T8**: T3, T4, T7 → T13, T14, T15, T16, T17
- **T9**: T1, T5 → T17, T19
- **T10**: T1 → T17, T18, T21
- **T11**: T1, T7 → T22
- **T12**: T1, T4, T8 → T14, T15, T16
- **T13**: T5, T8 → T17, T19
- **T14**: T8, T12 → T17, T19
- **T15**: T8, T12 → T17, T19
- **T16**: T8, T12 → T17, T19, T20
- **T17**: T5, T8, T9, T10, T13-T16 → T19, T21
- **T18**: T5, T10 → T21
- **T19**: T9, T13-T17 → T21
- **T20**: T3, T16 → F3
- **T21**: T5, T10, T17-T19 → F1-F4
- **T22**: T2, T7, T11 → F1, F3

### Agent Dispatch Summary

- **Wave 1**: T1 quick, T2 unspecified-high, T3 deep, T4 quick, T5 visual-engineering, T6 visual-engineering
- **Wave 2**: T7 deep, T8 deep, T9 quick, T10 unspecified-high, T11 quick, T12 visual-engineering
- **Wave 3**: T13 visual-engineering, T14 visual-engineering, T15 visual-engineering, T16 unspecified-high, T17 deep, T18 quick
- **Wave 4**: T19 deep, T20 unspecified-high, T21 visual-engineering, T22 quick
- **Final**: F1 oracle, F2 unspecified-high, F3 unspecified-high, F4 deep

---

## TODOs

- [x] **T1. Scaffold frontend workspace and test tooling**
  - **Files**: Create `package.json`, `bun.lockb`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`
  - **References**: `docs/prd/prd_fpa_dashboard_master.md` (target stack), background finding: repo has no implementation files yet
  - **Acceptance**:
    - `bun install` succeeds
    - `bun test` runs an initial smoke spec successfully
    - `bun run build` produces a baseline build artifact
  - **QA Scenarios**:
    - Scenario: app shell boots locally without analysis content crashing
    - Scenario: missing env/deploy config produces explicit setup guidance, not silent failure

- [x] **T2. Establish GAS delivery/build pipeline**
  - **Files**: Create `appsscript.json`, `.clasp.json`, `scripts/` build helpers if needed, modify `vite.config.ts`
  - **References**: librarian GAS/Vite build guidance; `docs/prototype/Code_v2.gs` for GAS runtime expectations
  - **Acceptance**:
    - `bun run build` emits GAS-compatible output
    - generated bundle exposes intended GAS entry surface without tree-shaking away required functions
  - **QA Scenarios**:
    - Scenario: inspect build output for GAS manifest + generated script/html artifacts
    - Scenario: invalid plugin config fails loudly during build

- [x] **T3. Define normalized data contract and fixtures**
  - **Files**: Create `src/lib/loglass/schema.ts`, `src/lib/loglass/types.ts`, `src/lib/fixtures/loglass-small.ts`, `src/lib/fixtures/loglass-large.ts`, tests under `src/lib/loglass/*.test.ts`
  - **References**: `docs/prd/prd_fpa_dashboard_master.md`, `docs/prototype/Code_v2.gs` lines around `_normalizePeriod`, `getComparisonData`, and CSV column mapping
  - **Acceptance**:
    - fixture schemas validate through zod
    - unique normalized row key strategy is explicit and tested
    - large fixture represents ~60k-row class behavior
  - **QA Scenarios**:
    - Scenario: small fixture passes schema validation and normalization snapshot tests
    - Scenario: malformed fixture (missing required columns / nonnumeric values) fails with actionable errors

- [x] **T4. Create shared schemas, formatting, and utility layer**
  - **Files**: Create `src/lib/format/currency.ts`, `src/lib/format/rate.ts`, `src/lib/ui/tokens.ts`, `src/lib/utils.ts`, associated tests
  - **Acceptance**:
    - formatting helpers encode current business display grammar
    - utility layer is independently testable
  - **QA Scenarios**:
    - Scenario: negative/positive/zero formatting matches PRD expectations
    - Scenario: null/blank values render defined empty-state tokens

- [x] **T5. Build app shell and navigation skeleton**
  - **Files**: Create `src/features/layout/components/app-shell.tsx`, `src/features/layout/components/sidebar.tsx`, `src/features/layout/components/top-tabs.tsx`, `src/features/layout/components/time-axis-pills.tsx`, tests
  - **References**: `docs/prd/prd_fpa_dashboard_master.md` sections 7.2-7.3
  - **Acceptance**:
    - top-level nav is only `予実分析 / 管理`
    - top tabs support 全社 + 各事業部
    - pill tabs support 着地見込 / YTD / 単月
  - **QA Scenarios**:
    - Scenario: desktop viewport shows shell layout correctly
    - Scenario: rapid tab switching does not reset unrelated state unexpectedly

- [x] **T6. Apply visual foundation from shadcn Base UI direction**
  - **Files**: Create `components.json`, `src/index.css`, `src/components/ui/*` baseline components, theme tokens/tests if present
  - **References**: user-selected shadcn Create Base UI direction, `docs/prototype/index.html` for prototype tokens only as loose aesthetic reference
  - **Acceptance**:
    - calm B2B SaaS visual baseline established
    - summary/table/chart/comment regions are visually separable without heavy ornamentation
  - **QA Scenarios**:
    - Scenario: shell looks medium-density and readable at desktop widths
    - Scenario: contrast and focus states remain clear in main navigation and tabs

- [x] **T7. Implement import normalization and dataset shaping logic**
  - **Files**: Create `src/features/admin/lib/normalize-loglass.ts`, `src/features/admin/lib/grouping.ts`, tests
  - **References**: `docs/prototype/Code_v2.gs`, PRD data model, confirmed meeting flows
  - **Acceptance**:
    - xlsx-derived rows normalize into canonical dataset shape
    - account/dept grouping hooks are explicit extension points
  - **QA Scenarios**:
    - Scenario: normalized output reproduces known fixture-derived totals
    - Scenario: duplicate/blank edge cases are handled deterministically

- [x] **T8. Implement derived selectors for summary, graphs, and tables**
  - **Files**: Create `src/features/analysis/lib/selectors.ts`, `src/features/analysis/lib/summary.ts`, `src/features/analysis/lib/trend.ts`, `src/features/analysis/lib/difference.ts`, tests
  - **Acceptance**:
    - summary rows, trend series, difference bars, and detail table rows reconcile from same source
    - time-axis semantics are explicit per view
  - **QA Scenarios**:
    - Scenario: summary totals equal rolled-up detail totals for all three axes
    - Scenario: difference graph values match expected absolute-diff ordering

- [x] **T9. Implement global analysis state model**
  - **Files**: Create `src/features/analysis/state/use-analysis-state.ts`, `src/features/analysis/state/analysis-state.test.ts`
  - **Acceptance**:
    - selected top tab, time axis, metric mode, and weak-link target states are managed centrally
  - **QA Scenarios**:
    - Scenario: switching time axis preserves active org tab
    - Scenario: weak-link state only affects intended view(s)

- [x] **T10. Create minimal auth/role boundary shell**
  - **Files**: Create `src/features/auth/types.ts`, `src/features/auth/lib/permissions.ts`, `src/features/auth/components/role-gate.tsx`, tests
  - **Acceptance**:
    - admin-only `管理` path is gateable
    - analysis screens can assume desktop-first role surface
  - **QA Scenarios**:
    - Scenario: non-admin cannot open admin screen
    - Scenario: missing user context degrades safely

- [x] **T11. Build minimal admin shell**
  - **Files**: Create `src/features/admin/components/admin-page.tsx`, `src/features/admin/components/import-log.tsx`, `src/features/admin/components/master-diff-warning.tsx`, tests
  - **Acceptance**:
    - admin screen shows upload result log and master-diff warnings only
    - no full review workflow leaks in
  - **QA Scenarios**:
    - Scenario: admin sees import result log first, then warnings
    - Scenario: empty warning state is explicit and quiet

- [x] **T12. Create graph/table primitives and adapters**
  - **Files**: Create `src/features/analysis/components/shared/trend-chart.tsx`, `src/features/analysis/components/shared/difference-chart.tsx`, `src/features/analysis/components/shared/detail-table.tsx`, tests
  - **Acceptance**:
    - primitives accept selector outputs without view-specific hacks
  - **QA Scenarios**:
    - Scenario: chart/table primitives render fixture data without runtime warnings
    - Scenario: extremely long labels truncate/tooltip safely

- [x] **T13. Implement major-account summary section**
  - **Files**: Create `src/features/analysis/components/summary/major-account-summary.tsx`, tests
  - **Acceptance**:
    - fixed major accounts render with 着地見込 / 前月見込 / 前年差 columns
  - **QA Scenarios**:
    - Scenario: major-account summary reflects selected org tab and time axis
    - Scenario: summary fallback for empty data is explicit

- [x] **T14. Implement trend graph experience**
  - **Files**: Create/modify `trend-chart.tsx`, `src/features/analysis/components/trend-panel.tsx`, tests
  - **Acceptance**:
    - default secondary view is trend graph
    - target month uses vertical highlight band
    - metric toggle supports amount / GMV ratio
  - **QA Scenarios**:
    - Scenario: switching amount↔GMV ratio updates graph only, not unrelated views
    - Scenario: graph click does not trigger unintended navigation

- [x] **T15. Implement difference graph experience**
  - **Files**: Create `src/features/analysis/components/difference-panel.tsx`, modify `difference-chart.tsx`, tests
  - **Acceptance**:
    - horizontal bars, top ~5, absolute-diff order, good/bad colors
    - full-org and per-org decomposition modes follow PRD rules
  - **QA Scenarios**:
    - Scenario: 全社 uses business-unit bars, 事業部 uses detail-account bars
    - Scenario: sign colors and ordering remain correct with mixed positive/negative values

- [x] **T16. Implement detail table**
  - **Files**: Modify/create `detail-table.tsx`, `src/features/analysis/components/detail-panel.tsx`, tests
  - **Acceptance**:
    - aggregate-account rows expand to detail accounts
    - column grammar remains consistent across axes
  - **QA Scenarios**:
    - Scenario: expand/collapse preserves scroll and surrounding context
    - Scenario: table values reconcile to summary/selector outputs

- [x] **T17. Compose analysis screen for 全社 and 各事業部**
  - **Files**: Create `src/features/analysis/pages/analysis-page.tsx`, `src/features/analysis/components/analysis-workspace.tsx`, tests
  - **Acceptance**:
    - same format used for 全社 and each 事業部
    - no extra embedded “事業部分解 page” is introduced
  - **QA Scenarios**:
    - Scenario: switching org tabs retains common screen grammar
    - Scenario: top tabs scale to 10+ business units using horizontal scroll

- [x] **T18. Add deferred comment pane placeholder boundaries**
  - **Files**: Create `src/features/comments/components/comment-pane-shell.tsx`, tests
  - **Acceptance**:
    - right-side pane exists with read/placeholder structure
    - deferred workflow features are explicitly marked and isolated
  - **QA Scenarios**:
    - Scenario: comment pane renders timeline shell without blocking analysis interactions
    - Scenario: deferred markers are visible in placeholder states

- [x] **T19. Implement weak-link cross-view interactions**
  - **Files**: Modify summary/difference/detail integration components, add tests
  - **Acceptance**:
    - summary account selection auto-updates trend graph only
    - difference graph click weak-links into detail table with temporary expand/scroll/highlight
  - **QA Scenarios**:
    - Scenario: selecting summary account does not unexpectedly switch comments/table context
    - Scenario: difference graph click highlights correct detail row for a few seconds

- [x] **T20. Harden large-dataset performance**
  - **Files**: Modify table/data-loading infrastructure, add performance tests/bench harness
  - **Acceptance**:
    - representative large fixture remains interactive
    - table uses virtualization; no full render of all rows
  - **QA Scenarios**:
    - Scenario: large fixture tab switches remain within acceptable responsiveness
    - Scenario: scrolling stays smooth and memory usage does not spike catastrophically

- [x] **T21. Add loading/empty/error/accessibility polish**
  - **Files**: Modify analysis/admin screens, add tests
  - **Acceptance**:
    - all main views have intentional loading, empty, and failure states
    - keyboard navigation and focus visibility work for primary controls
  - **QA Scenarios**:
    - Scenario: partial data failure isolates broken panel without blanking entire screen
    - Scenario: keyboard-only navigation can reach tabs, pills, tables, and admin actions

- [x] **T22. Complete admin-to-analysis handoff and snapshot hooks**
  - **Files**: Modify admin + analysis routing/state, add tests
  - **Acceptance**:
    - explicit `分析画面で確認` handoff exists
    - snapshot/version hooks are left as clearly marked extension points
  - **QA Scenarios**:
    - Scenario: after import log + warnings, admin can jump into analysis screen without losing context
    - Scenario: snapshot policy remains deferred but non-blocking

---

## Final Verification Wave

- [x] **F1. Plan Compliance Audit — oracle**
  Verify implemented file set, IA, graph/table roles, and deferred-boundary markings against this plan and `docs/prd/prd_fpa_dashboard_master.md`.

  - [x] **F2. Code Quality Review — unspecified-high**
  Run typecheck/build/tests; inspect changed files for over-abstraction, dead code, and scope leakage into deferred comment/review workflow.

  - [x] **F3. Real Scenario QA — unspecified-high**
  Execute representative scenarios with fixture data for 全社/事業部 tab switching, time-axis switching, trend graph behavior, difference graph weak-linking, detail table expansion, and admin handoff.

  - [x] **F4. Scope Fidelity Check — deep**
  Confirm that comment/FPA review UX remains deferred except for shell boundaries and that no AI/export/mobile expansion slipped into implementation.

---

## Commit Strategy

- Wave 1 foundation commits
  - `chore(frontend): scaffold react vite app and test tooling`
  - `chore(gas): add gas build and deploy pipeline`
  - `test(domain): add normalized fixtures and schema specs`
- Wave 2 model layer commits
  - `feat(domain): implement normalization and derived selectors`
  - `feat(shell): add analysis shell and admin skeleton`
- Wave 3 feature commits
  - `feat(analysis): add summary and trend graph`
  - `feat(analysis): add difference graph and detail table`
  - `feat(analysis): compose org tabs and deferred comment pane`
- Wave 4 hardening commits
  - `feat(analysis): wire weak-link interactions and performance safeguards`
  - `feat(admin): add handoff to analysis confirmation flow`

---

## Success Criteria

### Verification Commands
```bash
bun test
bun run build
```

### Final Checklist
- [ ] Core analysis IA matches PRD
- [ ] Summary, graphs, and detail table reconcile on shared fixtures
- [ ] Large fixture remains usable
- [ ] Deferred comment/review areas are clearly bounded
- [ ] Admin flow remains minimal
- [ ] No hidden scope creep into exports, AI, or workflow automation
