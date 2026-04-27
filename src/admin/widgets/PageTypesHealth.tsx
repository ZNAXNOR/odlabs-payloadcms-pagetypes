import React from 'react'
import type { WidgetServerProps } from 'payload'
import { PageTypesHealthClient } from './PageTypesHealthClient'

interface PageTypeConfig {
  slug: string
  label: string
  required?: boolean
}

/**
 * Dashboard widget for Page Types health check.
 *
 * Registered via `admin.dashboard.widgets` (Payload modular dashboard).
 */
export default async function PageTypesHealthWidget(props: WidgetServerProps) {
  const { req, widgetData, serverProps } = props as any
  const payload = req.payload

  // ── EXTRACT CONFIG ──
  let pageTypes: PageTypeConfig[] = (serverProps?.pageTypes as PageTypeConfig[]) || []
  let collectionSlug = (serverProps?.collectionSlug as string) || 'pages'

  if (pageTypes.length === 0 && widgetData?.pageTypes && Array.isArray(widgetData.pageTypes)) {
    pageTypes = widgetData.pageTypes as PageTypeConfig[]
    collectionSlug = (widgetData.collectionSlug as string) ?? collectionSlug
  }

  if (pageTypes.length === 0) {
    const collectionWithConfig = payload.config.collections.find(
      (c: any) => c.custom?.pageTypesPlugin,
    )
    if (collectionWithConfig?.custom?.pageTypesPlugin) {
      pageTypes = collectionWithConfig.custom.pageTypesPlugin.pageTypes
      collectionSlug = collectionWithConfig.custom.pageTypesPlugin.collectionSlug
    } else {
      return null
    }
  }

  // ── FETCH ROOT PAGES ──
  let roots: any[] = []
  let error: string | null = null

  try {
    const result = await payload.find({
      collection: collectionSlug,
      where: { parent: { exists: false } },
      limit: 100,
      depth: 0,
    })
    roots = result.docs || []
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch page types'
  }

  // ── ANALYZE ──
  const rootsByType = new Map<string, typeof roots>()
  roots.forEach((root) => {
    const type = root.pageType as string
    if (!type) return
    if (!rootsByType.has(type)) {
      rootsByType.set(type, [])
    }
    rootsByType.get(type)!.push(root)
  })

  const missing = pageTypes.filter((pt) => !rootsByType.has(pt.slug))
  const duplicates = Array.from(rootsByType.entries()).filter(([_, pages]) => pages.length > 1)

  const isHealthy = missing.length === 0 && duplicates.length === 0
  const healthPct =
    pageTypes.length > 0
      ? Math.round(((pageTypes.length - missing.length) / pageTypes.length) * 100)
      : 100

  // ── RENDER ──
  return (
    <PageTypesHealthClient
      pageTypes={pageTypes}
      collectionSlug={collectionSlug}
      rootsByTypeSize={rootsByType.size}
      missing={missing}
      duplicates={duplicates}
      isHealthy={isHealthy}
      healthPct={healthPct}
      error={error}
    />
  )
}
