# Payload Page Types Plugin

A Payload CMS v3 plugin that enforces structured page types, hierarchical consistency, and block-level restrictions.

## Features

* **Page Type System**
  Define strict root-level page types (e.g., `services`, `legal`) with automatic inheritance for all descendants.

* **Block Restrictions**
  Restrict specific blocks to specific page types (e.g., `hero` only allowed on `services`).

* **Hierarchy Enforcement**
  * Exactly one root per page type
  * Prevent circular parent relationships
  * Protect required roots from deletion

* **Server-Side Validation (Source of Truth)**
  All rules enforced in `beforeValidate` and `beforeDelete` hooks.

* **Admin Block Filtering (Progressive Enhancement)**
  UI filters available blocks dynamically based on page type (with safe fallback).

* **Structure Health Widget**
  Detects missing or duplicate root pages with quick actions.

## Installation

### Local Development

```bash
mkdir -p plugins/page-types
cp -r /path/to/plugin/files plugins/page-types/
```

Structure:

```
plugins/page-types/
  ├── index.ts
  ├── enhanceCollection.ts
  ├── resolveRootPageType.ts
  ├── hooks.ts
  └── admin/
      ├── FilteredBlocksField.tsx
      └── Widget.tsx
```

---

## Usage

Register the plugin in your Payload config:

```ts
import { pageTypesPlugin } from './plugins/page-types'

export default buildConfig({
  collections: [Pages],
  plugins: [
    pageTypesPlugin({
      collectionSlug: 'pages',
      pageTypes: [
        { slug: 'services', label: 'Services', required: true },
        { slug: 'legal', label: 'Legal', required: true }
      ],
      enforceRootSlug: true
      // Note: restrictions auto-extracted from block configs
    })
  ]
})
```

## Configuration

```ts
type PageType = {
  slug: string
  label: string
  required?: boolean
}

type BlockRestriction = {
  block: string
  allowedPageTypes: string[]
}

type PluginConfig = {
  collectionSlug: string
  pageTypes: PageType[]
  enforceRootSlug?: boolean
}

### Block-level Restrictions

Blocks declare their own `allowedPageTypes` in their config:

```ts
{
  slug: 'hero',
  label: 'Hero',
  allowedPageTypes: ['services'],  // ← Block declares it
  fields: [...]
}
```

The plugin automatically extracts and enforces these restrictions.
```

## Behavior

### Root Pages

* Must define `pageType`
* Must be unique per type (one root per type)
* Slug must match `pageType` (if enabled)
* Cannot be deleted if:
  * marked `required`
  * has children

### Child Pages

* `pageType` is **never user-editable**
* Always resolved from **root ancestor**
* Safe across deep nesting and corrupted intermediate nodes

### Block Restrictions

* Blocks declare their own page type restrictions
* Blocks without restrictions are allowed everywhere

### Validation Behavior

* Validation runs on **every save**
* Applies to both root and child pages

### Changing Page Type (Important)

When changing a root page's `pageType`:

1. All existing blocks are revalidated
2. Any invalid blocks cause save to fail

👉 **User must manually remove or replace invalid blocks before saving**

## Admin UI

### Block Filtering

The `FilteredBlocksField`:

* Reactively filters available blocks based on `pageType`
* Updates live when pageType changes
* Uses `useFormFields` to read state

### Fallback Behavior (Important)

If block field override fails (Payload version mismatch):

* All blocks are shown
* A warning is displayed listing allowed blocks
* Server still enforces restrictions

👉 This ensures **correctness over UX**

### UX Note

If invalid blocks exist:

* They remain visible
* Save will fail with clear error
* User must remove invalid blocks manually

## Admin Widget

### What it does

* Detects missing root pages
* Detects duplicate roots
* Provides quick actions

### Create Root Page

Uses API call (authenticated):

```ts
await fetch(`/api/${collectionSlug}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Payload usually uses cookies, but support token if needed:
    Authorization: `JWT ${token}`
  },
  body: JSON.stringify({
    title: pageTypeCfg.label,
    slug: pageTypeCfg.slug,
    pageType: pageTypeCfg.slug
  })
})
```

## Development

### File Overview

| File | Purpose |
|------|---------|
| `index.ts` | Plugin entry point |
| `enhanceCollection.ts` | Injects field, hooks, admin overrides |
| `resolveRootPageType.ts` | Resolves root safely (cycle + corruption safe) |
| `hooks.ts` | Core validation + deletion logic |
| `FilteredBlocksField.tsx` | Admin block filtering |
| `Widget.tsx` | Structure health widget |

### Implementation Order

1. `hooks.ts` — Implement validation logic
2. Add `pageType` field in `enhanceCollection.ts`
3. ⚠️ **Blocks field override** — Highest risk; test against exact Payload v3 version
4. Integrate `@payloadcms/plugin-nested-docs` for parent relationships
5. `admin/Widget.tsx` — Health checks and create actions

## Core Logic

### Root Resolution

* Walks parent chain to root
* Detects circular references
* Handles missing/deleted nodes explicitly
* Root is always authoritative

### Validation Guarantees

* No duplicate roots
* No invalid block configurations
* No broken hierarchies
* No silent data corruption

## Migration Guide

### ⚠️ Important

Do NOT enable plugin enforcement before preparing your data.

### Recommended Migration Steps

1. **Deploy plugin (inactive usage)**
2. Create required root pages via admin UI
3. Assign parents to existing pages
4. Ensure hierarchy is valid
5. Enable full usage

### Notes

* Existing orphan pages must be manually attached
* Root pages define structure going forward

## Limitations

* Requires Payload v3+
* Uses SQLite (not MongoDB)
* Block restrictions auto-extracted from block configs
* Single collection support (MVP scope)

## Known Considerations

* Duplicate root validation handles create vs update safely
* Root resolution differentiates:
  * missing parent
  * corrupted root
* Block filtering may degrade gracefully depending on admin API support
* Authentication for widget depends on Payload setup (cookie vs JWT)

## Testing

### Must Test

* Deep nesting (3+ levels)
* Reparenting pages
* Changing root pageType after content exists
* Block restriction enforcement
* Circular parent rejection
* Root deletion protection

## Package

**Current Status:** Local plugin
**Planned Package:**

```bash
@od-labs/payload-pagetypes
```

## Summary

This plugin introduces a **strict content governance layer**:

* Structure is enforced
* Behavior is deterministic
* UI is enhanced but not trusted
* Server is always authoritative