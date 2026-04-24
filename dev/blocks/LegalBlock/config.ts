import type { Block } from 'payload'

export const LegalBlock: Block & { allowedPageTypes?: string[] } = {
  slug: 'legalBlock',
  allowedPageTypes: ['legal'],
  fields: [
    {
      name: 'text',
      type: 'text',
    },
  ],
}
