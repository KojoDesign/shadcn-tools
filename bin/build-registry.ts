import { writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parseArgs } from "node:util";
import { createJiti } from "jiti";
import { getTsconfig } from "get-tsconfig";
import { $ } from "execa";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    output: { type: "string", short: "o" },
  },
  allowPositionals: true,
});

const input = positionals[0];

if (!input) {
  console.error(
    "Usage: build-registry <path/to/registry.ts> [-o <output-dir>]",
  );
  process.exit(1);
}

const abs = resolve(input);
const registryDir = dirname(abs);
const registryJson = resolve(registryDir, "registry.json");

// Read tsconfig paths and convert to jiti alias format
const alias: Record<string, string> = {};
const tsconfig = getTsconfig(registryDir);

if (tsconfig) {
  const tsconfigDir = dirname(tsconfig.path);
  const paths = tsconfig.config.compilerOptions?.paths;

  if (paths) {
    for (const [key, targets] of Object.entries(paths)) {
      const target = targets?.[0];
  
      if (target) {
        alias[key.replace(/\*$/, "")] = resolve(
          tsconfigDir,
          target.replace(/\*$/, ""),
        );
      }
    }
  }
}

process.chdir(registryDir);

const jiti = createJiti(abs, { moduleCache: false, alias });
const mod = await jiti.import(abs);
const registry = (mod as Record<string, unknown>).default ?? (mod as Record<string, unknown>).registry;

if (!registry) {
  console.error(`No default or "registry" export found in ${input}`);
  process.exit(1);
}

await writeFile(registryJson, JSON.stringify(registry, null, 2) + "\n");

console.log(
  `✔ Wrote ${(registry as { items: unknown[] }).items.length} items → ${registryJson}`,
);

// If -o is provided, run shadcn build to produce the individual JSON files
if (values.output) {
  const outDir = resolve(values.output);
  await $`npx shadcn build ${registryJson} -o ${outDir} -c ${registryDir}`;
}
