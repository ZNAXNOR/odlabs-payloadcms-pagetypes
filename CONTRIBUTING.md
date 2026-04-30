# Contributing

## Local development

1. Copy `dev/.env.example` to `dev/.env`.
2. Install dependencies with `pnpm install`.
3. Start the template with `pnpm dev`.
4. Sign in at `http://localhost:3000/admin` with `dev@payloadcms.com` / `test`.

The local app uses SQLite by default, so no extra database service is required.

## Project Structure

| File | Purpose |
|------|---------|
| `src/index.ts` | Plugin entry point |
| `src/enhanceCollection.ts` | Injects field, hooks, admin overrides |
| `src/resolveRootPageType.ts` | Resolves root safely (cycle + corruption safe) |
| `src/hooks.ts` | Core validation + deletion logic |
| `src/admin/components/` | Admin UI components (Field overrides, Widgets) |

## Implementation Roadmap

1. **Hooks (`src/hooks.ts`)** — Implement validation logic for save/delete.
2. **Collection Enhancement (`src/enhanceCollection.ts`)** — Inject `pageType` field.
3. **Blocks Override** — UI-level filtering in admin panel.
4. **Nested Docs Integration** — Ensure compatibility with `@payloadcms/plugin-nested-docs`.
5. **Admin Widget** — Health checks and quick creation actions.

## Core Logic & Architecture

### Root Resolution
- Walks parent chain to the absolute root.
- Detects circular references and iteration limits.
- Handles missing or deleted nodes explicitly.
- The root node is always authoritative for the entire branch's `pageType`.

### Validation Guarantees
- No duplicate roots per `pageType`.
- No invalid block configurations (checked against root `pageType`).
- No broken or circular hierarchies.
- No silent data corruption during saves.


## Working conventions

- Keep `website/` as donor reference only. Make implementation changes inside `plugin/`.
- Treat `dev/` as the branded preview app for the plugin package, not as a second independent product.
- Keep sample content lean. Bootstrap seed should stay minimal and idempotent.
- New sample content must remain optional behind the existing env flags.
- Do not reintroduce the removed donor plugins unless that is a deliberate template feature.

## Regenerating generated files

Run this after schema or admin component changes:

```bash
pnpm generate:all
```
## Tests

Run the full suite before opening a release or publish PR:

```bash
pnpm test:int
```

```bash
pnpm test:e2e
```

```bash
pnpm lint
```

## Publish checklist

Before publishing a package draft, update:

- `package.json` package metadata
- self-import package name references inside `dev/`
- runtime metadata env values used by the dashboard preview
- README installation and usage examples

## Pull requests

Please keep pull requests focused and include:

- a short summary of user-facing changes
- any env or migration implications
- test coverage notes
- screenshots when dashboard or frontend visuals changed
