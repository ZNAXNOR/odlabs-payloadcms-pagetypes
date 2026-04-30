# Payload Page Types Plugin

A Payload CMS v3 plugin that enforces structured page types, hierarchical consistency, and block-level restrictions.

## Features

* **Page Type System**: Define strict root-level page types (e.g., `services`, `legal`) with automatic inheritance for all descendants.
* **Block Restrictions**: Restrict specific blocks to specific page types (e.g., `hero` only allowed on `services`).
* **Hierarchy Enforcement**: 
    * Exactly one root per page type.
    * Prevent circular parent relationships.
    * Protect required roots from deletion.
* **Server-Side Validation**: All rules enforced in `beforeValidate` and `beforeDelete` hooks.
* **Admin Health Widget**: Detects missing or duplicate root pages with quick action shortcuts.
* **Reactive UI**: Admin panel filters available blocks dynamically based on the current page's resolved page type.

## Installation

```bash
pnpm add @od-labs/payload-pagetypes
```

## Usage

Register the plugin in your Payload config:

```ts
import { pageTypesPlugin } from '@od-labs/payload-pagetypes'

export default buildConfig({
  collections: [Pages],
  plugins: [
    pageTypesPlugin({
      collectionSlug: 'pages',
      pageTypes: [
        { slug: 'services', label: 'Services', required: true },
        { slug: 'legal', label: 'Legal', required: true }
      ],
      enforceRootSlug: true
    })
  ]
})
```

### Block-level Restrictions

Blocks declare their own `allowedPageTypes` in their `custom` config:

```ts
const HeroBlock = {
  slug: 'hero',
  custom: {
    allowedPageTypes: ['services'], // Only allowed under a 'Services' root page
  },
  fields: [...]
}
```

The plugin automatically extracts these restrictions and enforces them at both the UI and server levels.

## Configuration

| Option | Type | Description |
|--------|------|-------------|
| `collectionSlug` | `string` | The slug of the collection to apply page types to (usually `pages`). |
| `pageTypes` | `PageType[]` | List of allowed root page types. |
| `enforceRootSlug` | `boolean` | If true, root pages must have a slug matching their `pageType`. |

### PageType Object
```ts
{
  slug: string      // Unique identifier for the page type
  label: string     // Human-readable label
  required?: boolean // If true, the root page cannot be deleted
}
```

## Behavior

### Root Pages
- Must define a `pageType`.
- Only one root page is allowed per type.
- Cannot be deleted if marked `required` or if they have child pages.

### Child Pages
- `pageType` is automatically inherited from the absolute root ancestor.
- Inherited `pageType` is read-only and managed by the plugin.
- Safe across deep nesting and handles parent changes automatically.

### Validation
- Validation runs on every save.
- If a root's `pageType` is changed, all blocks in the hierarchy are re-validated.
- If invalid blocks exist, the save will fail, and the user must remove or replace the restricted blocks.

## Migration Guide

1. **Deploy Plugin**: Add the plugin to your config.
2. **Create Roots**: Use the **Page Types Health** widget on the dashboard to identify and create missing root pages.
3. **Assign Parents**: Ensure existing pages are correctly nested under the appropriate root.
4. **Clean Content**: Remove blocks from pages that are no longer allowed in their new hierarchy.

## Limitations
- Optimized for Payload v3.
- Requires `@payloadcms/plugin-nested-docs` for parent relationship management.
- Currently supports a single collection (MVP scope).

## Contributing

For local development setup, testing, and contribution guidelines, please see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT © [OD LABS](https://github.com/ZNAXNOR)