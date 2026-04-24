import type { Block } from 'payload'

export const ServiceBlock: Block & { allowedPageTypes?: string[] } = {
  slug: 'serviceBlock',
  allowedPageTypes: ['services'],
  fields: [
    {
      name: 'text',
      type: 'text',
    },
  ],
}
