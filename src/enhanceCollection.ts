import type { CollectionConfig, Field } from 'payload'

import path from 'path'
import { fileURLToPath } from 'url'

import type { PluginConfig } from './types.js'

import { createBeforeDeleteHook, createBeforeValidateHook } from './hooks.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export function enhanceCollection(collection: CollectionConfig, config: PluginConfig): CollectionConfig {
  const { pageTypes } = config

  const existingFields = collection.fields || []
  const newFields = [...existingFields]

  // ─────────────────────────────────────────────────────────────
  // 1. MANAGE slug FIELD
  // ─────────────────────────────────────────────────────────────
  const slugFieldIdx = newFields.findIndex((f) => 'name' in f && f.name === 'slug')
  const slugField: Field = {
    name: 'slug',
    type: 'text',
    admin: {
      description: ({ data }: any) => {
        if (config.enforceRootSlug && data?.pageType && data?.slug !== data.pageType && !data.parent) {
          return `⚠️ Warning: Slug does not match Page Type. Recommended: "${data.pageType}"`
        }
        return 'The slug is used to identify the page in the URL.'
      },
      position: 'sidebar',
    },
    index: true,
    required: true,
  }

  if (slugFieldIdx === -1) {
    newFields.push(slugField)
  } else {
    const existing = newFields[slugFieldIdx] as any
    newFields[slugFieldIdx] = {
      ...existing,
      admin: {
        ...existing.admin,
        description: slugField.admin?.description,
        position: 'sidebar',
      },
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MANAGE parent FIELD
  // ─────────────────────────────────────────────────────────────
  const parentFieldIdx = newFields.findIndex((f) => 'name' in f && f.name === 'parent')
  const parentField: Field = {
    name: 'parent',
    type: 'relationship',
    admin: {
      // Logic: Hide parent ONLY if a pageType is selected AND no parent is selected yet.
      // This allows child pages (which have inherited types) to still see their parent field.
      condition: (data: any) => !data?.pageType || !!data?.parent,
      position: 'sidebar',
    },
    maxDepth: 1,
    relationTo: collection.slug,
  }

  if (parentFieldIdx === -1) {
    newFields.push(parentField)
  } else {
    const existing = newFields[parentFieldIdx] as any
    newFields[parentFieldIdx] = {
      ...existing,
      admin: {
        ...existing.admin,
        condition: parentField.admin?.condition,
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

  // Check if it already exists
  const pageTypeFieldIdx = newFields.findIndex((f) => 'name' in f && f.name === 'pageType')
  if (pageTypeFieldIdx === -1) {
    newFields.push(pageTypeField)
  } else {
    const existing = newFields[pageTypeFieldIdx] as any
    newFields[pageTypeFieldIdx] = {
      ...existing,
      ...pageTypeField,
      admin: {
        ...existing.admin,
        ...pageTypeField.admin,
      },
    }
  }

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
  // 5. RETURN ENHANCED COLLECTION
  // ─────────────────────────────────────────────────────────────
  return {
    ...collection,
    fields: newFields,
    hooks: {
      ...collection.hooks,
      beforeDelete: [...beforeDeleteArray, beforeDeleteHook],
      beforeValidate: [...beforeValidateArray, beforeValidateHook],
    },
  }
}
