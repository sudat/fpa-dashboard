# Task 3: Radius Usage Inventory

> Generated: 2026-04-13 | Scope: entire `src/` directory | READ-ONLY audit

---

## 1. Token-Level Radius (CSS Custom Properties)

**File:** `src/index.css`

| Line | Token | Value | Derivation |
|------|-------|-------|------------|
| L42 | `--radius-sm` | `calc(var(--radius) * 0.6)` | 0.375rem (= 6px) |
| L43 | `--radius-md` | `calc(var(--radius) * 0.8)` | 0.5rem (= 8px) |
| L44 | `--radius-lg` | `var(--radius)` | 0.625rem (= 10px) |
| L45 | `--radius-xl` | `calc(var(--radius) * 1.4)` | 0.875rem (= 14px) |
| L46 | `--radius-2xl` | `calc(var(--radius) * 1.8)` | 1.125rem (= 18px) |
| L47 | `--radius-3xl` | `calc(var(--radius) * 2.2)` | 1.375rem (= 22px) |
| L48 | `--radius-4xl` | `calc(var(--radius) * 2.6)` | 1.625rem (= 26px) |
| L75 | **`--radius`** | **`0.625rem`** | **ROOT CAUSE** — should be 0 |

**Classification:** TOKEN-DRIVEN (single root variable, all others derive from it)
**Action:** RESET — change `--radius: 0.625rem` → `--radius: 0px` (T13)

---

## 2. Hardcoded Rounded Utilities in `src/components/ui/`

### 2.1 button.tsx

| Line | Class | Context | Classification | Action |
|------|-------|---------|----------------|--------|
| L7 | `rounded-lg` | Base button class | HARDCODED | RESET → `rounded-none` |
| L25 | `rounded-[min(var(--radius-md),10px)]` | `xs` size variant | TOKEN-DRIVEN (clamped) | RESET (token → 0) |
| L25 | `in-data-[slot=button-group]:rounded-lg` | `xs` in button-group | HARDCODED | RESET → `rounded-none` |
| L26 | `rounded-[min(var(--radius-md),12px)]` | `sm` size variant | TOKEN-DRIVEN (clamped) | RESET (token → 0) |
| L26 | `in-data-[slot=button-group]:rounded-lg` | `sm` in button-group | HARDCODED | RESET → `rounded-none` |
| L30 | `rounded-[min(var(--radius-md),10px)]` | Icon `xs` variant | TOKEN-DRIVEN (clamped) | RESET (token → 0) |
| L30 | `in-data-[slot=button-group]:rounded-lg` | Icon `xs` in button-group | HARDCODED | RESET → `rounded-none` |
| L32 | `rounded-[min(var(--radius-md),12px)]` | Icon `sm` variant | TOKEN-DRIVEN (clamped) | RESET (token → 0) |
| L32 | `in-data-[slot=button-group]:rounded-lg` | Icon `sm` in button-group | HARDCODED | RESET → `rounded-none` |

### 2.2 badge.tsx

| Line | Class | Context | Classification | Action |
|------|-------|---------|----------------|--------|
| L8 | `rounded-4xl` | Base badge class | HARDCODED | RESET → `rounded-none` |

### 2.3 card.tsx

| Line | Class | Context | Classification | Action |
|------|-------|---------|----------------|--------|
| L15 | `rounded-xl` | Card root | HARDCODED | RESET → `rounded-none` |
| L15 | `*:[img:first-child]:rounded-t-xl` | Image top rounding | HARDCODED | RESET → `rounded-none` |
| L15 | `*:[img:last-child]:rounded-b-xl` | Image bottom rounding | HARDCODED | RESET → `rounded-none` |
| L28 | `rounded-t-xl` | CardHeader | HARDCODED | RESET → `rounded-none` |
| L87 | `rounded-b-xl` | CardFooter | HARDCODED | RESET → `rounded-none` |

### 2.4 chart.tsx

| Line | Class | Context | Classification | Action |
|------|-------|---------|----------------|--------|
| L194 | `rounded-lg` | ChartLegend container | HARDCODED | RESET → `rounded-none` |
| L225 | `rounded-[2px]` | ChartLegend item swatch | HARDCODED (micro) | RESET → `rounded-none` |
| L316 | `rounded-[2px]` | ChartTooltip indicator dot | HARDCODED (micro) | RESET → `rounded-none` |

### 2.5 tabs.tsx

| Line | Class | Context | Classification | Action |
|------|-------|---------|----------------|--------|
| L25 | `rounded-lg` | TabsList base | HARDCODED | RESET → `rounded-none` |
| L25 | `data-[variant=line]:rounded-none` | TabsList line variant | Already 0 | OK (no change) |
| L59 | `rounded-md` | TabsTrigger | HARDCODED | RESET → `rounded-none` |

### 2.6 tooltip.tsx

| Line | Class | Context | Classification | Action |
|------|-------|---------|----------------|--------|
| L51 | `rounded-md` | Tooltip content | HARDCODED | RESET → `rounded-none` |
| L51 | `**:data-[slot=kbd]:rounded-sm` | Kbd inside tooltip | HARDCODED (micro) | RESET → `rounded-none` |
| L57 | `rounded-[2px]` | TooltipArrow | HARDCODED (micro) | RESET → `rounded-none` |

### 2.7 scroll-area.tsx

| Line | Class | Context | Classification | Action |
|------|-------|---------|----------------|--------|
| L20 | `rounded-[inherit]` | ScrollArea viewport | TOKEN-DRIVEN (inherits parent) | RESET (inherits → 0) |
| L48 | `rounded-full` | ScrollArea thumb (scrollbar) | HARDCODED (circle) | **EXCEPTION** — scrollbar thumbs should remain pill-shaped |

---

## 3. Hardcoded Rounded Utilities in `src/features/`

### 3.1 layout/components/time-axis-pills.tsx

| Line | Class | Context | Classification | Action |
|------|-------|---------|----------------|--------|
| L22 | `rounded-full` | Time axis pill (TabsTrigger override) | HARDCODED (pill) | **EXCEPTION** — pill shape is intentional design, must remain `rounded-full` |

### 3.2 layout/components/visual-preview.tsx

| Line | Class | Context | Classification | Action |
|------|-------|---------|----------------|--------|
| L158 | `rounded-lg` | Preview card container | HARDCODED | RESET → `rounded-none` |
| L161 | `rounded` (bare) | Preview progress bar positive | HARDCODED | RESET → `rounded-none` |
| L163 | `rounded-lg` | Preview card container | HARDCODED | RESET → `rounded-none` |
| L166 | `rounded` (bare) | Preview progress bar negative | HARDCODED | RESET → `rounded-none` |
| L168 | `rounded-lg` | Preview card container | HARDCODED | RESET → `rounded-none` |
| L171 | `rounded` (bare) | Preview progress bar neutral | HARDCODED | RESET → `rounded-none` |

### 3.3 admin/components/master-diff-warning.tsx

| Line | Class | Context | Classification | Action |
|------|-------|---------|----------------|--------|
| L37 | `rounded-lg` | Diff warning alert container | HARDCODED | RESET → `rounded-none` |

### 3.4 analysis/components/difference/difference-panel.tsx

| Line | Class | Context | Classification | Action |
|------|-------|---------|----------------|--------|
| L33 | `rounded-sm` | Legend indicator dot | HARDCODED (micro) | RESET → `rounded-none` |
| L40 | `rounded-sm` | Legend indicator dot | HARDCODED (micro) | RESET → `rounded-none` |

### 3.5 analysis/components/shared/analysis-fallback.tsx

| Line | Class | Context | Classification | Action |
|------|-------|---------|----------------|--------|
| L52 | `rounded-md` | Fallback badge/pill | HARDCODED | RESET → `rounded-none` |

---

## 4. Representative Surface Target List (must be 0px)

| Surface | UI Component | Current Radius | Token/Hardcoded |
|---------|-------------|----------------|-----------------|
| **Button** | `button.tsx` | `rounded-lg` + `rounded-[min(--radius-md,Npx)]` | Both |
| **Badge** | `badge.tsx` | `rounded-4xl` | Hardcoded |
| **Card** | `card.tsx` | `rounded-xl` (root, header, footer, images) | Hardcoded |
| **Tabs (list)** | `tabs.tsx` | `rounded-lg` | Hardcoded |
| **Tabs (trigger)** | `tabs.tsx` | `rounded-md` | Hardcoded |
| **Tooltip** | `tooltip.tsx` | `rounded-md` | Hardcoded |
| **Tooltip (arrow)** | `tooltip.tsx` | `rounded-[2px]` | Hardcoded |
| **Tooltip (kbd)** | `tooltip.tsx` | `rounded-sm` | Hardcoded |
| **Chart (legend)** | `chart.tsx` | `rounded-lg` | Hardcoded |
| **Chart (swatch)** | `chart.tsx` | `rounded-[2px]` | Hardcoded |
| **Chart (tooltip dot)** | `chart.tsx` | `rounded-[2px]` | Hardcoded |
| **ScrollArea (viewport)** | `scroll-area.tsx` | `rounded-[inherit]` | Token-driven |
| **Visual Preview** | `visual-preview.tsx` | `rounded-lg` / `rounded` | Hardcoded |
| **Diff Warning** | `master-diff-warning.tsx` | `rounded-lg` | Hardcoded |
| **Legend Dots** | `difference-panel.tsx` | `rounded-sm` | Hardcoded |
| **Fallback Badge** | `analysis-fallback.tsx` | `rounded-md` | Hardcoded |
| **All CSS-driven** | `--radius` token | 0.625rem (10px) | Token |

---

## 5. Explicit Exceptions (may keep rounding)

| File | Line | Class | Surface | Justification |
|------|------|-------|---------|---------------|
| `scroll-area.tsx` | L48 | `rounded-full` | ScrollArea thumb (scrollbar) | Scrollbar thumbs are universally pill-shaped; zero-radius would look broken |
| `time-axis-pills.tsx` | L22 | `rounded-full` | Time axis pills (tab triggers) | Pill shape is intentional design element for time period selectors |

---

## 6. Summary Statistics

| Metric | Count |
|--------|-------|
| CSS custom property tokens | 8 (1 root + 7 derived) |
| UI component files with rounded | 7 |
| Feature files with rounded | 5 |
| Total `rounded-*` instances | 29 |
| Token-driven (reset via T13) | 5 |
| Hardcoded (reset via T14) | 22 |
| Explicit exceptions | 2 |
| Inline `borderRadius` / `border-radius` | 0 |

---

## 7. Action Plan Reference

- **T13 (token reset):** Change `src/index.css` L75: `--radius: 0.625rem` → `--radius: 0px`
  - This automatically zeroes all `--radius-sm/md/lg/xl/2xl/3xl/4xl`
  - Also zeroes the 5 `rounded-[min(var(--radius-md),Npx)]` in button.tsx

- **T14 (hardcoded cleanup):** Replace the 22 hardcoded `rounded-*` classes listed above with `rounded-none`
  - 7 files, 22 instances total (excluding 2 exceptions)
