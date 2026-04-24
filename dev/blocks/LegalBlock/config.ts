import type { Block } from 'payload'

export const LegalBlock: Block = {
  slug: 'legalBlock',
  custom: {
    allowedPageTypes: ['legal'],
  },
  fields: [
    {
      name: 'text',
      type: 'text',
    },
  ],
}
