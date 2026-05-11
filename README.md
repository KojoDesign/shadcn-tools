<div align="center">
  <img src="logo.svg" width="48px" alt="shadcn logo" />

  <br/>

# shadcn-tools

  Type-safe helpers and a CLI for building [shadcn registries](https://ui.schema.com/docs/registry).
</div>

## Why?

While [shadcn/ui](https://ui.shadcn.com) is a fantastic tool for distributing design systems, having to manually maintain `.json` files alongside your components can subject to falling out of sync with your codebase. This repo contains small utilities to make it easier to author typesafe registries schemas directly alongside the components they reference.

## How It Works

Each component in your shadcn registry will have a `.registry.ts` sidecar file alongside it that declares its schema and dependencies. They look something like this:

```ts
// src/components/ui/button.registry.ts
import { schema } from "@kojodesign/shadcn-tools";

export default schema.ui({
  name: "button",
  files: [schema.files.ui("@/components/ui/button.tsx")],
  dependencies: ["lucide-react"],
  registryDependencies: ["button", "$utils"],
});
```

Unlike the standard JSON approach shadcn/ui recommends, there are some additional benefits here:

1. Items can live alongside their components as opposed to a single `registry.json`, making them easier to discover and update in one place. 
2. Less scaffolding by having type-safe helpers that automatically inject the correct item type fields
3. Automatic TypeScript path resolution

There are also some custom shortcuts to make your life easier when authoring these files:

1. **Prefix any `registryDependency` with `$` to reference a component from your own registry.** This will automatically resolve to the full qualified remote path of your item at build time using your provided registry URL.
2. **Reference any registry by namespace by adding it to the root `registries` field in `registry.ts`.** By default, namespaced (and non-namespaced) registry dependencies will be resolved against the shadcn upstream. If you are using another internal registry or one not published on the official shadcn website, you can alias it to avoid writing out a full `.json` path.
3. **Included agent skills for maintenance.** This repo includes pre-made skill files you can hand to your agent to automatically audit and update your registry items once you modified any component.

Once your items are defined, you can import them into your root `registry.ts`, which the `build-registry` command uses to discover your items:

```ts
// src/registry.ts
import { schema } from "@kojodesign/shadcn-tools";

schema.registry({
  name: "my-registry",
  homepage: "https://mine.example.com",
  registries: { other: "https://other.example.com/r/{name}.json" },
  items: [
    schema.ui({
      name: "fancy-button",
      files: [schema.files.ui("@/components/ui/fancy-button.tsx")],
      registryDependencies: ["$utils", "@other/card"],
    }),
  ],
});
```

**Note:** If a custom registry does _not_ include a `{name}` placeholder in the URL, it will default to appending `/r/{name}.json` to the URL per shadcn convention.

## Install

This project assumes you already have a recent version of the `shadcn` CLI installed, as well as TypeScript (though it should work with plain JavaScript, too).

```bash
bun add @kojodesign/shadcn-tools
yarn add @kojodesign/shadcn-tools
npm install @kojodesign/shadcn-tools
pnpm install @kojodesign/shadcn-tools
```

## Utility Reference

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

## CLI

```bash
build-registry <path/to/registry.(ts|js)> [-o <output-dir>]
```

You can add a `build:registry` alias to your `package.json`:

```json 
{
  "scripts": {
    "build:registry": "build-registry src/registry.ts -o public/r"
  }
}
```

Running this command does a few things:

1. Loads the registry file and resolved aliases via [jiti](https://github.com/unjs/jiti)
2. Writes `registry.json` next to the input file
3. If `-o` is provided, runs `shadcn build` immediately afterwards to produce individual item JSON files from the main registry.json

## Agent Skills

This package includes an `update-registry` skill for Claude Code that audits `.registry.ts` files — checking dependencies, registry dependencies, file arrays, style/CSS sync, and missing sidecar files. Install it into any project that uses `@kojodesign/shadcn-tools:

```bash
npx skills add @kojodesign/shadcn-tools
```

Then use it in Claude Code with `/update-registry` or by asking Claude to audit your registry files.

## License

MIT
