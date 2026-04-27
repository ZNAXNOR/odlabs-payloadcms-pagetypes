# Phase 4 — Dashboard Widget (Final Implementation Spec)

**Goal:** Implement a production-ready Page Types Health widget using Payload's modular dashboard API with zero-config styling and progressive disclosure.

**Status:** Phase 1–3 required

---

## Core Constraints

* Plugin must be **zero-config** for consumers
* No Tailwind dependency
* No global CSS injection
* Fully self-contained styling
* Compatible with all Payload admin themes

---

## Styling Decision (Final)

| Option        | Status        | Reason                         |
| ------------- | ------------- | ------------------------------ |
| Tailwind      | ❌ Rejected    | Requires consumer build config |
| shadcn        | ❌ Not default | Depends on Tailwind            |
| Inline styles | ⚠️ Fallback   | Verbose                        |
| CSS Modules   | ✅ Selected    | Scoped, clean, zero-config     |

---

## Widget Registration (Correct API)

Use Payload modular dashboard:

```ts
admin: {
  dashboard: {
    widgets: [
      {
        slug: 'page-types-health',
        Component: '@od-labs/payload-pagetypes/src/admin/widgets/PageTypesHealth#default',
        minWidth: 'small',
        maxWidth: 'full'
      }
    ]
  }
}
```

---

## Step 4.1 — Widget Behavior Design

### Priority System

**Critical (High Priority)**

* PageType defined in config but **root not created**

**Warning (Low Priority)**

* Root exists but **slug mismatch with config**

---

## Step 4.2 — Progressive Disclosure (Widget Sizes)

Payload widgets support 4 sizes. Behavior adapts per size.

### Small

* Title + status badge
* Issue count only
* Example: "⚠️ 2 issues"
* Button: "View Details"

---

### Medium

* Title + badge
* Show **top 2 issues**

  * Prefer critical
  * Fallback to warnings
* Button: "View Details"

---

### Large

* Title + badge
* Show **all critical issues**
* Warnings collapsed under "Show more"
* Button: "View Details"

---

### Full

* Title + badge
* All critical issues
* All warnings expanded
* Stats row
* Button: "View Details"

---

## Step 4.3 — UI Sections

### 1. Header

* Title: Page Types Health
* Status badge:

  * ✅ Healthy
  * ⚠️ Issues

---

### 2. Critical Issues (Always First)

Example:

* ❌ Services — root not created
* ❌ Blog — root not created

Rules:

* Always visible
* Sorted by config order

---

### 3. Warnings

Example:

* ⚠️ Services — expected "services", found "services-landing"

Rules:

* Hidden (small/medium)
* Collapsible (large)
* Always visible (full)

---

### 4. Healthy State

Displayed when no issues:

* "All page types are correctly configured"

---

### 5. Stats Row (Large/Full only)

* Total Types
* Roots Found
* Health %

---

## Step 4.4 — Modal: View Details

### Behavior

* Always available (all sizes)
* Opens modal overlay

### Content

Shows **ALL page types**

Each row includes:

* Status icon
* Label
* Slug
* Status message

### Status Types

* ✅ Healthy
* ❌ Missing root
* ⚠️ Slug mismatch

---

## Step 4.5 — Icons (Lucide)

* Success: CheckCircle2
* Warning: AlertTriangle
* Error: XCircle
* Action: List

---

## Step 4.6 — Component Structure

```tsx
<PageTypesHealth>
  <Header />
  <CriticalList />
  <WarningList />
  <Stats />
  <ViewDetailsButton />
  <Modal />
</PageTypesHealth>
```

---

## Step 4.7 — Data Processing (Server)

Use Payload Local API:

```ts
const result = await payload.find({
  collection: collectionSlug,
  where: { parent: { exists: false } },
  depth: 0
})
```

Processing:

* Group roots by `pageType`
* Detect missing types
* Detect slug mismatches
* Compute health %

---

## Step 4.8 — CSS Modules

### File Structure

```
src/admin/widgets/
  PageTypesHealth.tsx
  PageTypesHealth.module.css
```

### Rules

* No global selectors
* No Tailwind
* No dependency on consumer styles

---

## Step 4.9 — Plugin Integration

```ts
export interface PluginOptions {
  enableDashboardWidget?: boolean
}
```

Disable support:

```ts
if (pluginConfig.enableDashboardWidget === false) {
  return config
}
```

---

## Step 4.10 — Expected Behavior

| Scenario      | Output                         |
| ------------- | ------------------------------ |
| All valid     | Green badge + success message  |
| Missing roots | Critical list                  |
| Slug mismatch | Warning list                   |
| Mixed         | Critical first, warnings below |
| Any state     | "View Details" always visible  |

---

## Step 4.11 — UX Rules

* Max 2 issues in medium
* Never overwhelm small widgets
* Critical always above warnings
* Messages must be one-line
* Avoid technical wording

---

## Step 4.12 — Optional (Future)

* Click row → open filtered Pages view
* Auto-create missing roots
* Inline fix actions

---

## Summary

| Area     | Decision                  |
| -------- | ------------------------- |
| API      | `admin.dashboard.widgets` |
| Styling  | CSS Modules               |
| Tailwind | Not used                  |
| shadcn   | Optional only             |
| Layout   | Progressive disclosure    |
| Modal    | Shows all page types      |
| Priority | Critical + Warning        |

---

## Result

* Fully Payload-native widget
* Zero-config installation
* No CSS conflicts
* Clean, modern UI
* Scalable for future enhancements
