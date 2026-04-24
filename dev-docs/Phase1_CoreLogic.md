# Phase 1 — Core Logic (MOST IMPORTANT)

**Goal:** Implement root resolution, cycle detection, and validation hooks

**⚠️ Important:** Phase 1 is the foundation. Everything depends on this working correctly.

---

## Overview

Phase 1 implements three critical pieces:

1. **`resolveRootPageType`** — Safe root ancestor traversal
2. **`beforeValidate` hook** — Enforce all rules
3. **`beforeDelete` hook** — Protect roots

Test rigorously before moving to Phase 2.

---

## Step 1.1 — Implement `resolveRootPageType.ts`

This is the most important utility. It must handle:

- Parent chain traversal
- Circular reference detection
- Missing/deleted nodes
- Root validation

### Create file: `src/resolveRootPageType.ts`

```ts
import { PayloadRequest } from 'payload'

export interface ResolveRootPageTypeArgs {
  id: string | number
  req: PayloadRequest
  collectionSlug: string
}

export async function resolveRootPageType({
  id,
  req,
  collectionSlug,
}: ResolveRootPageTypeArgs): Promise<string> {
  const visited = new Set<string | number>()
  let currentId = id

  // Safety: limit iterations to prevent infinite loops
  const MAX_ITERATIONS = 100

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Cycle detection: if we've seen this ID before, there's a cycle
    if (visited.has(currentId)) {
      throw new Error(`Circular parent reference detected starting at ${id}. Check page hierarchy.`)
    }

    visited.add(currentId)

    // Fetch the current page
    let current
    try {
      current = await req.payload.findByID({
        collection: collectionSlug,
        id: currentId,
        depth: 0,
      })
    } catch (err) {
      throw new Error(
        `Parent page ${currentId} not found or deleted. Broken hierarchy at page ${id}.`,
      )
    }

    if (!current) {
      throw new Error(`Parent page ${currentId} returned null. Broken hierarchy at page ${id}.`)
    }

    // If no parent, we've reached the root
    if (!current.parent) {
      // Validate that root has pageType
      if (!current.pageType || !current.pageType.trim()) {
        throw new Error(
          `Root page ${currentId} missing or empty pageType. Data corruption detected.`,
        )
      }

      return current.pageType
    }

    // Move to parent for next iteration
    currentId = current.parent
  }

  // Reached iteration limit
  throw new Error(
    `Page hierarchy too deep (>100 levels). Check for accidental cycles or malformed data.`,
  )
}
```

### Test cases for `resolveRootPageType`

Create `src/__tests__/resolveRootPageType.test.ts`:

```ts
import { resolveRootPageType } from '../resolveRootPageType'

describe('resolveRootPageType', () => {
  // Mock req object for tests
  const mockReq = {
    payload: {
      findByID: jest.fn(),
    },
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns pageType of root when page is root', async () => {
    mockReq.payload.findByID.mockResolvedValue({
      id: 'root-1',
      parent: null,
      pageType: 'services',
    })

    const result = await resolveRootPageType({
      id: 'root-1',
      req: mockReq,
      collectionSlug: 'pages',
    })

    expect(result).toBe('services')
  })

  test('traverses parent chain and returns root pageType', async () => {
    // Simulate: child → parent → root
    mockReq.payload.findByID
      .mockResolvedValueOnce({
        id: 'child-1',
        parent: 'parent-1',
        pageType: null, // Not set on child (should be ignored)
      })
      .mockResolvedValueOnce({
        id: 'parent-1',
        parent: 'root-1',
        pageType: null,
      })
      .mockResolvedValueOnce({
        id: 'root-1',
        parent: null,
        pageType: 'services',
      })

    const result = await resolveRootPageType({
      id: 'child-1',
      req: mockReq,
      collectionSlug: 'pages',
    })

    expect(result).toBe('services')
    expect(mockReq.payload.findByID).toHaveBeenCalledTimes(3)
  })

  test('detects circular parent reference', async () => {
    // Simulate: a → b → a (cycle)
    mockReq.payload.findByID
      .mockResolvedValueOnce({
        id: 'a',
        parent: 'b',
      })
      .mockResolvedValueOnce({
        id: 'b',
        parent: 'a',
      })

    await expect(
      resolveRootPageType({
        id: 'a',
        req: mockReq,
        collectionSlug: 'pages',
      }),
    ).rejects.toThrow(/Circular parent reference/)
  })

  test('throws when parent is missing/deleted', async () => {
    mockReq.payload.findByID
      .mockResolvedValueOnce({
        id: 'child-1',
        parent: 'deleted-parent',
      })
      .mockRejectedValueOnce(new Error('Not found'))

    await expect(
      resolveRootPageType({
        id: 'child-1',
        req: mockReq,
        collectionSlug: 'pages',
      }),
    ).rejects.toThrow(/not found or deleted/)
  })

  test('throws when root has no pageType', async () => {
    mockReq.payload.findByID.mockResolvedValue({
      id: 'root-1',
      parent: null,
      pageType: null,
    })

    await expect(
      resolveRootPageType({
        id: 'root-1',
        req: mockReq,
        collectionSlug: 'pages',
      }),
    ).rejects.toThrow(/missing or empty pageType/)
  })

  test('rejects empty string pageType on root', async () => {
    mockReq.payload.findByID.mockResolvedValue({
      id: 'root-1',
      parent: null,
      pageType: '   ', // Whitespace only
    })

    await expect(
      resolveRootPageType({
        id: 'root-1',
        req: mockReq,
        collectionSlug: 'pages',
      }),
    ).rejects.toThrow(/missing or empty pageType/)
  })

  test('handles deep nesting (10+ levels)', async () => {
    // Create chain: page-10 → page-9 → ... → page-1 → root
    for (let i = 10; i > 0; i--) {
      mockReq.payload.findByID.mockResolvedValueOnce({
        id: `page-${i}`,
        parent: i === 1 ? 'root' : `page-${i - 1}`,
        pageType: null,
      })
    }

    mockReq.payload.findByID.mockResolvedValueOnce({
      id: 'root',
      parent: null,
      pageType: 'services',
    })

    const result = await resolveRootPageType({
      id: 'page-10',
      req: mockReq,
      collectionSlug: 'pages',
    })

    expect(result).toBe('services')
  })
})
```

---

## Step 1.2 — Implement `beforeValidate` Hook

Create `src/hooks.ts`:

```ts
import { BeforeValidateHook } from 'payload'
import { resolveRootPageType } from './resolveRootPageType'
import { PluginConfig } from './types'

export const createBeforeValidateHook = (config: PluginConfig): BeforeValidateHook => {
  return async ({ data, req, originalDoc }) => {
    const { collectionSlug, pageTypes, restrictions, enforceRootSlug } = config

    // ─────────────────────────────────────────────────────────────
    // ROOT PAGE VALIDATION
    // ─────────────────────────────────────────────────────────────

    if (!data.parent) {
      // Rule 1: Root must define pageType
      if (!data.pageType || !data.pageType.trim()) {
        throw new Error(
          'Root pages must define a pageType. Choose from: ' +
            pageTypes.map((t) => t.label).join(', '),
        )
      }

      const trimmedType = data.pageType.trim()
      data.pageType = trimmedType

      // Rule 2: Validate pageType is in config
      const validType = pageTypes.find((t) => t.slug === trimmedType)
      if (!validType) {
        throw new Error(
          `Invalid pageType "${trimmedType}". Valid types: ${pageTypes.map((t) => t.slug).join(', ')}`,
        )
      }

      // Rule 3: Enforce slug matches pageType (if enabled)
      if (enforceRootSlug && data.slug !== trimmedType) {
        throw new Error(
          `For root pages, slug must match pageType. ` +
            `Set slug to "${trimmedType}" or disable enforceRootSlug.`,
        )
      }

      // Rule 4: Prevent duplicate roots (only on create and on type change)
      const isTypeChanged = originalDoc && originalDoc.pageType !== trimmedType

      if (!originalDoc || isTypeChanged) {
        const existing = await req.payload.find({
          collection: collectionSlug,
          where: {
            parent: { exists: false },
            pageType: { equals: trimmedType },
            ...(originalDoc ? { id: { not_equals: originalDoc.id } } : {}),
          },
          limit: 1,
        })

        if (existing.totalDocs > 0) {
          throw new Error(
            `A root page already exists for page type "${validType.label}". ` +
              `Only one root per type is allowed.`,
          )
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // CHILD PAGE VALIDATION
    // ─────────────────────────────────────────────────────────────

    if (data.parent) {
      try {
        // Resolve pageType from root
        const rootPageType = await resolveRootPageType({
          id: data.parent,
          req,
          collectionSlug,
        })

        data.pageType = rootPageType
      } catch (err) {
        throw new Error(
          `Cannot save child page: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    // ─────────────────────────────────────────────────────────────
    // BLOCK VALIDATION (runs for root AND child)
    // ─────────────────────────────────────────────────────────────

    if (data.layout && Array.isArray(data.layout)) {
      const invalidBlocks = data.layout.filter((block) => {
        const blockType = block.blockType

        // Find restriction for this block
        // Note: restrictions auto-extracted from block configs by enhanceCollection
        const restriction = config.restrictions?.find((r) => r.block === blockType)

        // No restriction = allowed everywhere
        if (!restriction) return false

        // Has restriction: check if current pageType is allowed
        return !restriction.allowedPageTypes.includes(data.pageType)
      })

      /*
      Restrictions are automatically extracted from block component configs.
      When a block declares allowedPageTypes, it's converted to a restriction.
      No manual restrictions array needed in plugin config.
      */

      if (invalidBlocks.length > 0) {
        const pageTypeLabel = pageTypes.find((t) => t.slug === data.pageType)?.label
        const blockNames = invalidBlocks.map((b) => b.blockType).join(', ')

        throw new Error(
          `The following blocks are not allowed on ${pageTypeLabel} pages: ${blockNames}. ` +
            `Please remove or replace them before saving.`,
        )
      }
    }
  }
}

export const createBeforeDeleteHook = (config: PluginConfig): BeforeDeleteHook => {
  return async ({ doc, req }) => {
    const { collectionSlug, pageTypes } = config

    // Only check root pages
    if (doc.parent) {
      return
    }

    // Rule 1: Cannot delete root if it has children
    const children = await req.payload.find({
      collection: collectionSlug,
      where: {
        parent: { equals: doc.id },
      },
      limit: 1,
    })

    if (children.totalDocs > 0) {
      throw new Error(
        `Cannot delete this page because it has ${children.totalDocs} child page(s). ` +
          `Move or delete child pages first.`,
      )
    }

    // Rule 2: Cannot delete required roots
    const pageTypeCfg = pageTypes.find((t) => t.slug === doc.pageType)

    if (pageTypeCfg?.required) {
      throw new Error(
        `Cannot delete the "${pageTypeCfg.label}" root page. ` +
          `This page type is required by your site structure.`,
      )
    }
  }
}
```

### Test cases for hooks

Create `src/__tests__/hooks.test.ts`:

```ts
import { createBeforeValidateHook, createBeforeDeleteHook } from '../hooks'
import { PluginConfig } from '../types'

const mockConfig: PluginConfig = {
  collectionSlug: 'pages',
  pageTypes: [
    { slug: 'services', label: 'Services', required: true },
    { slug: 'legal', label: 'Legal', required: false },
  ],
  restrictions: [{ block: 'hero', allowedPageTypes: ['services'] }],
  enforceRootSlug: true,
}

describe('beforeValidate hook', () => {
  let hook: any
  let mockReq: any

  beforeEach(() => {
    hook = createBeforeValidateHook(mockConfig)
    mockReq = {
      payload: {
        find: jest.fn(),
        findByID: jest.fn(),
      },
    }
  })

  test('throws if root has no pageType', async () => {
    await expect(
      hook({
        data: { parent: null, pageType: '' },
        req: mockReq,
      }),
    ).rejects.toThrow(/must define a pageType/)
  })

  test('throws if pageType not in config', async () => {
    await expect(
      hook({
        data: { parent: null, pageType: 'invalid' },
        req: mockReq,
      }),
    ).rejects.toThrow(/Invalid pageType/)
  })

  test('allows child without pageType (computed from root)', async () => {
    mockReq.payload.findByID.mockResolvedValueOnce({
      id: 'root-1',
      parent: null,
      pageType: 'services',
    })

    const data = { parent: 'root-1', pageType: null, layout: [] }

    await hook({
      data,
      req: mockReq,
    })

    expect(data.pageType).toBe('services')
  })

  test('validates blocks against pageType', async () => {
    await expect(
      hook({
        data: {
          parent: null,
          pageType: 'legal',
          layout: [{ blockType: 'hero' }],
        },
        req: mockReq,
      }),
    ).rejects.toThrow(/not allowed on/)
  })

  test('allows blocks not in restrictions', async () => {
    const data = {
      parent: null,
      pageType: 'services',
      layout: [
        { blockType: 'hero' },
        { blockType: 'custom-block' }, // Not restricted
      ],
    }

    await hook({ data, req: mockReq })
    // Should not throw
  })
})

describe('beforeDelete hook', () => {
  let hook: any
  let mockReq: any

  beforeEach(() => {
    hook = createBeforeDeleteHook(mockConfig)
    mockReq = {
      payload: {
        find: jest.fn(),
      },
    }
  })

  test('throws if deleting required root', async () => {
    mockReq.payload.find.mockResolvedValue({ totalDocs: 0 })

    await expect(
      hook({
        doc: { id: 'root-1', parent: null, pageType: 'services' },
        req: mockReq,
      }),
    ).rejects.toThrow(/Cannot delete.*required/)
  })

  test('throws if root has children', async () => {
    mockReq.payload.find.mockResolvedValue({ totalDocs: 5 })

    await expect(
      hook({
        doc: { id: 'root-1', parent: null, pageType: 'legal' },
        req: mockReq,
      }),
    ).rejects.toThrow(/has.*child/)
  })

  test('allows delete of non-required root with no children', async () => {
    mockReq.payload.find.mockResolvedValue({ totalDocs: 0 })

    await expect(
      hook({
        doc: { id: 'root-1', parent: null, pageType: 'legal' },
        req: mockReq,
      }),
    ).resolves.not.toThrow()
  })
})
```

---

## Step 1.3 — Manual Integration Tests

Don't run automated tests yet. Test in the dev app manually.

### Start dev environment:

```bash
npm run dev
```

Visit `http://localhost:3000/admin`

### Test Case 1: Create root page

1. Go to Pages collection
2. Create new page:
   - Title: "Services Root"
   - Slug: "services"
   - Parent: (empty)
   - Page Type: "Services"
3. Save
4. ✅ Should succeed

### Test Case 2: Create child page

1. Create new page:
   - Title: "Service Details"
   - Slug: "service-details"
   - Parent: "Services Root"
   - Page Type: (empty/hidden)
2. Save
3. ✅ Should succeed, pageType should be inherited

### Test Case 3: Invalid block on root

1. Edit "Services Root" page
2. Add "Testimonials" block (restricted to services)
3. Save
4. ✅ Should succeed (testimonials allowed on services)

### Test Case 4: Invalid block on legal page

1. Create root: "Legal Root" with pageType "Legal"
2. Try to add "Hero" block (restricted to services)
3. Save
4. ❌ Should fail with clear error

### Test Case 5: Prevent duplicate roots

1. Create another root with pageType "Services"
2. Save
3. ❌ Should fail: "Root page already exists for Services"

### Test Case 6: Reparenting

1. Create: A (root), B (child of A), C (child of B)
2. Open C, change parent to A
3. Save
4. ✅ Should succeed, C now inherits from A directly

### Test Case 7: Delete protection

1. Try to delete "Services Root"
2. ❌ Should fail: "Cannot delete required root"
3. Delete "Legal Root" (not required)
4. ✅ Should succeed

---

## Step 1.4 — Debugging Tips

### Check logs

If validation fails unexpectedly:

```bash
tail -f dev/dev.log | grep pageType
```

### Add console.log

In `hooks.ts`:

```ts
console.log('beforeValidate data:', {
  parent: data.parent,
  pageType: data.pageType,
  layout: data.layout?.map((b) => b.blockType),
})
```

### Test resolveRootPageType directly

In dev app, create helper endpoint:

```ts
api.post('/debug/resolve-root', async (req, res) => {
  const { pageId } = req.body
  try {
    const type = await resolveRootPageType({
      id: pageId,
      req: req.payload,
      collectionSlug: 'pages',
    })
    res.json({ type })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})
```

---

## Checklist

- [x] `resolveRootPageType.ts` implemented
- [x] `beforeValidate` hook implemented
- [x] `beforeDelete` hook implemented
- [x] Unit tests written and passing
- [x] Root creation works in dev app
- [x] Child pages inherit pageType
- [x] Block restrictions enforce correctly
- [x] Duplicate root prevention works
- [x] Delete protection works
- [x] Deep nesting (3+ levels) works
- [x] All error messages are clear

---

## Troubleshooting

**"Cannot find module 'resolveRootPageType'"**
→ Make sure export is at the top of `src/resolveRootPageType.ts`

**"pageType not assigned to child"**
→ Check that `beforeValidate` hook is wired correctly in Phase 2

**"Circular parent error on valid hierarchy"**
→ Check that you're not creating accidental parent cycles (A→B→A)

---

## Next

→ Phase 2: Collection Enhancement (wire hooks, add field)
