# Phase 5 — Nested Docs & Slug Integration

**Goal:** Integrate official Payload CMS features for hierarchy and slug handling

**Status:** Phase 1–4 must be complete before starting Phase 5

---

## Overview

Phase 5 integrates two official Payload features:

1. `@payloadcms/plugin-nested-docs` → hierarchy + parent management
2. Payload slug system (`slugField` or equivalent) → URL handling

This plugin **does not replace** these systems. It composes on top of them.

---

## Core Principle

| Responsibility     | Owner               |
| ------------------ | ------------------- |
| Parent hierarchy   | nested-docs plugin  |
| Breadcrumbs / URLs | nested-docs plugin  |
| Slug generation    | Payload slug system |
| Page type rules    | page-types plugin   |
| Root enforcement   | page-types plugin   |

---

## Dependencies

### Required peer dependencies

```json
{
  "peerDependencies": {
    "payload": ">=3.0.0",
    "@payloadcms/plugin-nested-docs": ">=1.0.0"
  }
}
```

### Important

* Plugin must work even if nested-docs is not installed
* When installed → enhanced behavior
* When absent → fallback to manual parent handling

---

## Step 5.1 — Install Nested Docs Plugin

```bash
npm install @payloadcms/plugin-nested-docs
```

---

## Step 5.2 — Register Plugins (ORDER CRITICAL)

```ts
plugins: [
  nestedDocsPlugin({
    collections: ['pages']
  }),

  pageTypesPlugin({
    collectionSlug: 'pages',
    pageTypes: [
      { slug: 'services', label: 'Services', required: true },
      { slug: 'legal', label: 'Legal' }
    ]
  })
]
```

### Rule

* nested-docs MUST run before page-types
* page-types depends on `parent` field being available

---

## Step 5.3 — Parent Field Ownership

### With nested-docs

* `parent` field is auto-created
* Plugin must NOT redefine or override it

### Without nested-docs

* Plugin must NOT inject parent field automatically
* User is responsible for defining hierarchy

---

## Step 5.4 — Slug System Integration (Flexible Mode)

Payload slug behavior is preserved and extended.

### Default behavior

* Slug generated from title (or configured field)
* Editable in admin

### Plugin behavior (Root Pages Only)

For root pages (`parent == null`):

```ts
expectedSlug = pageType.slug
```

---

## Step 5.5 — Validation Rules (Flexible Mode)

### Root Pages

* Slug SHOULD match pageType slug
* If mismatch:

  * Allow save
  * Emit validation warning (non-blocking OR blocking based on config)

Example:

```
Expected: services
Actual: services-landing
→ Allowed, but flagged
```

### Optional strict mode (future)

```ts
enforceRootSlug: true
```

* If enabled → mismatch throws error
* If disabled → mismatch allowed

---

## Step 5.6 — Hook Implementation

Slug logic must be implemented via hooks.

### Hook placement

* `beforeValidate` or `beforeChange`
* Must run AFTER slugField logic

### Logic

```ts
if (!data.parent) {
  const expected = data.pageType

  if (data.slug !== expected) {
    // flexible mode → allow but track
  }
}
```

### Important

* NEVER override slug automatically in flexible mode
* ONLY validate

---

## Step 5.7 — Admin UX Behavior

### Root Pages

* Slug field visible
* Editable
* Validation feedback shown if mismatch

### Child Pages

* Normal slug behavior
* No page-type influence

---

## Step 5.8 — Nested Docs Interaction

### URL Generation

Nested docs may generate URLs like:

```
/services/web-design
```

This depends on:

```ts
generateURL: (docs) => docs.map(d => d.slug).join('/')
```

### Implication

* Root slug affects entire subtree URLs
* Slug mismatch can propagate to URLs

---

## Step 5.9 — Reparenting Behavior

When parent changes:

* nested-docs updates breadcrumbs
* page-types recomputes pageType
* slug remains unchanged (unless manually edited)

---

## Step 5.10 — Compatibility Rules

Plugin MUST:

* Not override nested-docs fields
* Not assume breadcrumb structure
* Not depend on URL format
* Not modify slugField internals
* Only use hooks for validation

---

## Step 5.11 — Failure Scenarios

### Missing nested-docs

* parent may not exist
* plugin must still work (limited hierarchy)

### Slug mismatch

* Allowed in flexible mode
* Highlighted in dashboard widget (Phase 4)

---

## Step 5.12 — Integration Checklist

* [ ] nested-docs installed (optional)
* [ ] Plugin order correct
* [ ] parent field detected
* [ ] slug field present
* [ ] root slug validation works
* [ ] child slug unaffected
* [ ] no conflicts with nested-docs

---

## Summary

| Area         | Behavior                   |
| ------------ | -------------------------- |
| Hierarchy    | Managed by nested-docs     |
| Slug (root)  | Validated against pageType |
| Slug (child) | Default Payload behavior   |
| Enforcement  | Flexible (non-blocking)    |
| Integration  | Non-invasive               |

---
