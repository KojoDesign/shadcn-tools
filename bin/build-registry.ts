import { writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parseArgs } from "node:util";
import { createJiti } from "jiti";
import { getTsconfig } from "get-tsconfig";
import { $ } from "execa";
import { detect } from "package-manager-detector/detect";
import { resolveCommand } from "package-manager-detector/commands";
import { registrySchema } from "shadcn/schema";

function die(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseArguments() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: { output: { type: "string", short: "o" } },
    allowPositionals: true,
  });

  const input = positionals[0];
  if (!input) {
    die("Usage: build-registry <path/to/registry.(ts|js)> [-o <output-dir>]");
  }

  return { input, output: values.output };
}

function loadAliases(dir: string): Record<string, string> {
  const tsconfig = getTsconfig(dir);
  if (!tsconfig) return {};

  const paths = tsconfig.config.compilerOptions?.paths;
  if (!paths) return {};

  const tsconfigDir = dirname(tsconfig.path);
  const alias: Record<string, string> = {};

  for (const [key, targets] of Object.entries(paths)) {
    const target = targets?.[0];
    if (!target) continue;

    alias[key.replace(/\*$/, "")] = resolve(
      tsconfigDir,
      target.replace(/\*$/, ""),
    );
  }

  return alias;
}

async function loadRegistryModule(
  absPath: string,
  displayPath: string,
  alias: Record<string, string>,
): Promise<Record<string, unknown>> {
  const jiti = createJiti(absPath, { moduleCache: false, alias });

  try {
    return await jiti.import(absPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    die(`Failed to load registry file: ${displayPath}\n${msg}`);
  }
}

function validateRegistry(registry: unknown, displayPath: string) {
  const parsed = registrySchema.safeParse(registry);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");

    die(`Invalid registry export in ${displayPath}:\n${details}`);
  }

  if (parsed.data.items.length < 1) {
    die(
      `Invalid registry export in ${displayPath}: "items" must be a non-empty array`,
    );
  }

  return parsed.data;
}

async function buildJSON(
  registryJson: string,
  outDir: string,
  registryDir: string,
) {
  const pm = await detect({ cwd: registryDir });
  const agent = pm?.agent ?? "npm";

  const resolved = resolveCommand(agent, "execute-local", [
    "shadcn",
    "build",
    registryJson,
    "-o",
    outDir,
    "-c",
    registryDir,
  ]);

  if (!resolved) {
    die(`Unable to resolve a package manager command for "${agent}".`);
  }

  try {
    await $({ stdio: "inherit" })`${resolved.command} ${resolved.args}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(msg);
    die(
      `\nFailed to run "shadcn build". Ensure "shadcn" is installed in this project (it is a peer dependency).`,
    );
  }
}

async function main() {
  const { input, output } = parseArguments();

  const absInput = resolve(input);
  const registryDir = dirname(absInput);
  const registryJson = resolve(registryDir, "registry.json");

  process.chdir(registryDir);

  const alias = loadAliases(registryDir);
  const mod = await loadRegistryModule(absInput, input, alias);

  if (!Object.hasOwn(mod, "default")) {
    die(`No default export found in ${input}`);
  }

  const registry = mod.default;

  const parsed = validateRegistry(registry, input);

  await writeFile(registryJson, JSON.stringify(registry, null, 2) + "\n");

  console.log(
    `\x1b[32m✔\x1b[39m Wrote ${parsed.items.length} items → ${registryJson}`,
  );

  if (output) {
    await buildJSON(registryJson, resolve(output), registryDir);
  }
}

main();
