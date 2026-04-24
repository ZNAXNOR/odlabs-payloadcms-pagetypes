import type { CollectionBeforeDeleteHook, CollectionBeforeValidateHook } from 'payload'

import type { PluginConfig } from './types.js'

import { resolveRootPageType } from './resolveRootPageType.js'

export const createBeforeValidateHook = (config: PluginConfig): CollectionBeforeValidateHook => {
  return async ({ data, originalDoc, req }) => {
    if (!data) {
      return data
    }
    const { collectionSlug, pageTypes, restrictions } = config

    // Determine parent (null means root, someId means child, undefined means use originalDoc)
    const effectiveParent = data.parent !== undefined ? data.parent : originalDoc?.parent
    const isRoot = !effectiveParent

    // Determine current pageType
    const effectivePageType = (data.pageType !== undefined ? data.pageType : originalDoc?.pageType) as
      | null
      | string
      | undefined

    // ─────────────────────────────────────────────────────────────
    // ROOT PAGE VALIDATION
    // ─────────────────────────────────────────────────────────────

    if (isRoot) {
      // NOTE: Root pageType is now OPTIONAL (Simple Pages)
      if (effectivePageType) {
        const trimmedType = effectivePageType.trim()

        // Update data if it's being set or if it's a new doc
        if (data.pageType !== undefined) {
          data.pageType = trimmedType
        }

        // Rule 1: Validate pageType is in config
        const validType = pageTypes.find((t) => t.slug === trimmedType)
        if (!validType) {
          throw new Error(
            `Invalid pageType "${trimmedType}". Valid types: ${pageTypes.map((t) => t.slug).join(', ')}`,
          )
        }

        // Rule 2: Prevent duplicate roots (only on create or on type/parent change)
        const isTypeChanged = data.pageType !== undefined && originalDoc?.pageType !== trimmedType
        const isParentChanged = data.parent !== undefined && originalDoc?.parent !== data.parent

        if (!originalDoc || isTypeChanged || isParentChanged) {
          const where: any = {
            and: [
              { parent: { equals: null } },
              { pageType: { equals: trimmedType } },
            ],
          }

          if (originalDoc?.id) {
            where.and.push({ id: { not_equals: originalDoc.id } })
          }

          const existing = await req.payload.find({
            collection: collectionSlug,
            limit: 1,
            overrideAccess: false,
            req,
            user: req.user,
            where,
          })

          if (existing.totalDocs > 0) {
            throw new Error(
              `A root page already exists for page type "${validType.label}". ` +
                `Only one root per type is allowed.`,
            )
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // CHILD PAGE VALIDATION
    // ─────────────────────────────────────────────────────────────

    if (!isRoot && effectiveParent) {
      try {
        // Resolve pageType from root
        const rootPageType = await resolveRootPageType({
          id: effectiveParent as number | string,
          collectionSlug,
          req,
        })

        // Always set the inherited pageType on the document during validation
        if (rootPageType) {
          data.pageType = rootPageType
        }
      } catch (err) {
        // If resolution fails (e.g. root has no type), we allow it as a simple page child
        console.warn(`Inheritance resolution failed for child: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // ─────────────────────────────────────────────────────────────
    // BLOCK VALIDATION (runs for root AND child)
    // ─────────────────────────────────────────────────────────────

    // Only validate if layout is being changed AND pageType is present
    if (data.layout && Array.isArray(data.layout)) {
      const pageTypeToValidate = data.pageType || effectivePageType

      if (pageTypeToValidate) {
        const invalidBlocks = data.layout.filter((block: Record<string, any>) => {
          const blockType = block.blockType

          // Find restriction for this block
          const restriction = restrictions?.find((r) => r.block === blockType)

          // No restriction = allowed everywhere
          if (!restriction) {
            return false
          }

          // Has restriction: check if current pageType is allowed
          return !restriction.allowedPageTypes.includes(pageTypeToValidate as string)
        })

        if (invalidBlocks.length > 0) {
          const pageTypeLabel = pageTypes.find((t) => t.slug === (pageTypeToValidate as string))?.label
          const blockNames = invalidBlocks.map((b: Record<string, any>) => b.blockType).join(', ')

          throw new Error(
            `The following blocks are not allowed on ${pageTypeLabel} pages: ${blockNames}. ` +
              `Please remove or replace them before saving.`,
          )
        }
      }
    }

    return data
  }
}

export const createBeforeDeleteHook = (config: PluginConfig): CollectionBeforeDeleteHook => {
  return async ({ id, req }) => {
    const { collectionSlug, pageTypes } = config

    // Fetch doc to check its properties
    const doc = (await req.payload.findByID({
      id,
      collection: collectionSlug,
      depth: 0,
      req,
    })) as Record<string, any>

    if (!doc) {
      return
    }

    // Only check root pages
    if (doc.parent) {
      return
    }

    // Rule 1: Cannot delete root if it has children
    const children = await req.payload.find({
      collection: collectionSlug,
      limit: 1,
      overrideAccess: false,
      req,
      user: req.user,
      where: {
        parent: { equals: id },
      },
    })

    if (children.totalDocs > 0) {
      throw new Error(
        `Cannot delete this page because it has ${children.totalDocs} child page(s). ` +
          `Move or delete child pages first.`,
      )
    }

    // Rule 2: Cannot delete required roots (if it has a type)
    if (doc.pageType) {
      const pageTypeCfg = pageTypes.find((t) => t.slug === (doc.pageType as string))

      if (pageTypeCfg?.required) {
        throw new Error(
          `Cannot delete the "${pageTypeCfg.label}" root page. ` +
            `This page type is required by your site structure.`,
        )
      }
    }
  }
}
