# Phase 4 — Admin Widget

**Goal:** Implement health check widget and quick actions for missing roots

**Status:** Phase 1-3 must be complete before starting Phase 4

---

## Overview

The admin widget:

1. Scans Pages collection on dashboard load
2. Detects missing roots (configured types without root pages)
3. Detects duplicate roots (types with >1 root)
4. Provides quick action to create missing roots
5. Links to duplicate roots for manual resolution

---

## Step 4.1 — Implement Widget Component

### Create: `src/admin/Widget.tsx`

```tsx
import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@payloadcms/ui'

interface PageType {
  slug: string
  label: string
  required?: boolean
}

interface PageData {
  id: string | number
  slug: string
  title: string
  pageType: string
  parent: string | null
}

interface WidgetStatus {
  missing: PageType[]
  duplicates: Record<string, PageData[]>
  loading: boolean
  error: string | null
}

interface WidgetProps {
  collectionSlug: string
  pageTypes: PageType[]
  onRefresh?: () => void
}

export const PageTypesWidget: React.FC<WidgetProps> = ({
  collectionSlug,
  pageTypes,
  onRefresh
}) => {
  const { user } = useAuth()
  const [status, setStatus] = useState<WidgetStatus>({
    missing: [],
    duplicates: {},
    loading: true,
    error: null
  })
  const [creatingTypes, setCreatingTypes] = useState<Set<string>>(new Set())

  // Fetch roots on mount
  useEffect(() => {
    checkPageStructure()
  }, [])

  const checkPageStructure = useCallback(async () => {
    setStatus(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Fetch all root pages (parent: null)
      const response = await fetch(
        `/api/${collectionSlug}?where[parent][exists]=false&limit=100`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch pages: ${response.statusText}`)
      }

      const data = await response.json()
      const roots = data.docs as PageData[]

      // Find missing and duplicate roots
      const rootsByType: Record<string, PageData[]> = {}

      roots.forEach(root => {
        if (!rootsByType[root.pageType]) {
          rootsByType[root.pageType] = []
        }
        rootsByType[root.pageType].push(root)
      })

      const missing = pageTypes.filter(pt => !rootsByType[pt.slug])
      const duplicates = Object.fromEntries(
        Object.entries(rootsByType).filter(([_, roots]) => roots.length > 1)
      )

      setStatus({
        missing,
        duplicates,
        loading: false,
        error: null
      })
    } catch (err) {
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }))
    }
  }, [collectionSlug])

  const createRoot = useCallback(
    async (pageType: PageType) => {
      if (creatingTypes.has(pageType.slug)) return

      setCreatingTypes(prev => new Set([...prev, pageType.slug]))

      try {
        const response = await fetch(`/api/${collectionSlug}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: pageType.label,
            slug: pageType.slug,
            pageType: pageType.slug
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to create page: ${response.statusText}`)
        }

        // Refresh the widget
        await checkPageStructure()
        onRefresh?.()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        setStatus(prev => ({
          ...prev,
          error: `Failed to create ${pageType.label}: ${errorMsg}`
        }))
      } finally {
        setCreatingTypes(prev => {
          const next = new Set(prev)
          next.delete(pageType.slug)
          return next
        })
      }
    },
    [collectionSlug, creatingTypes, checkPageStructure, onRefresh]
  )

  // Loading state
  if (status.loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>📄 Page Types</div>
        <div style={styles.loading}>Loading...</div>
      </div>
    )
  }

  // Error state
  if (status.error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>📄 Page Types</div>
        <div style={{ ...styles.section, backgroundColor: '#fff3cd', borderColor: '#ffc107' }}>
          <p style={styles.error}>⚠️ {status.error}</p>
          <button onClick={checkPageStructure} style={styles.button}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Healthy state
  const isHealthy = status.missing.length === 0 && Object.keys(status.duplicates).length === 0

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        📄 Page Types {isHealthy ? '✅' : '⚠️'}
      </div>

      {/* Missing Roots */}
      {status.missing.length > 0 && (
        <div style={{ ...styles.section, backgroundColor: '#ffe6e6', borderColor: '#ff6b6b' }}>
          <h4 style={styles.sectionTitle}>Missing Root Pages ({status.missing.length})</h4>
          <p style={styles.sectionText}>
            The following page types need root pages:
          </p>
          <ul style={styles.list}>
            {status.missing.map(pageType => (
              <li key={pageType.slug} style={styles.listItem}>
                <span>
                  <strong>{pageType.label}</strong> {pageType.required && '(required)'}
                </span>
                <button
                  onClick={() => createRoot(pageType)}
                  disabled={creatingTypes.has(pageType.slug)}
                  style={{
                    ...styles.button,
                    ...(creatingTypes.has(pageType.slug) ? styles.buttonDisabled : {})
                  }}
                >
                  {creatingTypes.has(pageType.slug) ? 'Creating...' : 'Create'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Duplicate Roots */}
      {Object.keys(status.duplicates).length > 0 && (
        <div style={{ ...styles.section, backgroundColor: '#fff3cd', borderColor: '#ffc107' }}>
          <h4 style={styles.sectionTitle}>Duplicate Roots</h4>
          <p style={styles.sectionText}>
            Some page types have multiple root pages. Only one is allowed:
          </p>
          {Object.entries(status.duplicates).map(([typeSlug, roots]) => (
            <div key={typeSlug} style={styles.subsection}>
              <p style={{ margin: '8px 0', fontWeight: '600' }}>
                {pageTypes.find(pt => pt.slug === typeSlug)?.label}
              </p>
              <ul style={styles.list}>
                {roots.map(root => (
                  <li key={root.id} style={{ ...styles.listItem, fontSize: '13px' }}>
                    <a
                      href={`/admin/collections/${collectionSlug}/${root.id}`}
                      style={{ color: '#0066cc', textDecoration: 'none' }}
                    >
                      {root.title} ({root.slug})
                    </a>
                  </li>
                ))}
              </ul>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
                Please delete the duplicate and keep one root.
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Healthy state */}
      {isHealthy && (
        <div style={{ ...styles.section, backgroundColor: '#e6f5e6', borderColor: '#51cf66' }}>
          <p style={{ margin: '0', color: '#2b7a2b' }}>
            ✅ All page types have valid root pages
          </p>
        </div>
      )}

      {/* Refresh button */}
      <button onClick={checkPageStructure} style={styles.refreshButton}>
        🔄 Refresh
      </button>
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  } as React.CSSProperties,

  header: {
    fontSize: '16px',
    fontWeight: '700',
    marginBottom: '12px',
    color: '#212529'
  } as React.CSSProperties,

  section: {
    backgroundColor: '#f0f7ff',
    border: '1px solid #b3d9ff',
    borderRadius: '4px',
    padding: '12px',
    marginBottom: '12px'
  } as React.CSSProperties,

  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#212529'
  } as React.CSSProperties,

  sectionText: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    color: '#495057'
  } as React.CSSProperties,

  subsection: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(0,0,0,0.1)'
  } as React.CSSProperties,

  list: {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '13px'
  } as React.CSSProperties,

  listItem: {
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px'
  } as React.CSSProperties,

  button: {
    backgroundColor: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  } as React.CSSProperties,

  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  } as React.CSSProperties,

  refreshButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '8px'
  } as React.CSSProperties,

  loading: {
    padding: '16px',
    textAlign: 'center' as const,
    color: '#666'
  } as React.CSSProperties,

  error: {
    margin: '0 0 8px 0',
    color: '#856404'
  } as React.CSSProperties
}
```

---

## Step 4.2 — Wire Widget into Collection

The widget displays on the collection dashboard.

### Update `src/enhanceCollection.ts`:

```ts
import { PageTypesWidget } from './admin/Widget'

export function enhanceCollection(
  collection: CollectionConfig,
  config: PluginConfig
): CollectionConfig {
  // ... existing code ...

  return {
    ...collection,
    fields: newFields,
    hooks: { /* ... */ },
    admin: {
      ...collection.admin,
      components: {
        ...collection.admin?.components,
        // Add widget to collection dashboard
        views: {
          list: {
            // This may vary depending on Payload version
            // Check your version's component structure
          }
        }
      },
      // Alternative: use defaultColumns hook to add status indicator
      defaultColumns: [
        'title',
        'slug',
        'pageType',
        'parent',
        'createdAt'
      ],
      // Widget will be added via dashboard config (see Step 4.3)
    }
  }
}
```

---

## Step 4.3 — Wire into Payload Config

The widget is registered in the Payload config, not in the collection.

### Update `dev/payload.config.ts`:

```ts
import { buildConfig } from 'payload'
import { PageTypesWidget } from '../src/admin/Widget'

export default buildConfig({
  // ... existing config ...

  admin: {
    // ... existing admin config ...

    // Add dashboard widgets
    components: {
      // This may vary by Payload version — adjust as needed
      afterDashboard: [
        () => (
          <PageTypesWidget
            collectionSlug="pages"
            pageTypes={[
              { slug: 'services', label: 'Services', required: true },
              { slug: 'legal', label: 'Legal', required: false },
              { slug: 'blog', label: 'Blog', required: false }
            ]}
          />
        )
      ]
    }
  },

  // ... rest of config
})
```

**Note:** Widget placement varies by Payload version. Check your version's admin component structure.

---

## Step 4.4 — Test in Dev App

```bash
npm run dev
```

### Test Flow 1: Widget shows missing roots

1. Go to admin dashboard
2. Widget should show at top
3. Should list missing roots in red
4. Click "Create" for missing type
5. ✅ Root should be created automatically
6. Page should refresh
7. ✅ Missing section should disappear

### Test Flow 2: Widget detects duplicates

1. Manually create 2 roots with same pageType (via MongoDB or API)
2. Refresh dashboard
3. Widget should show yellow warning
4. Should list both duplicate roots with edit links
5. ✅ Click link → opens root for editing
6. Delete one duplicate
7. Refresh
8. ✅ Warning should disappear

### Test Flow 3: Widget shows healthy state

1. Create all required roots
2. No duplicates
3. Widget shows green "✅ All page types have valid roots"

### Test Flow 4: Refresh button

1. Manually create missing root in another tab
2. Widget still shows old state
3. Click "Refresh"
4. Widget updates to show created root

---

## Step 4.5 — Error Handling

The widget gracefully handles failures:

**API Unreachable**
→ Shows error message, Retry button

**Create fails (invalid slug, etc.)**
→ Shows error popup, can retry

**Duplicate slugs**
→ Fetch still works, shows links for manual resolution

---

## Step 4.6 — Accessibility & UX

### Consider adding:

1. **Loading skeleton**
```tsx
if (status.loading) {
  return <div style={styles.skeleton}>⏳ Loading page structure...</div>
}
```

2. **Toast notifications** (if Payload has a toast API)
```ts
// After successful create
showNotification('Root page created successfully', 'success')
```

3. **ARIA labels** for accessibility
```tsx
<button aria-label="Create Services root page">Create</button>
```

---

## Step 4.7 — Advanced Features (Optional)

### Feature: Bulk create missing

```tsx
<button onClick={createAllMissing} style={styles.button}>
  Create All Missing
</button>

async function createAllMissing() {
  for (const pageType of status.missing) {
    await createRoot(pageType)
  }
}
```

### Feature: View all roots

```tsx
<a href={`/admin/collections/pages?where[parent][exists]=false`}>
  View all roots
</a>
```

### Feature: Export structure

```tsx
<button onClick={exportStructure}>📥 Export Structure</button>

function exportStructure() {
  const json = JSON.stringify(status, null, 2)
  download('page-structure.json', json)
}
```

---

## Troubleshooting

**"Widget doesn't appear on dashboard"**
→ Check Payload version's admin component structure. Component placement varies.

**"Create button doesn't work"**
→ Verify API endpoint exists: `GET /api/pages` and `POST /api/pages`

**"Fetch returns 404"**
→ Check `collectionSlug` matches collection config

**"Create succeeds but widget doesn't refresh"**
→ Widget may not be re-querying. Add explicit refetch after create.

**"TypeError in Widget component"**
→ Check useAuth hook availability in your Payload version

---

## Checklist

- [ ] Widget component created
- [ ] Wired into Payload config
- [ ] Appears on admin dashboard
- [ ] Detects missing roots
- [ ] Detects duplicate roots
- [ ] Shows healthy state
- [ ] Create button works
- [ ] Refresh button works
- [ ] Error handling works
- [ ] Links to duplicate roots work
- [ ] Widget styled appropriately
- [ ] No console errors

---

## Next

→ Phase 5: Nested Docs Integration (parent field)