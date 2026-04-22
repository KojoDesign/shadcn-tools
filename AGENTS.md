# AGENTS.md

This file provides guidance to coding agents like Claude Code, Codex, and Cursor when working with code in this repository.

## What This Is

`@kojodesign/shadcn` — a TypeScript library and CLI for building [shadcn registries](https://ui.schema.com/docs/registry). It provides typed helpers for defining registry items and files, resolves inter-registry dependencies, and outputs `registry.json` (optionally running `shadcn build` to produce per-item JSON files).

## Build

Uses **mise** for task orchestration and **bun** for bundling. Requires `mise` installed.

```sh
mise run build        # or: bun run build
```

The build pipeline (defined in `mise.toml`):
1. Bundles `src/index.ts` → `dist/index.js` (library entry)
2. Bundles `bin/build-registry.ts` → `dist/bin/build-registry.js` (CLI entry, with shebang)
3. Runs `tsgo -p tsconfig.build.json` to emit `.d.ts` declaration files
4. `chmod +x` on the CLI output

## Tests

Tests live in `test/` and run with **bun test**:

```sh
mise run test          # or: bun run test / bun test
mise run test:watch    # watch mode
```

Fixtures live in `test/fixtures/`. There are suites for `build-registry`, `files`, `helpers`, `items`, and the public `index`.

## Architecture

**Library (`src/`)** — exported as `@kojodesign/shadcn`:

- `types.ts` — Core types re-exported from `shadcn/schema` plus `Registry`, `RegistryItemFile`, `FileOpts`.
- `helpers.ts` — Factory functions: `defineItem(type)`, `defineFile(type)`, and `defineRegistry(registry)`. `defineRegistry` handles dependency resolution: `$name` for same-registry refs, `@registry/name` for cross-registry refs.
- `items.ts` — Pre-bound item factories (`ui`, `block`, `hook`, `lib`, `style`, `theme`, `component`, `example`, `font`).
- `files.ts` — Pre-bound file factories (`component`, `hook`, `lib`, `ui`, `block`).
- `index.ts` — Public API: re-exports items, `registry` (aliased from `defineRegistry`), and `files` namespace.

**CLI (`bin/build-registry.ts`)** — the `build-registry` binary:

- Usage: `build-registry <path/to/registry.ts> [-o <output-dir>]`
- Loads the registry definition file via **jiti** (supports TypeScript, resolves tsconfig paths as aliases).
- Expects a default export. Named `registry` exports are not supported — use `export default` instead.
- Writes `registry.json` next to the input file.
- If `-o` is given, runs `npx shadcn build` to produce individual item JSON files.

## Key Conventions

- All source uses `.ts` extension imports (`import ... from "./foo.ts"`).
- `@/` paths in registry file definitions are resolved to `src/` prefixes.
- The library is ESM-only (`"type": "module"`).
- Peer dependencies: `shadcn >= 4`, `typescript >= 5`.

## Consumer Usage Patterns

This section documents how downstream registries use the `@kojodesign/shadcn` API, so changes here can be evaluated against real usage.

### Importing

Consumers import as `{ shadcn }`:

```ts
import { shadcn } from "@kojodesign/shadcn";
```

### Sidecar `.registry.ts` Files

Each component, hook, lib, or block in a consuming registry has a sidecar `.registry.ts` file next to its source:

- `src/components/ui/foo.tsx` → `src/components/ui/foo.registry.ts`
- `src/components/blocks/my-block/` → `src/components/blocks/my-block.registry.ts`
- `src/hooks/use-foo.ts` → `src/hooks/use-foo.registry.ts`
- `src/lib/bar.ts` → `src/lib/bar.registry.ts`

### Item Helpers

| Helper | Registry type | Use for |
|--------|--------------|---------|
| `schema.ui(...)` | `registry:ui` | UI components |
| `schema.block(...)` | `registry:block` | Composed blocks |
| `schema.hook(...)` | `registry:hook` | Hooks |
| `schema.lib(...)` | `registry:lib` | Utilities |

### File Helpers

| Helper | Use for |
|--------|---------|
| `schema.files.component(path)` | `.tsx` component files |
| `schema.files.hook(path)` | `.ts` hook files |
| `schema.files.lib(path)` | `.ts` lib files |
| `schema.files.ui(path)` | UI component files |
| `schema.files.block(path)` | Block component files |

### Dependency Conventions

**`registryDependencies`** — references to other registry items:

- `$name` — same-registry item. Resolved at build time to `${homepage}/r/name.json`.
- `@registry/name` — cross-registry reference. Resolved via the `registries` map passed to `schema.registry()`.
- Bare names (e.g., `"button"`) — upstream shadcn base components.

**`dependencies`** — only external npm packages actually imported by the component. Framework peer deps (`react`, `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`) are excluded.

### Registry Aggregation

All `.registry.ts` items are collected into a root `registry.ts` file using `schema.registry()`:

```ts
import { shadcn } from "@kojodesign/shadcn";

export default schema.registry({
  name: "my-registry",
  homepage: "https://example.com",
  registries: { other: "https://other.example.com" },
  items: [
    // ...spread all individual registry item exports
  ],
});
```

The CLI then builds this: `build-registry registry.ts -o public/r`
