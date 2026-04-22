# Phase 2 — Collection Enhancement

**Goal:** Wire validation hooks into Pages collection and add pageType field

**Status:** Phase 1 core logic must be working before starting Phase 2

---

## Overview

Phase 2 enhances the Pages collection by:

1. Adding the `pageType` field
2. Injecting validation hooks
3. Creating plugin entry point
4. Testing integration

After this phase, the plugin works end-to-end (blocks field override comes later).

---

## Step 2.1 — Implement `enhanceCollection.ts`

This function modifies the Pages collection to inject plugin logic.

### Create file: `src/enhanceCollection.ts`

```ts
import { CollectionConfig } from 'payload'
import { createBeforeValidateHook, createBeforeDeleteHook } from './hooks'
import { PluginConfig } from './types'

export function enhanceCollection(
  collection: CollectionConfig,
  config: PluginConfig
): CollectionConfig {
  const { pageTypes, enforceRootSlug } = config

  // ─────────────────────────────────────────────────────────────
  // 1. ADD pageType FIELD
  // ─────────────────────────────────────────────────────────────

  const pageTypeField = {
    name: 'pageType',
    type: 'select',
    label: 'Page Type',
    options: pageTypes.map(pt => ({
      label: pt.label,
      value: pt.slug
    })),
    required: false,
    admin: {
      // Only show for root pages (no parent)
      condition: (_, siblingData) => {
        return siblingData?.parent == null
      },
      description: 'Choose the page type (root pages only). Child pages inherit from their root.'
    }
  }

  // Insert after 'slug' field for good UX
  const existingFields = collection.fields || []
  const slugFieldIndex = existingFields.findIndex(
    f => typeof f === 'object' && 'name' in f && f.name === 'slug'
  )

  let newFields = [...existingFields]
  if (slugFieldIndex !== -1) {
    newFields.splice(slugFieldIndex + 1, 0, pageTypeField)
  } else {
    newFields.push(pageTypeField)
  }

  // ─────────────────────────────────────────────────────────────
  // 2. INJECT HOOKS
  // ─────────────────────────────────────────────────────────────

  const beforeValidateHook = createBeforeValidateHook(config)
  const beforeDeleteHook = createBeforeDeleteHook(config)

  const existingBeforeValidate = collection.hooks?.beforeValidate || []
  const existingBeforeDelete = collection.hooks?.beforeDelete || []

  // Ensure beforeValidate is an array
  const beforeValidateArray = Array.isArray(existingBeforeValidate)
    ? existingBeforeValidate
    : [existingBeforeValidate]

  const beforeDeleteArray = Array.isArray(existingBeforeDelete)
    ? existingBeforeDelete
    : [existingBeforeDelete]

  // ─────────────────────────────────────────────────────────────
  // 3. RETURN ENHANCED COLLECTION
  // ─────────────────────────────────────────────────────────────

  return {
    ...collection,
    fields: newFields,
    hooks: {
      ...collection.hooks,
      beforeValidate: [...beforeValidateArray, beforeValidateHook],
      beforeDelete: [...beforeDeleteArray, beforeDeleteHook]
    }
  }
}
```

### Why this approach?

- **Field insertion**: Adds `pageType` after slug for logical UI flow
- **Conditional field**: Hidden for child pages, shown for roots
- **Safe hook wiring**: Preserves existing hooks and adds new ones
- **Non-destructive**: Doesn't modify the original collection config

---

## Step 2.2 — Create Plugin Entry Point

This is the main export that users import and use.

### Update `src/index.ts`:

```ts
import { Config } from 'payload'
import { enhanceCollection } from './enhanceCollection'
import { PluginConfig, PluginOptions } from './types'

/**
 * Payload Page Types Plugin
 *
 * Enforces structured page types with hierarchical consistency
 * and block-level restrictions.
 *
 * Usage:
 *
 * ```ts
 * import { pageTypesPlugin } from '@od-labs/payload-pagetypes'
 *
 * export default buildConfig({
 *   collections: [Pages],
 *   plugins: [
 *     pageTypesPlugin({
 *       collectionSlug: 'pages',
 *       pageTypes: [
 *         { slug: 'services', label: 'Services', required: true },
 *         { slug: 'legal', label: 'Legal', required: false }
 *       ],
 *       restrictions: [
 *         { block: 'hero', allowedPageTypes: ['services'] }
 *       ],
 *       enforceRootSlug: true
 *     })
 *   ]
 * })
 * ```
 */

export const pageTypesPlugin =
  (pluginConfig: PluginConfig) =>
  (config: Config): Config => {
    // Validate config before processing
    validatePluginConfig(pluginConfig)

    return {
      ...config,
      collections: (config.collections || []).map(collection => {
        // Only enhance the target collection
        if (collection.slug === pluginConfig.collectionSlug) {
          return enhanceCollection(collection, pluginConfig)
        }
        return collection
      })
    }
  }

/**
 * Validate plugin configuration at startup
 */
function validatePluginConfig(config: PluginConfig): void {
  if (!config.collectionSlug) {
    throw new Error('pageTypesPlugin: collectionSlug is required')
  }

  if (!Array.isArray(config.pageTypes) || config.pageTypes.length === 0) {
    throw new Error('pageTypesPlugin: pageTypes array must not be empty')
  }

  // Check for duplicate pageType slugs
  const slugs = config.pageTypes.map(pt => pt.slug)
  const duplicates = slugs.filter((slug, idx) => slugs.indexOf(slug) !== idx)

  if (duplicates.length > 0) {
    throw new Error(
      `pageTypesPlugin: Duplicate pageType slugs found: ${duplicates.join(', ')}`
    )
  }

  // Check for invalid restrictions
  const validSlugs = new Set(slugs)
  const validBlockNames = new Set()

  if (Array.isArray(config.restrictions)) {
    config.restrictions.forEach(restriction => {
      restriction.allowedPageTypes.forEach(slug => {
        if (!validSlugs.has(slug)) {
          throw new Error(
            `pageTypesPlugin: Restriction references invalid pageType "${slug}". ` +
            `Valid types: ${Array.from(validSlugs).join(', ')}`
          )
        }
      })
    })
  }
}

// Re-export types for convenience
export type { PluginConfig, PluginOptions } from './types'
export { resolveRootPageType } from './resolveRootPageType'
```

---

## Step 2.3 — Wire into Dev App

Now test the plugin end-to-end by wiring it into the dev Payload config.

### Update `dev/payload.config.ts`:

```ts
import path from 'path'
import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { slateEditor } from '@payloadcms/richtext-slate'
import { pageTypesPlugin } from '../src'
import { Pages } from './collections/Pages'

export default buildConfig({
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(__dirname)
    }
  },
  editor: slateEditor({}),
  collections: [Pages],
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/payload-pagetypes'
  }),
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-key',
  plugins: [
    pageTypesPlugin({
      collectionSlug: 'pages',
      pageTypes: [
        { slug: 'services', label: 'Services', required: true },
        { slug: 'legal', label: 'Legal', required: false },
        { slug: 'blog', label: 'Blog', required: false }
      ],
      restrictions: [
        { block: 'hero', allowedPageTypes: ['services'] },
        { block: 'testimonials', allowedPageTypes: ['services'] }
      ],
      enforceRootSlug: true
    })
  ]
})
```

---

## Step 2.4 — Test in Dev App

Start the dev environment:

```bash
npm run dev
```

### Test Flow A: Root page creation

1. Go to Pages collection
2. **Create → Services Root**
   - Title: "Services"
   - Slug: "services"
   - Parent: (empty)
   - Page Type: **"Services"** (should be visible)
3. Save
4. ✅ Should succeed

**Verify:**
- pageType field is visible (parent is empty)
- No validation errors
- Slug matches pageType

### Test Flow B: Duplicate root prevention

1. Try to create another root with pageType "Services"
2. Save
3. ❌ Should fail: "Root page already exists for Services"

### Test Flow C: Child page creation

1. **Create → Service Detail**
   - Title: "Service Detail"
   - Slug: "service-detail"
   - Parent: "Services Root"
   - Page Type: (should be hidden/disabled)
2. Open form
3. ✅ pageType field should be hidden (parent is set)
4. Save
5. ✅ Should succeed
6. Re-open page
7. ✅ pageType should be "Services" (inherited)

### Test Flow D: Block validation on root

1. Open "Services Root"
2. Add blocks:
   - Hero block ✅ (allowed on services)
   - Testimonials block ✅ (allowed on services)
3. Save
4. ✅ Should succeed

### Test Flow E: Block validation on different type

1. Create "Legal Root" with pageType "Legal"
2. Try to add Hero block (restricted to services)
3. Save
4. ❌ Should fail: "not allowed on Legal pages"

### Test Flow F: Reparenting

1. Create chain: Root A → B → C
2. Open C, change parent to Root A (C now directly under A)
3. Save
4. ✅ Should succeed
5. Re-open C
6. ✅ pageType should still be "Services"

### Test Flow G: Delete protection

1. Try to delete "Services Root"
2. ❌ Should fail: "Cannot delete required root"
3. Create "Contact Root" (not required)
4. Try to delete it
5. ❌ Should fail: "has children" (if it has any)
6. Delete its children first
7. ✅ Now delete should succeed

---

## Step 2.5 — Inspect Database

Check that pageType is being saved correctly:

```bash
# Connect to MongoDB
mongosh

# Check services root
db.pages.findOne({ slug: 'services' })
# Should show: { slug: 'services', pageType: 'services', parent: null, ... }

# Check child
db.pages.findOne({ slug: 'service-detail' })
# Should show: { slug: 'service-detail', pageType: 'services', parent: ObjectId(...), ... }
```

---

## Step 2.6 — Error Handling Check

Trigger various error cases and verify messages are clear:

### Missing pageType on root

1. Create root without pageType
2. Try to save
3. ❌ Error: "Root pages must define a pageType..."

### Invalid block

1. Create page with restricted block
2. Try to save
3. ❌ Error: "not allowed on X pages..."

### Broken parent chain

1. Manually break the parent relationship in DB (delete parent page)
2. Try to edit child
3. ❌ Error: "Parent page not found..."

---

## Step 2.7 — Build and Verify Types

```bash
npm run build
```

Should produce:

```
dist/
├── index.js
├── index.d.ts
├── enhanceCollection.js
├── hooks.js
├── resolveRootPageType.js
└── types.d.ts
```

Verify types are correct:

```bash
cat dist/index.d.ts | head -30
```

Should show:

```ts
export const pageTypesPlugin: (pluginConfig: PluginConfig) => (config: Config) => Config
export type { PluginConfig, PluginOptions }
```

---

## Troubleshooting

**"pageTypeField is not visible in form"**
→ Check `admin.condition` logic in `enhanceCollection.ts`

**"Hooks not running"**
→ Verify hooks are injected in correct order: existing → new

**"Field appears after other fields"**
→ Adjust `splice` index in `enhanceCollection.ts`

**"pageType not saved to database"**
→ Check that beforeValidate hook is actually setting `data.pageType`

**"Build fails with type errors"**
→ Ensure all types are properly imported and exported

---

## Checklist

- [ ] `enhanceCollection.ts` created
- [ ] Plugin entry point (`index.ts`) implemented
- [ ] Config validation added
- [ ] Dev app starts without errors
- [ ] pageType field visible on root pages
- [ ] pageType field hidden on child pages
- [ ] Validation hooks fire correctly
- [ ] Root creation works
- [ ] Child creation works
- [ ] pageType inherited correctly
- [ ] Block validation works
- [ ] Duplicate root prevention works
- [ ] Delete protection works
- [ ] All error messages are clear
- [ ] Build completes without errors
- [ ] Types are exported correctly

---

## Phase 2 Complete! 🎉

The core plugin now works end-to-end:

✅ Pages have types
✅ Hierarchy is enforced
✅ Blocks are validated
✅ Database stores everything correctly

**What's next:**
- Phase 3: Blocks field override (risky)
- Phase 4: Admin widget
- Phase 5: Nested docs integration

---

## Next

→ Phase 3: Blocks System (block filtering UI)