# @kojodesign/shadcn

Type-safe helpers and a CLI for building [shadcn registries](https://ui.shadcn.com/docs/registry).

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
import { shadcn } from "@kojodesign/shadcn";

export default shadcn.ui({
  name: "button",
  files: [shadcn.files.ui("@/components/ui/button.tsx")],
  dependencies: ["lucide-react"],
  registryDependencies: ["$utils"],
});
```

### Item helpers

| Helper | Registry type |
| --- | --- |
| `shadcn.ui(...)` | `registry:ui` |
| `shadcn.block(...)` | `registry:block` |
| `shadcn.hook(...)` | `registry:hook` |
| `shadcn.lib(...)` | `registry:lib` |
| `shadcn.component(...)` | `registry:component` |
| `shadcn.style(...)` | `registry:style` |
| `shadcn.theme(...)` | `registry:theme` |
| `shadcn.example(...)` | `registry:example` |
| `shadcn.font(...)` | `registry:font` |

### File helpers

| Helper | Use for |
| --- | --- |
| `shadcn.files.component(path)` | Component files |
| `shadcn.files.ui(path)` | UI component files |
| `shadcn.files.block(path)` | Block files |
| `shadcn.files.hook(path)` | Hook files |
| `shadcn.files.lib(path)` | Lib/utility files |

`@/` paths are resolved to `src/` automatically.

### Aggregate into a registry

```ts
// registry.ts
import { shadcn } from "@kojodesign/shadcn";
import button from "./src/components/ui/button.registry.ts";
import utils from "./src/lib/utils.registry.ts";

export default shadcn.registry({
  name: "my-registry",
  homepage: "https://my-registry.example.com",
  items: [button, utils],
});
```

### Registry dependencies

- **`$name`** — references another item in the same registry. Resolved to `${homepage}/r/name.json` at build time.
- **`@registry/name`** — cross-registry reference. Resolved via the `registries` map:

  ```ts
  shadcn.registry({
    name: "my-registry",
    homepage: "https://mine.example.com",
    registries: { other: "https://other.example.com" },
    items: [
      shadcn.ui({
        name: "fancy-button",
        files: [shadcn.files.ui("@/components/ui/fancy-button.tsx")],
        registryDependencies: ["$utils", "@other/card"],
      }),
    ],
  });
  ```

- **Bare names** (e.g. `"button"`) — upstream shadcn components, passed through as-is.

## CLI

```bash
build-registry <path/to/registry.ts> [-o <output-dir>]
```

1. Loads the registry file (TypeScript supported via jiti, respects tsconfig paths)
2. Writes `registry.json` next to the input file
3. If `-o` is provided, runs `shadcn build` to produce individual item JSON files

```bash
# Just generate registry.json
build-registry registry.ts

# Generate registry.json + per-item files in public/r/
build-registry registry.ts -o public/r
```

## Agent Skills

This package includes an `update-registry` skill for Claude Code that audits `.registry.ts` files — checking dependencies, registry dependencies, file arrays, style/CSS sync, and missing sidecar files. Install it into any project that uses `@kojodesign/shadcn`:

```bash
npx skills add @kojodesign/shadcn
```

Then use it in Claude Code with `/update-registry` or by asking Claude to audit your registry files.

## License

MIT
