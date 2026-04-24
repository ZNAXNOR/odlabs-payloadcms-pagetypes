import type { Block } from 'payload'

export const ServiceBlock: Block = {
  slug: 'serviceBlock',
  custom: {
    allowedPageTypes: ['services'],
  },
  fields: [
    {
      name: 'text',
      type: 'text',
    },
  ],
}
