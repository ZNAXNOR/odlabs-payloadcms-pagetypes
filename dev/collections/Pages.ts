import type { CollectionConfig } from 'payload'

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: {
    create: () => true,
    delete: () => true,
    read: () => true,
    update: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true
    },
    {
      name: 'layout',
      type: 'blocks',
      blocks: [
        {
          slug: 'hero',
          fields: [{ name: 'title', type: 'text', required: true }],
          labels: {
            plural: 'Heroes',
            singular: 'Hero',
          },
        },
        {
          slug: 'testimonials',
          fields: [
            {
              name: 'items',
              type: 'array',
              fields: [{ name: 'text', type: 'text' }],
            },
          ],
          labels: {
            plural: 'Testimonials',
            singular: 'Testimonial',
          },
        },
      ],
    },
    {
      name: 'pageType',
      type: 'select',
      options: [
        { label: 'Services', value: 'services' },
        { label: 'Legal', value: 'legal' },
      ],
    },
  ]
}
