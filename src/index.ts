import type { Config, CollectionConfig } from 'payload'

import type { PluginConfig, BlockRestriction } from './types.js'

import { enhanceCollection } from './enhanceCollection.js'

/**
 * Automatically extract restrictions from block configs
 */
function extractBlockRestrictions(collection: CollectionConfig): BlockRestriction[] {
  const layoutField = collection.fields?.find(
    (f) => typeof f === 'object' && 'name' in f && f.name === 'layout',
  ) as any

  if (!layoutField?.blocks) return []

  const extracted = layoutField.blocks
    .filter((block: any) => block.custom?.allowedPageTypes)
    .map((block: any) => ({
      block: block.slug,
      allowedPageTypes: block.custom.allowedPageTypes,
    }))

  console.log('--- PAGE TYPES PLUGIN: Extracted Restrictions ---', extracted)
  
  return extracted
}

/**
 * Payload Page Types Plugin
 *
 * Enforces structured page types with hierarchical consistency
 * and block-level restrictions.
 */
export const pageTypesPlugin =
  (pluginConfig: PluginConfig) =>
  (config: Config): Config => {
    // Validate config before processing
    validatePluginConfig(pluginConfig)

    return {
      ...config,
      collections: (config.collections || []).map((collection) => {
        // Only enhance the target collection
        if (collection.slug === pluginConfig.collectionSlug) {
          // Auto-extract restrictions from blocks
          const blockRestrictions = extractBlockRestrictions(collection)

          // Merge with any manually defined restrictions (manual takes precedence)
          const mergedConfig = {
            ...pluginConfig,
            restrictions: [...blockRestrictions, ...(pluginConfig.restrictions || [])],
          }

          return enhanceCollection(collection, mergedConfig)
        }
        return collection
      }),
    }
  }

/**
 * Validate plugin configuration at startup
 */
function validatePluginConfig(config: PluginConfig): void {
  if (!config.collectionSlug) {
    throw new Error('pageTypesPlugin: collectionSlug is required')
  }

  if (!Array.isArray(config.pageTypes) || config.pageTypes.length === 0) {
    throw new Error('pageTypesPlugin: pageTypes array must not be empty')
  }

  // Check for duplicate pageType slugs
  const slugs = config.pageTypes.map((pt) => pt.slug)
  const duplicates = slugs.filter((slug, idx) => slugs.indexOf(slug) !== idx)

  if (duplicates.length > 0) {
    throw new Error(`pageTypesPlugin: Duplicate pageType slugs found: ${duplicates.join(', ')}`)
  }

  // Check for invalid restrictions
  const validSlugs = new Set(slugs)

  if (Array.isArray(config.restrictions)) {
    config.restrictions.forEach((restriction) => {
      restriction.allowedPageTypes.forEach((slug) => {
        if (!validSlugs.has(slug)) {
          throw new Error(
            `pageTypesPlugin: Restriction references invalid pageType "${slug}". ` +
              `Valid types: ${Array.from(validSlugs).join(', ')}`,
          )
        }
      })
    })
  }
}

// Re-export types for convenience
export { resolveRootPageType } from './resolveRootPageType.js'
export type { PluginConfig } from './types.js'
