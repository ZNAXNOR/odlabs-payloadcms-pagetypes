# How It Works

## Block Restrictions

Blocks declare their own page type restrictions in component config:

### Example Block

```ts
// In Pages collection config
{
  name: 'layout',
  type: 'blocks',
  blocks: [
    {
      slug: 'hero',
      label: 'Hero',
      allowedPageTypes: ['services'],  // ← Block declares this
      fields: [
        { name: 'title', type: 'text' },
        { name: 'image', type: 'upload' }
      ]
    }
  ]
}
```

### How Plugin Uses It

When enhanceCollection runs:
1. Scans all blocks in layout field
2. Finds blocks with allowedPageTypes property
3. Extracts into restrictions array
4. Uses restrictions for validation

### Result

Block and restriction are co-located.
Single source of truth.
Easy to modify — change block config, restriction updates automatically.

## Database

This project uses **SQLite** for development.

- Database file: `./dev/payload.db`
- CLI: `sqlite3 dev/payload.db`
- Queries: `SELECT * FROM pages WHERE slug = 'services';`
