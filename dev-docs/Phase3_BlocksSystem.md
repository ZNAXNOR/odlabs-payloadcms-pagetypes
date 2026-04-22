# Phase 3 — Blocks System (HIGHEST RISK)

**Goal:** Implement reactive block filtering in admin UI

**⚠️ Warning:** This phase depends on Payload's internal admin APIs. It has the highest failure risk.

**Recommendation:** Spike this separately first. Test with a minimal implementation before integrating.

---

## Overview

Phase 3 implements `FilteredBlocksField`, a custom admin component that:

1. Reads `pageType` from form state
2. Filters block options reactively
3. Hides disallowed blocks
4. Falls back gracefully if injection fails

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

The issue: Payload doesn't officially export its blocks field component. You must either:

**Option A:** Override the field entirely (risky)
```ts
admin: {
  components: {
    Field: CustomBlocksField
  }
}
```

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

## Step 3.4 — Alternative: Minimal FilteredBlocksField (If Option C doesn't work)

If you prefer a single blocks field with filtering, implement a minimal version:

### `src/admin/FilteredBlocksField.tsx` (Minimal)

```tsx
import React from 'react'
import { useFormFields } from '@payloadcms/ui'

interface Props {
  restrictions?: Array<{ block: string; allowedPageTypes: string[] }>
  pageTypes?: Array<{ slug: string; label: string }>
}

/**
 * Minimal block filter component
 *
 * Renders warning and allowed blocks list
 * Actual blocks field is rendered by Payload normally
 */
export const FilteredBlocksField: React.FC<Props> = ({
  restrictions = [],
  pageTypes = []
}) => {
  const formFields = useFormFields(([fields]) => fields)
  const pageType = formFields?.pageType?.value

  if (!pageType) {
    return null
  }

  // Find which blocks are allowed for this page type
  const allowedBlockSlugs = new Set<string>()

  restrictions.forEach(restriction => {
    if (restriction.allowedPageTypes.includes(pageType)) {
      allowedBlockSlugs.add(restriction.block)
    }
  })

  const pageTypeLabel = pageTypes.find(pt => pt.slug === pageType)?.label || pageType

  return (
    <div
      style={{
        backgroundColor: '#f0f7ff',
        border: '1px solid #b3d9ff',
        borderRadius: '4px',
        padding: '12px',
        marginBottom: '16px',
        fontSize: '13px'
      }}
    >
      <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>
        ℹ️ Allowed blocks for {pageTypeLabel}
      </p>

      {allowedBlockSlugs.size === 0 ? (
        <p style={{ margin: '0', color: '#666' }}>
          All blocks are allowed on this page type.
        </p>
      ) : (
        <p style={{ margin: '0', color: '#666' }}>
          {Array.from(allowedBlockSlugs).join(', ')}
        </p>
      )}

      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>
        Remove any disallowed blocks before saving.
      </p>
    </div>
  )
}
```

---

## Step 3.5 — Wire into Collection

Update `src/enhanceCollection.ts` to include the filter component:

```ts
import { FilteredBlocksField } from './admin/FilteredBlocksField'

export function enhanceCollection(
  collection: CollectionConfig,
  config: PluginConfig
): CollectionConfig {
  // ... existing code ...

  // Add filter info component to layout field
  const layoutFieldIndex = newFields.findIndex(
    f => typeof f === 'object' && 'name' in f && f.name === 'layout'
  )

  if (layoutFieldIndex !== -1) {
    const layoutField = newFields[layoutFieldIndex]

    layoutField.admin = {
      ...layoutField.admin,
      components: {
        ...layoutField.admin?.components,
        // Add filter info before the blocks field
        BeforeField: [
          () => (
            <FilteredBlocksField
              restrictions={config.restrictions}
              pageTypes={config.pageTypes}
            />
          )
        ]
      }
    }
  }

  return {
    ...collection,
    fields: newFields,
    // ... rest
  }
}
```

---

## Step 3.6 — Testing Options

### Test in Dev App

```bash
npm run dev
```

1. Create root page with pageType "Services"
2. Go to blocks field
3. **Option C:** Should show only services-allowed blocks
4. **Option B:** Should show info message about allowed blocks
5. Change pageType to "Legal"
6. Blocks field should update (or show legal-allowed blocks)

### Expected Behavior

| Scenario | Option C | Option B |
|----------|----------|----------|
| Create services root | Hero visible | All blocks shown + info message |
| Add testimonials | ✅ Allowed | ⚠️ Allowed but marked as restricted |
| Add hero to legal | ❌ Hidden | ⚠️ Allowed but marked as restricted, save fails |
| Change type | Blocks refresh | Message updates |

---

## Step 3.7 — Fallback Strategy

If block filtering completely fails:

1. Remove FilteredBlocksField from enhanceCollection
2. Show all blocks
3. Rely on `beforeValidate` hook (server-side validation)
4. Document: "Block filtering unavailable on your Payload version. Using server-side validation only."

### This is OK!

The server-side validation in Phase 1 is authoritative. UI filtering is just a convenience.

---

## Step 3.8 — Decision: Which Approach?

### Use Option C (Per-Type Fields) if:

- You want visual clarity
- Users appreciate explicit separation
- You want maximum compatibility

### Use Option B (Info Component) if:

- You prefer a single blocks field
- You can control Payload version
- You're comfortable with server-side validation fallback

### Abandon blocks filtering if:

- Too much complexity
- Payload version incompatibility
- Server-side validation is sufficient for your use case

---

## Decision Checkpoint

Before continuing to Phase 4, decide:

- [ ] Use per-type blocks fields (Option C) — most reliable
- [ ] Use info component (Option B) — simpler UI
- [ ] Skip blocks UI filtering — rely on server only

---

## Troubleshooting

**"Filtered blocks not showing"**
→ Check that `admin.condition` is correct

**"TypeError: useFormFields is not a function"**
→ Version mismatch. Check Payload UI package version

**"All blocks appear regardless of pageType"**
→ Fallback activated. Review error logs. Server validation still working.

**"Compilation errors in TSX"**
→ Ensure React is imported, check Payload UI type imports

---

## Checklist

- [ ] Decision made on approach (A/B/C)
- [ ] Implementation matches decision
- [ ] Dev app builds without errors
- [ ] Block filtering shows correctly
- [ ] Fallback UI works if filtering fails
- [ ] Save succeeds with valid blocks
- [ ] Save fails with invalid blocks
- [ ] Error messages are clear
- [ ] TypeScript types are correct

---

## Next

→ Phase 4: Admin Widget (health checks + create actions)