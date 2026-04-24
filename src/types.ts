export type PageTypeConfig = {
  label: string
  required?: boolean
  slug: string
}

export type BlockRestriction = {
  allowedPageTypes: string[]
  block: string
}

export type PluginConfig = {
  collectionSlug: string
  enforceRootSlug?: boolean
  pageTypes: PageTypeConfig[]
  restrictions?: BlockRestriction[]
}
