# Phase 5 — Nested Docs Integration

**Goal:** Integrate `@payloadcms/plugin-nested-docs` for automatic parent field management

**Status:** Phase 1-4 must be complete before starting Phase 5

**Note:** This phase is optional. You can manage the `parent` field manually if preferred.

---

## Overview

The nested docs plugin:

1. Adds `parent` field automatically
2. Maintains hierarchy breadcrumbs
3. Provides UI for parent selection
4. Handles reparenting validation

Your page types plugin works on top of this.

---

## Why Use Nested Docs?

### Without nested docs:

You must manually add parent field:

```ts
{
  name: 'parent',
  type: 'relationship',
  relationTo: 'pages'
}
```

### With nested docs:

Everything is automatic:
- Parent field added
- Breadcrumb UI
- Hierarchy traversal helpers
- Admin UI improvements

---

## Step 5.1 — Install Nested Docs Plugin

```bash
npm install @payloadcms/plugin-nested-docs
```

Verify installation:

```bash
npm list @payloadcms/plugin-nested-docs
```

Should show: `@payloadcms/plugin-nested-docs@1.x.x`

---

## Step 5.2 — Update Dev Payload Config

Wire nested docs plugin before page types plugin.

### Update `dev/payload.config.ts`:

```ts
import { buildConfig } from 'payload'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { pageTypesPlugin } from '../src'
import { Pages } from './collections/Pages'

export default buildConfig({
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(__dirname)
    }
  },

  collections: [Pages],

  db: mongooseAdapter({
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/payload-pagetypes'
  }),

  secret: process.env.PAYLOAD_SECRET || 'dev-secret-key',

  plugins: [
    // 1. Nested docs first (adds parent field)
    nestedDocsPlugin({
      collections: ['pages'],
      generateURL: (docs) => {
        // Generate breadcrumb from parent chain
        return docs.map((doc) => doc.slug).join('/')
      }
    }),

    // 2. Page types plugin (enforces structure on top)
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

**Important:** Nested docs plugin must be registered **before** page types plugin.

---

## Step 5.3 — Remove Manual Parent Field (if exists)

If you manually added parent field to Pages collection, remove it:

### Update `dev/collections/Pages.ts`:

```ts
export const Pages: CollectionConfig = {
  slug: 'pages',
  access: { /* ... */ },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true
    },
    // REMOVE this if it exists:
    // {
    //   name: 'parent',
    //   type: 'relationship',
    //   relationTo: 'pages'
    // },

    // pageType field added by plugin
    // parent field added by nested docs plugin

    {
      name: 'layout',
      type: 'blocks',
      blocks: [/* ... */]
    }
  ]
}
```

---

## Step 5.4 — Verify Nested Docs Field Addition

Start dev app:

```bash
npm run dev
```

Go to Pages collection:

1. Open any page
2. Should see new fields added by nested docs:
   - **Parent** — Select parent page
   - **Breadcrumbs** — Shows hierarchy path (e.g., "Services > Service Details")
3. Fields added by page types plugin:
   - **Page Type** — Select page type (root only)

### Expected field order:

```
Title
Slug
Page Type (hidden if has parent)
Parent (from nested docs)
Breadcrumbs (from nested docs) - read-only
Layout
```

---

## Step 5.5 — Test Nested Docs Behavior

### Test Flow 1: Create hierarchy with parent selection UI

1. Create root: "Services Root"
   - Title: "Services"
   - Slug: "services"
   - Parent: (empty)
   - Page Type: "Services"
2. Create child via parent UI:
   - Title: "Web Design"
   - Slug: "web-design"
   - Parent: Select "Services Root"
3. ✅ Breadcrumb should show: "Services > Web Design"

### Test Flow 2: Reparenting

1. Edit "Web Design"
2. Change Parent to different root
3. Save
4. ✅ Breadcrumb should update

### Test Flow 3: Hierarchy in list view

1. Go to Pages list
2. Should show breadcrumb in list items
3. ✅ Visual hierarchy apparent

### Test Flow 4: Nested docs URL generation

Check database:

```bash
mongosh
db.pages.findOne({ slug: 'web-design' })
```

Should show field added by nested docs (may vary by version):

```json
{
  slug: "web-design",
  breadcrumbs: [
    { label: "Services", url: "services" },
    { label: "Web Design", url: "services/web-design" }
  ]
}
```

---

## Step 5.6 — Verify Page Types Plugin Still Works

### Test Flow 1: pageType inheritance with nested docs

1. Create root: "Legal Root" (pageType: "Legal")
2. Create child of Legal Root
3. ✅ pageType should be inherited to "Legal"
4. Try to add restricted block (hero)
5. ❌ Should fail: "not allowed on Legal pages"

### Test Flow 2: Root validation with nested docs

1. Try to create another root with pageType "Services"
2. ❌ Should fail: "Root page already exists"

### Test Flow 3: Delete protection with nested docs

1. Create root with children
2. Try to delete root
3. ❌ Should fail: "has children"
4. Delete children first
5. ✅ Root deletion succeeds

---

## Step 5.7 — Nested Docs Configuration Options

### Full configuration:

```ts
nestedDocsPlugin({
  // Collections to enable nested docs on
  collections: ['pages', 'blog'],

  // Generate URL/breadcrumb path
  generateURL: (docs) => {
    return docs.map(doc => doc.slug).join('/')
  },

  // Field name for parent (default: 'parent')
  parentFieldName: 'parent',

  // Field name for breadcrumbs (default: 'breadcrumbs')
  breadcrumbsFieldName: 'breadcrumbs',

  // Override breadcrumb label
  generateBreadcrumb: (doc) => ({
    label: doc.title,
    url: doc.slug
  })
})
```

### For page types plugin:

Keep defaults. The plugin expects:
- Field name: `parent`
- Data structure: standard parent reference

---

## Step 5.8 — Integration Checklist

- [ ] Nested docs plugin installed
- [ ] Plugin registered in Payload config (before page types)
- [ ] Dev app starts without errors
- [ ] Parent field appears in admin UI
- [ ] Breadcrumbs display correctly
- [ ] Parent selection works
- [ ] Reparenting works
- [ ] Page types inheritance still works
- [ ] Block validation still works
- [ ] Delete protection still works
- [ ] Nested docs fields in database

---

## Troubleshooting

**"parent field doesn't appear"**
→ Verify nested docs plugin is registered before page types plugin in Payload config

**"Breadcrumbs not showing"**
→ Check nested docs config. Breadcrumb field name may differ by version.

**"Parent selection broken after adding page types"**
→ Ensure page types plugin doesn't override parent field. Check `enhanceCollection.ts` doesn't remove parent field.

**"Can't reparent pages"**
→ Verify nested docs permissions allow parent relationship

**"Build fails with nested docs types"**
→ Install types: `npm install --save-dev @payloadcms/plugin-nested-docs`

---

## What Nested Docs Handles

✅ Parent field creation
✅ Breadcrumb generation
✅ URL path generation
✅ Admin UI for parent selection
✅ Hierarchy traversal

---

## What Page Types Plugin Handles (On Top)

✅ Root page validation
✅ Duplicate root prevention
✅ pageType inheritance
✅ Block restrictions
✅ Delete protection

---

## Integration Points

### Data Flow

```
User selects parent in UI
  ↓ (nested docs)
Parent field saved
  ↓ (beforeValidate hook)
Page types plugin computes pageType from parent chain
  ↓
Blocks validated against pageType
  ↓
Document saved
```

### Database State

```json
{
  "id": "page-123",
  "title": "Service Details",
  "slug": "service-detail",
  "parent": "root-456",           // Set by nested docs UI
  "pageType": "services",         // Computed by page types plugin
  "breadcrumbs": [                // Generated by nested docs
    { "label": "Services", "url": "services" },
    { "label": "Service Details", "url": "services/service-detail" }
  ],
  "layout": [...]                 // Validated by page types plugin
}
```

---

## Manual Setup (Without Nested Docs)

If you prefer not to use nested docs plugin, manually add parent field:

### In `dev/collections/Pages.ts`:

```ts
{
  name: 'parent',
  type: 'relationship',
  relationTo: 'pages',
  admin: {
    condition: (data) => {
      // Only allow parent assignment on non-root pages
      // Or allow on all and let page types plugin validate
      return true
    }
  }
}
```

This works fine. You just lose the breadcrumb UI and helper utilities.

---

## Next

→ Phase 6: Packaging & Publishing