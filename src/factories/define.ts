import { registrySchema } from "shadcn/schema";

import type {
  RegistryItemFile,
  RegistryItem,
  Registry,
  RegistryDefinition,
  FileOpts,
  RegistryItemOf,
} from "../types.ts";
import { resolveDependency } from "../utils.ts";
import { SCHEMA_URL } from "../consts.ts";

const resolvePath = (path: string) =>
  path.startsWith("@/") ? "src/" + path.slice(2) : path;

export function defineItem<T extends RegistryItem["type"]>(type: T) {
  return (item: Omit<RegistryItemOf<T>, "type">): RegistryItemOf<T> =>
    ({ ...item, type }) as RegistryItemOf<T>;
}

export function defineFile<T extends RegistryItemFile["type"]>(type: T) {
  type Rest =
    T extends FileOpts<T> ? [opts: FileOpts<T>] : [opts?: FileOpts<T>];

  return (
    path: string,
    ...rest: Rest
  ): Extract<RegistryItemFile, { type: T }> =>
    ({
      path: resolvePath(path),
      type,
      ...(rest[0] as FileOpts<T> | undefined),
    }) as Extract<RegistryItemFile, { type: T }>;
}

export function defineRegistry(registry: RegistryDefinition): Registry {
  const { homepage, registries, items, ...rest } = registry;

  const names = new Set<string>();

  for (const item of items) {
    if (names.has(item.name)) {
      throw new Error(`[registry] duplicate item name "${item.name}"`);
    }
    names.add(item.name);
  }

  const resolved = items.map((item) => {
    const deps = item.registryDependencies;

    if (!deps?.length) return item;

    return {
      ...item,
      registryDependencies: deps.map((dep) =>
        resolveDependency(dep, {
          itemName: item.name,
          names,
          homepage,
          registries,
        }),
      ),
    } satisfies RegistryItem;
  }) as [RegistryItem, ...RegistryItem[]];

  const built: Registry = {
    $schema: SCHEMA_URL,
    name: rest.name,
    homepage,
    items: resolved,
  };

  const parsed = registrySchema.safeParse(built);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");

    throw new Error(`[registry] invalid registry shape:\n${details}`);
  }

  return built;
}
