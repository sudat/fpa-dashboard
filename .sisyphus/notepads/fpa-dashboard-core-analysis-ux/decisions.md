# Decisions

## 2026-04-13 Plan Init
- Deferred: Comment UX full workflow, FPA review UX, AI analysis, mobile
- Core focus: Analysis IA with summary/graph/table + minimal admin
- All 3 time axes (着地見込/YTD/単月) share same table grammar
- Weak-link interactions only (no auto-navigation)
- GAS build: @gas-plugin/unplugin for Vite integration

## 2026-04-13 F4 Scope Audit
- Scope fidelity verdict: APPROVE
- Treat `CommentPaneShell` as the only allowed v1 comment surface; any future form/input/API addition there would be a scope violation
- Treat the `detail-table.tsx` jsdom fallback as test-only; production virtualization via `useVirtualizer` must remain intact
