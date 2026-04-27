# Payload Page Types Plugin (@od-labs/payload-pagetypes)

A Payload CMS v3 plugin that enforces structured page types, hierarchical consistency, and block-level restrictions.

## Project Overview

This project provides a robust content governance layer for Payload CMS. It allows developers to define strict root-level page types (e.g., `services`, `legal`) that are automatically inherited by all descendant pages. It also enables block-level restrictions, ensuring only contextually relevant content is added to specific page types.

### Key Features
- **Hierarchical Inheritance:** Child pages automatically inherit their `pageType` from the root ancestor.
- **Root Enforcement:** Prevents duplicate roots per page type and protects required roots from deletion.
- **Block Restrictions:** Restricts specific blocks to specific page types, enforced at both the UI and server levels.
- **Cycle Detection:** Prevents circular parent relationships during root resolution.
- **Health Widget:** A modular dashboard widget that identifies missing or duplicate root pages.
- **Reactive UI:** Custom field components and block filtering that respond live to page type changes.

## Tech Stack
- **Framework:** Payload CMS v3, Next.js 15+
- **Language:** TypeScript
- **Database:** SQLite (Development/Testing)
- **Styling:** Vanilla CSS, SCSS
- **Testing:** Vitest (Integration), Playwright (E2E)
- **Build Tools:** SWC, TSC, copyfiles

## Building and Running

### Development
- `pnpm dev`: Runs the development Next.js server (targeting the `/dev` directory).
- `pnpm dev:payload`: Runs the Payload CLI with the development config.
- `pnpm generate:all`: Generates both the import map and TypeScript types for the dev environment.

### Testing
- `pnpm test`: Runs all tests (Integration + E2E).
- `pnpm test:int`: Runs integration tests using Vitest.
- `pnpm test:e2e`: Runs end-to-end tests using Playwright.

### Production Build
- `pnpm build`: Cleans the `dist` directory and builds the project using SWC and TSC.
- `pnpm build:swc`: Transpiles source code to JS using SWC.
- `pnpm build:types`: Generates TypeScript declaration files.

## Development Conventions

### Structure
- `src/`: Core logic and plugin implementation.
  - `admin/`: Admin panel components (Widgets, Views).
  - `components/`: Shared UI components (Server and Client).
  - `exports/`: Entry points for client-side and server-side usage.
- `dev/`: Development environment for testing the plugin in a real Payload project.
- `dev-docs/`: Incremental documentation for project phases.

### Standards
- **Source of Truth:** Server-side hooks (`beforeValidate`, `beforeDelete`) are the primary enforcement mechanism.
- **Progressive Enhancement:** Admin UI enhancements (like block filtering) are designed to fail gracefully.
- **Type Safety:** Strict TypeScript usage with proper Payload types.
- **Atomic Hooks:** Always pass the `req` object to Local API calls within hooks to ensure transaction safety and context preservation.
- **Cycle Safety:** Root resolution logic must always include cycle detection and iteration limits.

### Naming Conventions
- Hooks: `create[HookName]Hook` (e.g., `createBeforeValidateHook`).
- Components: PascalCase (e.g., `PageTypeField`).
- Config: `PluginConfig`, `PageType`, `BlockRestriction`.

## Core Logic Patterns

### Root Resolution
The plugin walks up the `parent` chain to find the absolute root of a page hierarchy. This root determines the `pageType` for all its descendants. If a cycle or broken hierarchy is detected, validation fails.

### Block Filtering
Blocks can declare `allowedPageTypes` in their `custom` config. The plugin extracts these and uses Payload's `filterOptions` to dynamically restrict the blocks available in the `layout` field based on the page's current `pageType`.
