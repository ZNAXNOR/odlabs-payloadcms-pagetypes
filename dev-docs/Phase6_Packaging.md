# Phase 6 — Packaging & Publishing

**Goal:** Prepare plugin for npm publishing

**Status:** Phase 0-5 complete, testing done

**Note:** Publishing is optional. You can use as local plugin indefinitely.

---

## Overview

Phase 6 covers:

1. Build optimization
2. Package metadata
3. Distribution files
4. Publishing to npm
5. Documentation for users

---

## Step 6.1 — Clean Build Output

### Verify build is clean:

```bash
npm run build
```

Should produce:

```
dist/
├── index.js (minified)
├── index.d.ts (types)
├── enhanceCollection.js
├── enhanceCollection.d.ts
├── hooks.js
├── hooks.d.ts
├── resolveRootPageType.js
├── resolveRootPageType.d.ts
├── types.js
├── types.d.ts
└── admin/
    ├── FilteredBlocksField.js
    ├── FilteredBlocksField.d.ts
    ├── Widget.js
    └── Widget.d.ts
```

### Clean dist before publishing:

```bash
rm -rf dist/
npm run build
```

---

## Step 6.2 — Update `package.json`

### Full package.json for publishing:

```json
{
  "name": "@od-labs/payload-pagetypes",
  "version": "1.0.0",
  "description": "Payload CMS plugin for enforcing page types and block restrictions",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/payload-pagetypes.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/payload-pagetypes/issues"
  },
  "homepage": "https://github.com/yourusername/payload-pagetypes#readme",
  "keywords": [
    "payload",
    "cms",
    "plugin",
    "page-types",
    "hierarchy",
    "block-restrictions",
    "content-governance"
  ],
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.js"
    },
    "./admin": {
      "types": "./dist/admin/index.d.ts",
      "import": "./dist/admin/index.js"
    }
  },
  "files": [
    "dist",
    "package.json",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "payload dev",
    "test": "jest",
    "lint": "eslint src",
    "type-check": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test && npm run lint"
  },
  "peerDependencies": {
    "payload": ">=3.0.0",
    "@payloadcms/plugin-nested-docs": ">=1.0.0"
  },
  "devDependencies": {
    "payload": "^3.0.0",
    "@payloadcms/plugin-nested-docs": "^1.0.0",
    "@payloadcms/db-mongodb": "^1.0.0",
    "@payloadcms/richtext-slate": "^1.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}
```

### Key sections:

- **name**: Scoped to `@od-labs` (your npm org)
- **exports**: Named exports for subpaths
- **files**: Only include necessary files (exclude `/dev`, `/src` TypeScript)
- **peerDependencies**: Payload and nested docs are peer deps (user provides)
- **prepublishOnly**: Run checks before publishing

---

## Step 6.3 — Create `.npmignore`

File: `.npmignore`

```
# Development
dev/
src/
.env
.env.local

# Configuration
tsconfig.json
jest.config.js
.eslintrc.js

# Git
.git
.gitignore

# CI/CD
.github/
.gitlab-ci.yml

# Testing
*.test.ts
*.spec.ts
__tests__/
coverage/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Dependencies
node_modules/
.npm
```

---

## Step 6.4 — Create `.npmrc` (for publishing)

File: `.npmrc`

```
# Use npm registry
registry=https://registry.npmjs.org/

# Auto-create git tags on publish
tag-version-prefix=v

# Set access level (public for scoped packages)
access=public
```

---

## Step 6.5 — Update TypeScript Config

### `tsconfig.json` for publishing:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "dev"]
}
```

---

## Step 6.6 — Create Comprehensive README.md

Create public-facing README for npm:

File: `README.md` (replace existing)

```markdown
# @od-labs/payload-pagetypes

A Payload CMS v3 plugin that enforces structured page types, hierarchical consistency, and block-level restrictions.

## Features

- **Page Type System** — Define strict root-level page types with automatic inheritance
- **Block Restrictions** — Restrict specific blocks to specific page types
- **Hierarchy Enforcement** — One root per type, prevent circles, protect required roots
- **Server-Side Validation** — All rules enforced in hooks (source of truth)
- **Admin Block Filtering** — Reactive UI component (with server-side fallback)
- **Structure Health Widget** — Detect missing or duplicate roots with quick actions

## Installation

```bash
npm install @od-labs/payload-pagetypes @payloadcms/plugin-nested-docs
```

## Quick Start

```ts
import { buildConfig } from 'payload'
import { pageTypesPlugin } from '@od-labs/payload-pagetypes'

export default buildConfig({
  collections: [Pages],
  plugins: [
    pageTypesPlugin({
      collectionSlug: 'pages',
      pageTypes: [
        { slug: 'services', label: 'Services', required: true },
        { slug: 'legal', label: 'Legal', required: false }
      ],
      restrictions: [
        { block: 'hero', allowedPageTypes: ['services'] }
      ],
      enforceRootSlug: true
    })
  ]
})
```

## Configuration

### `PluginConfig`

```ts
type PageType = {
  slug: string              // Unique identifier
  label: string             // Admin UI label
  required?: boolean        // Prevent deletion
}

type BlockRestriction = {
  block: string             // Block slug
  allowedPageTypes: string[] // Allowed page type slugs
}

type PluginConfig = {
  collectionSlug: string       // Target collection
  pageTypes: PageType[]        // All page types
  restrictions?: BlockRestriction[]
  enforceRootSlug?: boolean    // Require slug === pageType for roots
}
```

## Behavior

### Root Pages

- Must define `pageType`
- One root per type (no duplicates)
- Optional: slug must match pageType
- Cannot be deleted if required or has children

### Child Pages

- `pageType` never user-editable
- Always inherited from root ancestor
- Safe across deep nesting

### Block Restrictions

- Blocks in restrictions are type-specific
- Blocks not in restrictions are allowed everywhere
- Invalid blocks rejected on save (not hidden)

## API

### `pageTypesPlugin(config: PluginConfig)`

Main plugin export. Returns a Payload plugin function.

```ts
const plugin = pageTypesPlugin({ /* ... */ })
export default buildConfig({
  plugins: [plugin]
})
```

### `resolveRootPageType({ id, req, collectionSlug })`

Programmatically resolve a page's type:

```ts
import { resolveRootPageType } from '@od-labs/payload-pagetypes'

const pageType = await resolveRootPageType({
  id: pageId,
  req: payloadRequest,
  collectionSlug: 'pages'
})
```

Throws on circular parents or missing roots.

## Block Filtering

### Option A: Per-Type Blocks Fields (Recommended)

Separate blocks field for each page type using `admin.condition`:

```ts
// Automatically handled by plugin
// No additional configuration needed
```

### Option B: Info Component

Shows allowed blocks as informational text:

```ts
// Plugin includes fallback info component
// Shown if field injection fails
```

### Option C: Manual

Manage blocks field yourself. Plugin enforces restrictions server-side.

## Migration

For existing pages:

1. Deploy plugin
2. Create root pages for each type via admin
3. Assign parents to existing pages
4. Verify hierarchy is valid
5. Full usage enabled

## Limitations

- Requires Payload v3+
- Single collection per plugin instance
- Block filtering is best-effort (server validation authoritative)
- No GraphQL block restriction support

## Troubleshooting

**"Root page already exists"**
→ Only one root per type allowed. Delete duplicate or change pageType.

**"Cannot delete root with children"**
→ Move or delete child pages first.

**"Circular parent reference"**
→ Check page hierarchy. A page cannot be its own ancestor.

**"Invalid blocks for pageType"**
→ Remove restricted blocks or change pageType.

## Examples

### Create hierarchical pages

```ts
// Root
{ title: 'Services', slug: 'services', pageType: 'services', parent: null }

// Child
{ title: 'Web Design', slug: 'web-design', pageType: 'services', parent: 'services-id' }

// Grandchild
{ title: 'Process', slug: 'process', pageType: 'services', parent: 'web-design-id' }
```

### Restrict blocks per type

```ts
restrictions: [
  { block: 'hero', allowedPageTypes: ['services'] },
  { block: 'testimonials', allowedPageTypes: ['services'] },
  { block: 'legal-notice', allowedPageTypes: ['legal'] }
]
```

### Require specific roots

```ts
pageTypes: [
  { slug: 'services', label: 'Services', required: true },   // Must exist
  { slug: 'blog', label: 'Blog', required: false }           // Optional
]
```

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/payload-pagetypes/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/payload-pagetypes/discussions)
- **Documentation**: [Full Docs](https://github.com/yourusername/payload-pagetypes/wiki)

## License

MIT

## Changelog

### 1.0.0

- Initial release
- Root page enforcement
- Block restrictions
- Admin widget
- Full TypeScript support
```

---

## Step 6.7 — Add License

File: `LICENSE`

```
MIT License

Copyright (c) 2024 OD Labs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE OR OTHERWISE OUT
OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Step 6.8 — Create Admin Subpath Export

Some users may want to import admin components directly.

### Create `src/admin/index.ts`:

```ts
export { FilteredBlocksField } from './FilteredBlocksField'
export { PageTypesWidget } from './Widget'
```

### Update main `src/index.ts` to re-export:

```ts
export const pageTypesPlugin = /* ... */

// Optional admin exports for advanced users
export { FilteredBlocksField, PageTypesWidget } from './admin'

export type { PluginConfig, PluginOptions } from './types'
export { resolveRootPageType } from './resolveRootPageType'
```

Users can then:

```ts
import { pageTypesPlugin } from '@od-labs/payload-pagetypes'
import { PageTypesWidget } from '@od-labs/payload-pagetypes/admin'
```

---

## Step 6.9 — Setup Git Repository

### Initialize git (if not already):

```bash
git init
git remote add origin https://github.com/yourusername/payload-pagetypes.git
```

### Create `.gitignore`:

```
node_modules/
dist/
.env
.env.local
.env.*.local
*.log
.DS_Store
.vscode/
.idea/
coverage/
```

### Initial commit:

```bash
git add .
git commit -m "Initial commit: payload-pagetypes v1.0.0"
git branch -M main
git push -u origin main
```

---

## Step 6.10 — Pre-Publish Checklist

Before publishing to npm:

- [ ] All phases 0-5 complete
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes (if tests exist)
- [ ] `npm run lint` passes
- [ ] `npm run type-check` succeeds
- [ ] README.md is complete and accurate
- [ ] LICENSE file present
- [ ] package.json has correct metadata
- [ ] .npmignore excludes dev files
- [ ] No sensitive data in files
- [ ] Git repository initialized
- [ ] All code committed
- [ ] Version bumped in package.json

---

## Step 6.11 — Create NPM Account (if needed)

```bash
npm adduser
```

You'll be prompted for:
- Username (e.g., `your-npm-username`)
- Password
- Email
- One-time password (if 2FA enabled)

---

## Step 6.12 — Publish to NPM

### Create organization (if using scoped package):

```bash
npm org create od-labs --scope
```

Or create via npm website: https://www.npmjs.com/

### Verify scoped package will be public:

```bash
npm config set access public
```

### Publish:

```bash
npm publish
```

Monitor output:

```
npm notice 📦 @od-labs/payload-pagetypes@1.0.0
npm notice === Tarball Contents ===
npm notice 23.4kB dist/index.js
npm notice 5.2kB  dist/index.d.ts
npm notice (includes package metadata)
npm notice === Tarball Details ===
npm notice name:          @od-labs/payload-pagetypes
npm notice version:       1.0.0
npm notice package size:  35.2 kB
npm notice unpacked size: 128.5 kB
npm notice shasum:        abc123def456...
npm notice integrity:     sha512-abc123...
npm notice total files:   18
npm notice
npm notice 📦 Published!
```

Verify on npm:
https://www.npmjs.com/package/@od-labs/payload-pagetypes

---

## Step 6.13 — Tag Release in Git

```bash
git tag v1.0.0
git push origin v1.0.0
```

Or let npm do it automatically if using `tag-version-prefix`.

---

## Step 6.14 — Update Version for Next Release

```bash
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
```

This:
- Updates package.json
- Creates git commit
- Creates git tag
- Ready to publish next version

---

## Step 6.15 — Future Updates

For subsequent releases:

```bash
# Make changes
git add .
git commit -m "Fix: handle deep nesting better"

# Bump version (automatic git commit + tag)
npm version patch

# Publish
npm publish

# Push updates
git push origin main
git push origin v1.0.1
```

---

## Troubleshooting

**"You must be logged in"**
```bash
npm login
```

**"Package name already exists"**
→ Choose different scoped name: `@your-org/payload-pagetypes`

**"No files included in package"**
→ Check `files` field in package.json and verify build succeeded

**"Types not included"**
→ Verify `declaration: true` in tsconfig.json

**"Peer dependency warning"**
→ Users must install `payload` and `@payloadcms/plugin-nested-docs` separately (expected)

---

## Checklist

- [ ] Build succeeds
- [ ] package.json has correct metadata
- [ ] README.md complete
- [ ] LICENSE file present
- [ ] .npmignore configured
- [ ] tsconfig.json correct
- [ ] Admin exports in place
- [ ] Git initialized and committed
- [ ] NPM account created
- [ ] Scoped organization created (if using)
- [ ] Published to npm
- [ ] Published version verified on npm website
- [ ] Git tag created
- [ ] Documentation links updated

---

## Next Steps

1. **Share** — Share npm link with team
2. **Monitor** — Watch npm download stats
3. **Feedback** — Listen to user issues
4. **Iterate** — Release bug fixes and improvements
5. **Promote** — Add to awesome-payload-plugins

---

## Plugin Published! 🎉

Your plugin is now available for anyone to install:

```bash
npm install @od-labs/payload-pagetypes
```

Welcome to the Payload ecosystem!