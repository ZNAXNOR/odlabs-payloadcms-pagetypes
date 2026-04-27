import { type CollectionConfig, type Field, slugField } from 'payload'

import path from 'path'
import { fileURLToPath } from 'url'

import type { PluginConfig } from './types'

import { createBeforeDeleteHook, createBeforeValidateHook } from './hooks'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export function enhanceCollection(collection: CollectionConfig, config: PluginConfig): CollectionConfig {
  const { pageTypes } = config

  const existingFields = collection.fields || []
  const newFields = [...existingFields]

  // ─────────────────────────────────────────────────────────────
  // 1. MANAGE slug FIELD (Custom component & soft validation)
  // ─────────────────────────────────────────────────────────────
  let foundSlug = false

  const enhanceSlugField = (f: any) => {
    foundSlug = true
    f.admin = {
      ...f.admin,
      position: 'sidebar',
    }
  }

  const walkFields = (fields: Field[]) => {
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i] as any
      if (f.name === 'slug') {
        enhanceSlugField(f)
      } else if (f.fields) {
        walkFields(f.fields)
      }
    }
  }

  walkFields(newFields)

  if (!foundSlug) {
    newFields.push(
      slugField({
        useAsSlug: 'title',
        overrides: (field: any) => {
          const slugF = field.fields.find((f: any) => f.name === 'slug') as any
          if (slugF) {
            enhanceSlugField(slugF)
          }
          field.admin = { ...field.admin, position: 'sidebar' }
          return field
        },
      })
    )
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MANAGE parent FIELD (Nested Docs aware)
  // ─────────────────────────────────────────────────────────────
  const parentIdx = newFields.findIndex((f) => 'name' in f && f.name === 'parent')
  if (parentIdx !== -1) {
    const existing = newFields[parentIdx] as any
    newFields[parentIdx] = {
      ...existing,
      admin: {
        ...existing.admin,
        condition: (data: any) => !data?.pageType || !!data?.parent,
        position: 'sidebar',
      },
    }
  }


  // ─────────────────────────────────────────────────────────────
  // 3. MANAGE pageType FIELD
  // ─────────────────────────────────────────────────────────────
  const pageTypeField: Field = {
    name: 'pageType',
    type: 'select',
    admin: {
      components: {
        // Use the Client Component for reactive behavior
        Field: '@od-labs/payload-pagetypes/client#PageTypeField',
      },
      condition: (_, siblingData) => !siblingData?.parent,
      description: 'Choose the page type. Child pages inherit from their root.',
      position: 'sidebar',
    },
    label: 'Page Type',
    options: pageTypes.map((pt) => ({
      label: pt.label,
      value: pt.slug,
    })),
    required: false,
  }

  // ─────────────────────────────────────────────────────────────
  // 5. ENFORCE SIDEBAR HIERARCHY (Slug -> Parent -> PageType)
  // ─────────────────────────────────────────────────────────────
  
  // 1. Extract and remove these fields to re-insert in order
  const extractField = (name: string) => {
    const idx = newFields.findIndex(f => 'name' in f && f.name === name)
    if (idx !== -1) {
      return newFields.splice(idx, 1)[0]
    }
    // Also check for slugField (Row field)
    const rowIdx = newFields.findIndex(f => f.type === 'row' && f.fields?.some((sub: any) => sub.name === name))
    if (rowIdx !== -1) {
      return newFields.splice(rowIdx, 1)[0]
    }
    return null
  }

  const slugWarningField: Field = {
    name: 'slugWarning',
    type: 'ui',
    admin: {
      components: {
        Field: '@od-labs/payload-pagetypes/client#SlugDescription',
      },
      position: 'sidebar',
    },
  }

  const slugF = extractField('slug')
  const parentF = extractField('parent')
  const pageTypeF = extractField('pageType') || pageTypeField

  // 2. Push in desired order to the end
  if (slugF) newFields.push(slugF)
  newFields.push(slugWarningField) // Inject warning as a separate UI field
  if (parentF) newFields.push(parentF)
  if (pageTypeF) newFields.push(pageTypeF)

  // ─────────────────────────────────────────────────────────────
  // 4. INJECT HOOKS
  // ─────────────────────────────────────────────────────────────
  const beforeValidateHook = createBeforeValidateHook(config)
  const beforeDeleteHook = createBeforeDeleteHook(config)

  const existingBeforeValidate = collection.hooks?.beforeValidate || []
  const existingBeforeDelete = collection.hooks?.beforeDelete || []

  const beforeValidateArray = Array.isArray(existingBeforeValidate)
    ? existingBeforeValidate
    : [existingBeforeValidate]

  const beforeDeleteArray = Array.isArray(existingBeforeDelete)
    ? existingBeforeDelete
    : [existingBeforeDelete]

  // ─────────────────────────────────────────────────────────────
  // 5. ENHANCE LAYOUT FIELD (Native filterOptions)
  // ─────────────────────────────────────────────────────────────
  const layoutFieldIdx = newFields.findIndex((f) => 'name' in f && f.name === 'layout' && f.type === 'blocks')
  
  if (layoutFieldIdx !== -1) {
    const layoutField = newFields[layoutFieldIdx] as any

    // Extract allowed blocks from their config
    const blockRestrictionsMap = new Map<string, string[]>()

    layoutField.blocks?.forEach((block: any) => {
      // In Phase 2 we changed this to block.custom?.allowedPageTypes
      const allowedPageTypes = block.custom?.allowedPageTypes || block.allowedPageTypes
      if (allowedPageTypes) {
        blockRestrictionsMap.set(block.slug, allowedPageTypes)
      }
    })

    // Set filterOptions on the blocks field
    newFields[layoutFieldIdx] = {
      ...layoutField,
      filterOptions: ({ siblingData }: any) => {
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
    }
  }
  return {
    ...collection,
    custom: {
      ...collection.custom,
      pageTypesPlugin: {
        pageTypes: config.pageTypes,
        collectionSlug: config.collectionSlug,
      },
    },
    fields: newFields,
    hooks: {
      ...collection.hooks,
      beforeDelete: [...beforeDeleteArray, beforeDeleteHook],
      beforeValidate: [...beforeValidateArray, beforeValidateHook],
    },
  }
}
