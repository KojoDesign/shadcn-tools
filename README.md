# @kojodesign/shadcn

Type-safe helpers and a CLI for building [shadcn registries](https://ui.schema.com/docs/registry).

## Install

```bash
bun add @kojodesign/shadcn
yarn add @kojodesign/shadcn
npm install @kojodesign/shadcn
pnpm install @kojodesign/shadcn
```

Peer dependencies: `shadcn >= 4`, `typescript >= 5`

## Usage

### Define registry items

Create sidecar `.registry.ts` files next to your components:

```ts
// src/components/ui/button.registry.ts
import { schema } from "@kojodesign/shadcn-tools;

export default schema.ui({
  name: "button",
  files: [schema.files.ui("@/components/ui/button.tsx")],
  dependencies: ["lucide-react"],
  registryDependencies: ["$utils"],
});
```

### Item helpers

| Helper                  | Registry type        |
| ----------------------- | -------------------- |
| `schema.ui(...)`        | `registry:ui`        |
| `schema.block(...)`     | `registry:block`     |
| `schema.hook(...)`      | `registry:hook`      |
| `schema.lib(...)`       | `registry:lib`       |
| `schema.component(...)` | `registry:component` |
| `schema.style(...)`     | `registry:style`     |
| `schema.theme(...)`     | `registry:theme`     |
| `schema.font(...)`      | `registry:font`      |
| `schema.base(...)`      | `registry:base`      |
| `schema.page(...)`      | `registry:page`      |
| `schema.file(...)`      | `registry:file`      |
| `schema.item(...)`      | `registry:item`      |

### File helpers

| Helper                                | Use for                 |
| ------------------------------------- | ----------------------- |
| `schema.files.component(path)`        | Component files         |
| `schema.files.ui(path)`               | UI component files      |
| `schema.files.block(path)`            | Block files             |
| `schema.files.hook(path)`             | Hook files              |
| `schema.files.lib(path)`              | Lib/utility files       |
| `schema.files.page(path, { target })` | Route/page files        |
| `schema.files.file(path, { target })` | Misc files (env/config) |

`@/` paths are resolved to `src/` automatically.

### Aggregate into a registry

```ts
// registry.ts
import { schema } from "@kojodesign/shadcn-tools;
import button from "./src/components/ui/button.registry.ts";
import utils from "./src/lib/utils.registry.ts";

export default schema.registry({
  name: "my-registry",
  homepage: "https://my-registry.example.com",
  items: [button, utils],
});
```

### Registry dependencies

- **`$name`** — references another item in the same registry. Resolved to `${homepage}/r/name.json` at build time.
- **`@registry/name`** — cross-registry reference. Resolved via the `registries` map:

  ```ts
  schema.registry({
    name: "my-registry",
    homepage: "https://mine.example.com",
    registries: { other: "https://other.example.com" },
    items: [
      schema.ui({
        name: "fancy-button",
        files: [schema.files.ui("@/components/ui/fancy-button.tsx")],
        registryDependencies: ["$utils", "@other/card"],
      }),
    ],
  });
  ```

- **Bare names** (e.g. `"button"`) — upstream shadcn components, passed through as-is.

## CLI

```bash
build-registry <path/to/registry.(ts|js)> [-o <output-dir>]
```

1. Loads the registry file via jiti (TypeScript and plain JavaScript both supported; tsconfig paths are respected when present)
2. Writes `registry.json` next to the input file
3. If `-o` is provided, runs `shadcn build` to produce individual item JSON files

```bash
# TypeScript
build-registry registry.ts

# Plain JavaScript (ESM)
build-registry registry.js

# Generate registry.json + per-item files in public/r/
build-registry registry.ts -o public/r
```

## Agent Skills

This package includes an `update-registry` skill for Claude Code that audits `.registry.ts` files — checking dependencies, registry dependencies, file arrays, style/CSS sync, and missing sidecar files. Install it into any project that uses `@kojodesign/shadcn-tools:

```bash
npx skills add @kojodesign/shadcn
```

Then use it in Claude Code with `/update-registry` or by asking Claude to audit your registry files.

## License

MIT
