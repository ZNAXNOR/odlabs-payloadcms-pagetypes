# Phase 3 — Blocks System (HIGHEST RISK)

**Goal:** Implement reactive block filtering in admin UI

**⚠️ Warning:** This phase depends on Payload's internal admin APIs. It has the highest failure risk.

**Recommendation:** Spike this separately first. Test with a minimal implementation before integrating.

---

Phase 3 implements `FilteredBlocksField`, a custom admin component that:

1. Reads `pageType` from form state
2. Filters block options reactively
3. Hides disallowed blocks
4. Falls back gracefully if injection fails

Blocks declare their own `allowedPageTypes` in component config. The plugin automatically extracts these and enforces them. UI filtering is optional (server-side validation is always authoritative).

---

## Key Decision Point

### Success Criteria

Block filtering works smoothly and user can:
- See only allowed blocks
- See blocks update when pageType changes
- Save without issues

### Fallback Option

If this proves incompatible with your Payload version:
- Show all blocks in UI
- Show warning about allowed blocks
- Enforce on server only
- Document as limitation

---

## Step 3.1 — Spike First (DO NOT INTEGRATE YET)

Create a standalone test component before integrating into the plugin.

### Create: `src/admin/FilteredBlocksField.tsx` (Spike)

```tsx
import React, { useState, useEffect } from 'react'
import { useFormFields, useField } from '@payloadcms/ui'
import { BlocksField } from '@payloadcms/plugin-nested-docs'

interface FilteredBlocksFieldProps {
  allBlocks: any[] // All available blocks from config
  restrictions: any[] // Block restrictions from plugin config
  pageTypes: any[] // Page types from config
}

/**
 * This is a SPIKE implementation.
 * Test this component in isolation before integrating.
 */
export const FilteredBlocksField: React.FC<FilteredBlocksFieldProps> = ({
  allBlocks,
  restrictions,
  pageTypes
}) => {
  const [allowedBlocks, setAllowedBlocks] = useState(allBlocks)
  const [pageType, setPageType] = useState<string | null>(null)
  const [filterFailed, setFilterFailed] = useState(false)

  // Read pageType from form state
  const formFields = useFormFields(([fields]) => fields)

  useEffect(() => {
    try {
      const currentPageType = formFields?.pageType?.value

      if (!currentPageType) {
        // No pageType selected, show all blocks
        setAllowedBlocks(allBlocks)
        setPageType(null)
        return
      }

      setPageType(currentPageType)

      // Filter blocks based on restrictions
      const filtered = allBlocks.filter(block => {
        const restriction = restrictions?.find(r => r.block === block.slug)

        // No restriction = allowed everywhere
        if (!restriction) return true

        // Has restriction: check if pageType is in allowed list
        return restriction.allowedPageTypes.includes(currentPageType)
      })

      setAllowedBlocks(filtered)
      setFilterFailed(false)
    } catch (err) {
      console.error('Block filtering failed:', err)
      setFilterFailed(true)
      // Fallback: show all blocks
      setAllowedBlocks(allBlocks)
    }
  }, [formFields?.pageType?.value, allBlocks, restrictions])

  // Fallback UI if filtering failed
  if (filterFailed) {
    return (
      <div
        style={{
          border: '1px solid #ff9500',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '16px',
          backgroundColor: '#fff9f0'
        }}
      >
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#cc6600' }}>
          ⚠️ Block filtering unavailable
        </p>
        <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
          All blocks are shown. Server validation will enforce restrictions.
        </p>
        {pageType && (
          <p style={{ margin: '0', fontSize: '13px', color: '#666' }}>
            <strong>Allowed blocks for "{pageType}":</strong>{' '}
            {getAllowedBlockNames(pageType).join(', ')}
          </p>
        )}
      </div>
    )
  }

  // Normal rendering with filtered blocks
  return (
    <div>
      {pageType && (
        <div style={{ marginBottom: '12px', fontSize: '13px', color: '#666' }}>
          Showing blocks allowed for{' '}
          <strong>
            {pageTypes.find(pt => pt.slug === pageType)?.label || pageType}
          </strong>
        </div>
      )}

      {/* Render the actual blocks field with filtered options */}
      {/* Note: Implementation depends on your Payload version */}
      {/* This is a placeholder — actual rendering handled below */}
    </div>
  )

  function getAllowedBlockNames(currentPageType: string): string[] {
    const allowed = allBlocks
      .filter(block => {
        const restriction = restrictions?.find(r => r.block === block.slug)
        if (!restriction) return true
        return restriction.allowedPageTypes.includes(currentPageType)
      })
      .map(b => b.label || b.slug)

    return allowed.length > 0 ? allowed : ['(no blocks allowed)']
  }
}
```

### Test the spike

1. Add this to `/src/admin/test-filtered-blocks.tsx`
2. Render it in isolation
3. Verify:
   - Block list updates when pageType changes
   - No console errors
   - Fallback UI appears if error occurs

---

## Step 3.2 — Understand Block Injection Challenge

The issue used to be: How to override a blocks field?

New approach: Blocks self-declare restrictions. No override needed. Plugin reads `allowedPageTypes` from block config.

**Option B:** Wrap the default field (safer)
```ts
// Let Payload render blocks normally, but control via admin.condition
admin: {
  condition: (data) => {
    // Return true to show, false to hide
  }
}
```

**Option C:** Multiple blocks fields (most reliable)
```ts
// Create separate blocks fields for each page type
{
  name: 'layout_services',
  type: 'blocks',
  blocks: [/* hero, testimonials */],
  admin: {
    condition: (data) => data.pageType === 'services'
  }
},
{
  name: 'layout_legal',
  type: 'blocks',
  blocks: [/* legal-notice */],
  admin: {
    condition: (data) => data.pageType === 'legal'
  }
}
```

---

## Step 3.3 — Recommended Approach: Option C (Most Reliable)

Instead of trying to override the blocks field, create separate fields per page type.

### Update `src/enhanceCollection.ts`:

```ts
/**
 * Create separate blocks fields for each page type
 * Each field shows only allowed blocks
 */
function createBlocksFieldsForPageTypes(
  existingBlocksField: any,
  config: PluginConfig
): any[] {
  const { pageTypes, restrictions } = config

  return pageTypes.map(pageType => {
    // Filter blocks allowed for this page type
    const allowedBlocks = existingBlocksField.blocks?.filter(block => {
      const restriction = restrictions?.find(r => r.block === block.slug)

      // No restriction = allowed
      if (!restriction) return true

      // Has restriction: check if this page type is allowed
      return restriction.allowedPageTypes.includes(pageType.slug)
    }) || existingBlocksField.blocks

    return {
      ...existingBlocksField,
      name: 'layout',
      type: 'blocks',
      blocks: allowedBlocks,
      admin: {
        ...existingBlocksField.admin,
        condition: (data) => {
          // Show this version only for this page type
          return data.pageType === pageType.slug
        }
      }
    }
  })
}
```

Update `enhanceCollection` to use per-type blocks fields:

```ts
export function enhanceCollection(
  collection: CollectionConfig,
  config: PluginConfig
): CollectionConfig {
  const fields = collection.fields || []

  // Find existing layout/blocks field
  const layoutFieldIndex = fields.findIndex(
    f => typeof f === 'object' && 'name' in f && f.name === 'layout'
  )

  let newFields = [...fields]

  if (layoutFieldIndex !== -1) {
    const existingLayoutField = fields[layoutFieldIndex]

    // Replace single blocks field with per-type blocks fields
    const perTypeFields = createBlocksFieldsForPageTypes(
      existingLayoutField,
      config
    )

    newFields.splice(layoutFieldIndex, 1, ...perTypeFields)
  }

  // ... rest of enhancement
  return {
    ...collection,
    fields: newFields,
    hooks: { /* ... */ }
  }
}
```

### Pros

✅ Simple and reliable
✅ No internal API dependencies
✅ Works across Payload versions
✅ Filtering is explicit and clear
✅ Easy to debug

### Cons

- Slightly more verbose in UI (multiple field sections)
- Each type sees its own blocks field
- User must understand the separation

---

## Step 3.4 — Simpler UI Filtering

Since blocks now declare `allowedPageTypes` directly, UI filtering becomes much simpler.

**Option: Show allowed blocks list based on pageType**
(purely informational, server validation is authoritative)

### Example Implementation

```tsx
'use client'
import React from 'react'
import { useFormFields } from '@payloadcms/ui'

export const FilteredBlocksInfo = ({ restrictions, pageTypes }) => {
  const pageType = useFormFields(([fields]) => fields.pageType?.value)
  if (!pageType) return null

  const allowedBlocks = restrictions
    .filter(r => r.allowedPageTypes.includes(pageType))
    .map(r => r.block)

  return (
    <div className="blocks-info">
      Allowed blocks for {pageType}: {allowedBlocks.join(', ')}
    </div>
  )
}
```

---

## Step 3.5 — Testing

1. Create a page with a specific pageType.
2. Verify that only blocks allowed for that type are available (if using UI filtering) or that saving with restricted blocks fails (server validation).

---

## Checklist

- [x] Blocks declare `allowedPageTypes`
- [x] Plugin extracts restrictions automatically
- [x] UI filtering implemented (optional)
- [x] Server-side validation enforces restrictions

---

## Next

→ Phase 4: Admin Widget (health checks + create actions)