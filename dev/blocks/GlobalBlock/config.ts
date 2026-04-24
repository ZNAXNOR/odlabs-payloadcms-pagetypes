import type { Block } from 'payload'

export const GlobalBlock: Block = {
  slug: 'globalBlock',
  fields: [
    {
      name: 'text',
      type: 'text',
    },
  ],
}
