# Phase 0 — Setup (Using Official Template)

**Goal:** Initialize plugin repository and configure for development

---

## Overview

Phase 0 uses the official Payload plugin template to bootstrap the project structure. This template includes:

- Pre-configured build tooling
- Dev environment wired to Payload
- TypeScript setup
- Export patterns

You build in `/src`, test in `/dev`.

---

## Step 0.1 — Clone Template

```bash
git clone https://github.com/payloadcms/plugin-template
cd plugin-template
```

Verify directory structure:

```
plugin-template/
├── src/
│   └── index.ts
├── dev/
│   ├── payload.config.ts
│   ├── db/
│   └── seed.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Step 0.2 — Configure Package Metadata

Edit `package.json`:

```json
{
  "name": "@od-labs/payload-pagetypes",
  "version": "0.0.1",
  "description": "Payload CMS plugin for enforcing page types and block restrictions",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "keywords": [
    "payload",
    "cms",
    "plugin",
    "page-types",
    "hierarchy"
  ]
}
```

Update the main export in `src/index.ts`:

```ts
export const pageTypesPlugin = (pluginConfig) => (config) => {
  // Implementation in Phase 2
  return config
}

export type { PluginConfig } from './types'
```

---

## Step 0.3 — Install Dependencies

```bash
npm install
```

Verify dev environment starts:

```bash
npm run dev
```

You should see:

```
Payload CMS v3 started
http://localhost:3000/admin
```

Log in with template credentials (check `/dev/seed.ts`).

---

## Step 0.4 — Understand Template Structure

### `/src` — Plugin Code

Your plugin implementation goes here.

```
src/
├── index.ts              ← Plugin entry point
├── types.ts              ← TypeScript interfaces
├── enhanceCollection.ts  ← Collection enhancement logic
├── hooks.ts              ← Validation hooks
├── resolveRootPageType.ts ← Core utility
└── admin/
    ├── FilteredBlocksField.tsx
    └── Widget.tsx
```

### `/dev` — Local Payload App

This is a complete Payload CMS app for testing your plugin.

```
dev/
├── payload.config.ts     ← Registers plugin
├── collections/
│   └── Pages.ts          ← Test collection
└── seed.ts               ← Demo data
```

---

## Step 0.5 — Wire Plugin into Dev App

Edit `dev/payload.config.ts`:

```ts
import { pageTypesPlugin } from '../src'

export default buildConfig({
  collections: [Pages],

  plugins: [
    pageTypesPlugin({
      collectionSlug: 'pages',
      pageTypes: [
        { slug: 'services', label: 'Services', required: true },
        { slug: 'legal', label: 'Legal', required: true }
      ],
      restrictions: [
        { block: 'hero', allowedPageTypes: ['services'] }
      ],
      enforceRootSlug: true
    })
  ]
})
```

This will fail until Phase 2 implements the plugin export properly. That's fine — you'll circle back.

---

## Step 0.6 — Create Pages Collection (if not exists)

Create `dev/collections/Pages.ts`:

```ts
import { CollectionConfig } from 'payload'

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true
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
          label: 'Hero',
          fields: [
            { name: 'title', type: 'text', required: true }
          ]
        },
        {
          slug: 'testimonials',
          label: 'Testimonials',
          fields: [
            { name: 'items', type: 'array', fields: [...] }
          ]
        }
      ]
    }
  ]
}
```

Register in `payload.config.ts`:

```ts
import { Pages } from './collections/Pages'

export default buildConfig({
  collections: [Pages],
  // ...
})
```

---

## Step 0.7 — Add TypeScript Types File

Create `src/types.ts`:

```ts
export type PageType = {
  slug: string
  label: string
  required?: boolean
}

export type BlockRestriction = {
  block: string
  allowedPageTypes: string[]
}

export type PluginConfig = {
  collectionSlug: string
  pageTypes: PageType[]
  restrictions?: BlockRestriction[]
  enforceRootSlug?: boolean
}

export type PluginOptions = PluginConfig
```

---

## Step 0.8 — Verify Setup

Build the plugin:

```bash
npm run build
```

No errors = you're ready for Phase 1.

---

## Checklist

- [ ] Cloned plugin template
- [ ] Updated `package.json` with plugin name
- [ ] Installed dependencies
- [ ] Dev environment runs (`npm run dev`)
- [ ] Pages collection created in `/dev`
- [ ] Plugin entry configured in `payload.config.ts`
- [ ] Types file created
- [ ] Build completes without errors

---

## Next

→ Phase 1: Core Logic (`resolveRootPageType`, hooks)