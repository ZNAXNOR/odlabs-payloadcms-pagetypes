# Phase 3 — Blocks System (Native Filtering)

**Goal:** Implement block-level restrictions and automatic UI filtering using Payload's native `filterOptions`

**Status:** Phase 1-2 must be complete. Phase 3 is optional but recommended for better UX.

---

## Architecture: Block-Level Declarations

This phase uses **Payload's native `filterOptions` API** on the blocks field. Blocks declare their own page type restrictions, and the plugin automatically enforces them.

### Data Flow

```
1. Define blocks with allowedPageTypes
   ↓
2. Plugin boots, extracts allowedPageTypes from blocks
   ↓
3. Plugin creates filterOptions function
   ↓
4. Payload uses filterOptions to dynamically filter blocks in admin UI
   ↓
5. User can only add blocks allowed for current pageType
   ↓
6. beforeValidate hook validates on save (server authoritative)
```

---

## Why This Works (Stability)

**Uses only Payload's official, documented APIs:**

- ✅ Block `allowedPageTypes` property (custom, your plugin extends blocks)
- ✅ Blocks field `filterOptions` (officially documented in Payload v3)
- ✅ `beforeValidate` hooks (official Payload lifecycle)
- ✅ No internal component injection
- ✅ No form state interception
- ✅ No custom React components

Payload's filterOptions on blocks field allows you to provide a function that returns which block slugs should be available based on context. It's re-evaluated as part of the form state request whenever document data changes. If a block is present but no longer allowed, a validation error occurs when saving.

This is **core Payload functionality**, not an internal API.

---

## Step 3.1 — Declare Restrictions in Block Configs

Blocks declare which page types they're allowed on.

### Example: Hero Block

```ts
// src/blocks/Hero.ts
import { Block } from 'payload'

export const HeroBlock: Block = {
  slug: 'hero',
  label: 'Hero',

  // NEW: Declare which page types this block is allowed on
  allowedPageTypes: ['services'],

  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'subtitle',
      type: 'text',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
  ],
}
```

### Example: Testimonials Block

```ts
// src/blocks/Testimonials.ts
export const TestimonialsBlock: Block = {
  slug: 'testimonials',
  label: 'Testimonials',

  // Allowed on multiple types
  allowedPageTypes: ['services', 'blog'],

  fields: [
    {
      name: 'testimonials',
      type: 'array',
      fields: [
        { name: 'quote', type: 'text' },
        { name: 'author', type: 'text' },
      ],
    },
  ],
}
```

### Example: Legal Notice Block

```ts
// src/blocks/LegalNotice.ts
export const LegalNoticeBlock: Block = {
  slug: 'legal-notice',
  label: 'Legal Notice',

  // Only on legal pages
  allowedPageTypes: ['legal'],

  fields: [
    {
      name: 'notice',
      type: 'richtext',
    },
  ],
}
```

### Example: Global Block (No Restriction)

```ts
// src/blocks/Spacer.ts
export const SpacerBlock: Block = {
  slug: 'spacer',
  label: 'Spacer',

  // No allowedPageTypes = allowed everywhere
  // (Omit the property entirely)

  fields: [
    {
      name: 'height',
      type: 'number',
    },
  ],
}
```

---

## Step 3.2 — Update Pages Collection (Single Layout Field)

The Pages collection has **one** `layout` field with **all** blocks.

```ts
// dev/collections/Pages.ts
import { CollectionConfig } from 'payload'
import { HeroBlock } from '../blocks/Hero'
import { TestimonialsBlock } from '../blocks/Testimonials'
import { LegalNoticeBlock } from '../blocks/LegalNotice'
import { SpacerBlock } from '../blocks/Spacer'

export const Pages: CollectionConfig = {
  slug: 'pages',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    // pageType field added by plugin
    // parent field added by nested docs plugin

    // SINGLE layout field with ALL blocks
    {
      name: 'layout',
      type: 'blocks',
      blocks: [
        HeroBlock,
        TestimonialsBlock,
        LegalNoticeBlock,
        SpacerBlock,
        // Add more blocks here...
      ],
      // filterOptions will be added by plugin
    },
  ],
}
```

---

## Step 3.3 — Plugin Extracts and Injects filterOptions

The plugin reads `allowedPageTypes` from blocks and sets up `filterOptions`.

### Update `src/enhanceCollection.ts`

```ts
import { CollectionConfig } from 'payload'
import { PluginConfig } from './types'

export function enhanceCollection(
  collection: CollectionConfig,
  config: PluginConfig,
): CollectionConfig {
  const fields = collection.fields || []

  // ... existing pageType field and hook injection ...

  // NEW: Inject filterOptions into blocks field
  const layoutFieldIndex = fields.findIndex(
    (f) => typeof f === 'object' && 'name' in f && f.name === 'layout',
  )

  if (layoutFieldIndex !== -1) {
    const layoutField = fields[layoutFieldIndex] as any

    // Extract allowed blocks from their config
    const blockRestrictionsMap = new Map<string, string[]>()

    layoutField.blocks?.forEach((block: any) => {
      if (block.allowedPageTypes) {
        blockRestrictionsMap.set(block.slug, block.allowedPageTypes)
      }
    })

    // Set filterOptions on the blocks field
    layoutField.filterOptions = ({ siblingData }: any) => {
      const pageType = siblingData?.pageType

      // If no pageType selected (root without type), show all blocks
      if (!pageType) {
        return true
      }

      // Filter blocks: return only slugs allowed for this pageType
      const allowedBlockSlugs: string[] = []

      layoutField.blocks?.forEach((block: any) => {
        const allowedTypes = blockRestrictionsMap.get(block.slug)

        // No restriction = allowed everywhere
        if (!allowedTypes) {
          allowedBlockSlugs.push(block.slug)
        }
        // Has restriction: check if current pageType is in allowed list
        else if (allowedTypes.includes(pageType)) {
          allowedBlockSlugs.push(block.slug)
        }
      })

      return allowedBlockSlugs
    }

    // Also extract restrictions for server-side validation
    const restrictions = Array.from(blockRestrictionsMap.entries()).map(
      ([block, allowedPageTypes]) => ({
        block,
        allowedPageTypes,
      }),
    )

    // Update config to include extracted restrictions
    const enhancedConfig = {
      ...config,
      restrictions,
    }

    // Use enhancedConfig for hooks (already done in earlier phases)
  }

  return {
    ...collection,
    fields,
    hooks: {
      // ... existing hooks ...
    },
  }
}
```

---

## Step 3.4 — Server-Side Validation (Unchanged)

The `beforeValidate` hook still validates on save (already from Phase 1):

```ts
// In beforeValidate hook (from Phase 1)
if (data.layout && Array.isArray(data.layout)) {
  const invalidBlocks = data.layout.filter((block) => {
    const restriction = config.restrictions?.find((r) => r.block === block.blockType)
    if (!restriction) return false // No restriction = allowed
    return !restriction.allowedPageTypes.includes(data.pageType)
  })

  if (invalidBlocks.length > 0) {
    throw new Error(
      `Invalid blocks for "${data.pageType}": ${invalidBlocks.map((b) => b.blockType).join(', ')}`,
    )
  }
}
```

This runs on every save. Even if UI filtering failed, server validation prevents invalid data.

---

## Step 3.5 — Test in Dev App

```bash
npm run dev
```

### Test Flow 1: Block Filtering Works

1. Create page with `pageType: "services"`
2. Go to layout field
3. **Only HeroBlock, TestimonialsBlock, SpacerBlock appear** (LegalNoticeBlock is hidden)
4. Try to add Hero block ✅ It's in the list
5. Change pageType to "legal"
6. **Layout field updates:** Now only LegalNoticeBlock and SpacerBlock appear
7. Try to add Hero block ❌ It's no longer in the list

### Test Flow 2: Server Validation (Fallback)

1. (Advanced) Somehow bypass UI and add forbidden block directly
2. Click save
3. ❌ Server validation rejects: "Hero not allowed on legal pages"

### Test Flow 3: Unrestricted Blocks

1. Create any page type
2. SpacerBlock appears everywhere (no restriction)
3. ✅ Can add to any page type

---

## How It Works: Technical Breakdown

### Boot Time (Plugin Init)

```ts
// Plugin sees this:
HeroBlock = {
  slug: 'hero',
  allowedPageTypes: ['services'],
  fields: [...]
}

// Plugin extracts to restrictions:
restrictions = [
  { block: 'hero', allowedPageTypes: ['services'] }
]

// Plugin sets filterOptions:
filterOptions = ({ siblingData }) => {
  if (siblingData.pageType === 'services') {
    return ['hero', 'testimonials', 'spacer']  // Hero allowed
  }
  if (siblingData.pageType === 'legal') {
    return ['legal-notice', 'spacer']  // Hero NOT allowed
  }
}
```

### Admin UI (Form Load)

```
1. User views page form with pageType = "services"
2. Payload calls: filterOptions({ siblingData: { pageType: 'services' } })
3. Gets: ['hero', 'testimonials', 'spacer']
4. Displays only these blocks in "Add Block" button
5. User changes pageType to "legal"
6. Payload re-calls filterOptions
7. Gets: ['legal-notice', 'spacer']
8. UI updates, Hero and Testimonials now hidden
```

### Save Time (Server Validation)

```
1. User tries to save with invalid blocks
2. beforeValidate hook runs
3. Checks: block 'hero' in restrictions?
   - Yes. Is 'legal' in allowedPageTypes?
   - No. Invalid.
4. Throws error: "Hero not allowed on legal pages"
5. Save fails, user sees error
```

---

## Frontend: Just Use `page.layout`

No merge logic needed. Single `layout` field:

```ts
// Fetch page
const page = await fetch(`/api/pages/${pageId}`)

// Use layout directly
page.layout.forEach((block) => renderBlock(block))
```

Compare to per-type fields approach (would be):

```ts
// Would need to merge multiple fields:
const layout = [
  ...(page.layout_services || []),
  ...(page.layout_legal || []),
  ...(page.layout_blog || []),
]
```

**Much simpler with single layout field.**

---

## Why Block-Level Declarations Are Better

| Aspect               | Per-Type Fields                | Block-Level Declarations |
| -------------------- | ------------------------------ | ------------------------ |
| Single layout field? | ❌ Multiple fields             | ✅ Yes                   |
| Add new page type    | ❌ Add new field to schema     | ✅ Just use in config    |
| Scale to 10 types    | ⚠️ 10 separate fields          | ✅ Still one field       |
| Block declares needs | ❌ Implicit in field lists     | ✅ Explicit in block     |
| Unique block names?  | ❌ Required (naming conflicts) | ✅ Not required          |
| Frontend complexity  | ⚠️ Merge logic                 | ✅ Direct `page.layout`  |
| DRY principle        | ❌ Restrictions duplicated     | ✅ Single source         |
| Payload API used     | Condition (stable)             | filterOptions (stable)   |

---

## Payload API Stability

Both approaches use **only stable, documented Payload APIs:**

- ✅ Block config properties (you can extend blocks)
- ✅ `filterOptions` on blocks field (official Payload v3 feature)
- ✅ `beforeValidate` hooks (core Payload lifecycle)
- ✅ Server validation via hooks (standard pattern)

**No internal APIs. No custom components. No form state hacking.**

---

## Error Messages

When user tries to save with invalid blocks:

```
Error: Invalid blocks for "Legal": hero, testimonials

Allowed blocks for Legal pages: legal-notice, spacer

Please remove the highlighted blocks and try again.
```

Clear, actionable, specific.

---

## Implementation Checklist

- [x] Blocks declare `allowedPageTypes` in their config
- [x] All blocks defined with appropriate restrictions
- [x] Pages collection has single `layout` field with all blocks
- [x] Plugin extracts `allowedPageTypes` from blocks at boot
- [x] Plugin sets `filterOptions` on blocks field
- [x] Plugin extracts restrictions for server-side validation
- [x] Dev app builds without errors
- [x] Block filtering shows correctly in admin UI
- [x] Changing pageType updates filtered blocks live
- [x] Save fails with clear error when user adds restricted block
- [x] Frontend works with single `page.layout` field (no merge needed)

---

## What This Phase Does NOT Include

❌ Per-type block fields
❌ Custom React components
❌ Form state interception
❌ Payload internal API dependencies
❌ Fallback modes
❌ Component injection

Just: **Native Payload `filterOptions` + block declarations.**

---

## Summary

**Architecture:**

1. Blocks declare `allowedPageTypes` (where restriction lives)
2. Plugin extracts these at boot (single source of truth)
3. Plugin sets `filterOptions` on blocks field (Payload native)
4. UI filters dynamically (Payload handles it)
5. Server validates on save (authoritative, catches edge cases)
6. Frontend gets single `layout` array (simple to render)

**Benefits:**

- ✅ Stable (only Payload documented APIs)
- ✅ Scalable (N page types, 1 layout field)
- ✅ DRY (restriction declared once in block config)
- ✅ Simple (no custom code, native filtering)
- ✅ Maintainable (block and restriction together)

---

## Next

→ Phase 4: Admin Widget (health checks + create actions)
