---
name: update-registry
description: Use when asked to audit, check, or validate .registry.ts files. Verifies registry files have correct dependencies, registryDependencies, and files arrays relative to their source .tsx/.ts files. Also detects components missing registry files, ensures all items are wired into the root registry.ts, and syncs style registry files against their CSS sources.
---

# Update Registry

Audits `.registry.ts` sidecar files against their source files and validates correctness of `dependencies`, `registryDependencies`, and `files`. Also checks for components missing `.registry.ts` files, verifies they are wired into the root `registry.ts`, and syncs style registry files against their CSS sources.

## Step 0: Discover Project Layout

Before auditing, determine the project structure:

1. Find the root `registry.ts` file (the one that calls `schema.registry()`).
2. From its imports, identify the source directories for components, blocks, hooks, libs, and styles.
3. Identify the `components.json` or shadcn config to understand the `@/` path alias mapping.
4. Locate any style registry files (e.g., `global.registry.ts`) and their corresponding CSS files.

Use these discovered paths throughout the remaining steps — do not assume any fixed directory structure.

## Step 1: Check for Missing Registry Files

Scan for source files that are **missing** a `.registry.ts` sidecar. Only report missing files for sources **added or modified on the current branch** (`git diff --name-only origin/main...HEAD`). Pre-existing unchanged files are out of scope.

### UI components

List all `.tsx` files in the UI components directory. Check that each has a corresponding `.registry.ts` sidecar. Exclude sub-components that are only imported by a sibling with its own registry file.

### Blocks

List all subdirectories in the blocks directory. Check that each has a corresponding `.registry.ts` file at `<blocks-dir>/<block-name>.registry.ts`.

### Hooks and libs

Check hook and lib directories for `.ts` files missing `.registry.ts` sidecars.

### Cross-reference with registry.ts

For each existing `.registry.ts` file, verify it is imported and listed in the root `registry.ts`. Report any that exist on disk but are not wired into the registry.

Report all findings:

```
## Missing Registry Files

### Components missing .registry.ts
- src/components/ui/mention.tsx — no mention.registry.ts found

### Blocks missing .registry.ts
- src/components/blocks/home/ — no home.registry.ts found

### Registry files not wired into registry.ts
- src/components/ui/foo.registry.ts — exists but not imported in registry.ts

### All registry files accounted for ✓
```

If any are missing, create them following the project's conventions before continuing.

## Step 2: Find Changed Registry Files

```bash
git diff --name-only origin/main...HEAD -- "*.registry.ts"
```

This returns only `.registry.ts` files added or modified on the current branch.

## Step 3: For Each Registry File

Read the `.registry.ts` file to extract:

- `files` — array of file helper calls (`schema.files.component(...)`, `schema.files.hook(...)`, etc.)
- `dependencies` — npm packages listed
- `registryDependencies` — local `$name` refs and external names

Then read **all source files** referenced by that registry item.

For **blocks** (`schema.block`), also scan the entire block directory for any `.tsx`/`.ts` files not yet listed in `files`.

## Step 4: Analyze Source File Imports

For every source file, extract all import statements and classify them:

### npm `dependencies`

External package imports (not `@/` paths, not in the exclusion list). These must appear in the `.registry.ts` `dependencies` array.

**Excluded packages** — never list these as npm `dependencies`:

| Package                                      | Reason                        |
| -------------------------------------------- | ----------------------------- |
| `react`, `react-dom`                         | Framework peer dep            |
| `radix-ui`, `@radix-ui/*`                    | Peer dep via shadcn           |
| `class-variance-authority`                   | Available via shadcn          |
| `clsx`, `tailwind-merge`                     | Come via `$utils`             |
| `@kojodesign/shadcn-tools                    | Build tool, not a runtime dep |
| Imports from sibling files in same block dir | Internal to the block         |

Check the project's `package.json` `peerDependencies` for any additional exclusions specific to the consumer.

### `registryDependencies` (local `$` refs)

`@/` path alias imports map to local registry items using the `$name` shorthand. The name is derived from the filename (without extension) or directory name:

| Import pattern           | Registry dep |
| ------------------------ | ------------ |
| `@/components/ui/<name>` | `$<name>`    |
| `@/lib/<name>`           | `$<name>`    |
| `@/hooks/<name>`         | `$<name>`    |

**Block-internal imports are excluded** — if two files are both in the same block directory and both listed in `files`, imports between them do not need a `$` dep.

### Upstream override detection

When a component **shares the same name as an official upstream shadcn component** (e.g., a local `field.tsx` overrides shadcn's `field`), it is an **upstream override**. For these components:

1. Add the **bare name** (no `$`) to `registryDependencies` — e.g., `"field"`, `"label"`, `"alert"`. This tells the shadcn CLI to install the upstream base first, then apply the override.
2. **Skip npm `dependencies`** that the upstream component already brings in (e.g., Radix primitives, lucide-react icons used by the upstream). Only list npm packages unique to the override.

```ts
// field.registry.ts — overrides upstream shadcn "field"
registryDependencies: ["field", "$utils", "$label"];
//                     ^^^^^^^ bare name = upstream override
```

### `files` array completeness (blocks only)

For `schema.block` items, every `.tsx` and `.ts` file inside the block directory must appear in `files`. Check the directory on disk against what's listed.

## Step 5: Report Issues

For each registry file, produce a structured report:

```
## <registry-file-name>

### Missing npm dependencies
- "lucide-react" (imported in message.tsx)

### Missing registryDependencies
- "$pill" (imported via @/components/ui/pill in card.tsx)

### Extra dependencies (not imported in source)
- "date-fns" (listed but not imported anywhere)

### Missing files (blocks only)
- src/components/blocks/my-block/types.ts

### No issues found ✓
```

## Step 6: Apply Fixes

After the report, show the corrected `.registry.ts` content for any file that has issues, and apply the fixes directly.

## Step 7: Sync Style Registry Files Against CSS

Always check style registry files (e.g., `global.registry.ts`) against their corresponding CSS source files, **regardless of whether they appear in the git diff**.

Read both the CSS file and its `.registry.ts` sidecar. The registry's `cssVars` must reflect the CSS exactly:

| CSS location                   | Registry key           |
| ------------------------------ | ---------------------- |
| `@theme inline { --foo: val }` | `cssVars.theme["foo"]` |
| `:root { --foo: val }`         | `cssVars.light["foo"]` |
| `.dark { --foo: val }`         | `cssVars.dark["foo"]`  |

**What to include:** Custom design tokens only — text sizes, radius overrides, shadows, fonts, semantic color tokens (`--success`, `--warning`, `--brand`, `--highlight`), and any other custom CSS variables defined directly in the CSS.

**What to exclude from `theme`:** Tailwind v4 color utility mappings (e.g., `--color-background: var(--background)`) — these are standard Tailwind boilerplate, not registry tokens.

Report issues using the same format as Step 5:

```
## global.registry.ts

### Missing from cssVars.theme
- "radius-sm": "calc(var(--radius) - 4px)" (in @theme inline)
- "shadow-sm-soft": "..." (in @theme inline)

### Missing from cssVars.light
- "success": "var(--color-emerald-600)" (in :root)

### Missing from cssVars.dark
- "success": "var(--color-emerald-400)" (in .dark)

### No issues found ✓
```

Then apply fixes directly.

## Step 8: Build Verification

After all fixes have been applied, run the project's build command to confirm nothing was missed. Check the project's `package.json` scripts or `mise.toml` for the appropriate build command.

If the build fails, diagnose the error and fix it. Common causes:

- A `.registry.ts` file references a source file that doesn't exist
- A registry item is imported in `registry.ts` but its file is missing or has a syntax error
- Missing `registryDependencies` that the build resolver can't find
- Duplicate imports in `registry.ts`

Re-run the build after each fix until it succeeds. Only report the audit as complete once the build passes.

## Tips

- When checking blocks, scan ALL files in the block directory — not just `index.tsx`
- `$utils` is almost always required (for `cn()`)
- A component importing from `@/components/ui/foo` always needs `$foo`, even if it seems obvious
- Blocks with many files often miss internal `.ts` type files in the `files` array
- Step 1 (missing registry files), Step 7 (style sync), and Step 8 (build verification) must ALWAYS run, even if no registry files were changed on the branch
