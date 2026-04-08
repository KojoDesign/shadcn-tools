import type {
  FileOpts,
  RegistryItemFile,
  RegistryItem,
  Registry,
} from "./types.ts";

const resolvePath = (path: string) =>
  path.startsWith("@/") ? "src/" + path.slice(2) : path;

type RegistryFontItem = Extract<RegistryItem, { type: "registry:font" }>;
type RegistryBaseItem = Exclude<RegistryItem, { type: "registry:font" }>;

type RegistryItemByType<T extends RegistryItem["type"]> =
  T extends "registry:font" ? RegistryFontItem : RegistryBaseItem;

export const defineItem =
  <T extends RegistryItem["type"]>(type: T) =>
  (item: Omit<RegistryItemByType<T>, "type">): RegistryItemByType<T> =>
    ({ ...item, type }) as RegistryItemByType<T>;

export const defineFile =
  (type: RegistryItemFile["type"]) =>
  (path: string, opts?: FileOpts): RegistryItemFile =>
    ({ path: resolvePath(path), type, ...opts }) as RegistryItemFile;

export function defineRegistry(registry: Omit<Registry, "$schema">): Registry {
  const { homepage, registries, items } = registry;

  const names = new Set(items.map((i) => i.name));

  const resolved = items.map((item) => {
    const deps = (item as { registryDependencies?: string[] })
      .registryDependencies;

    if (!deps?.length) return item;

    return {
      ...item,
      registryDependencies: deps.map((dep) => {
        // @registry/name — cross-registry reference
        if (dep.startsWith("@") && !dep.startsWith("@/")) {
          const raw = dep.slice(1);
          const slashIdx = raw.indexOf("/");

          if (slashIdx === -1) return dep;

          const reg = raw.slice(0, slashIdx);
          const name = raw.slice(slashIdx + 1);

          // Known sister registry — resolve to its URL
          if (registries?.[reg]) {
            return `${registries[reg]}/r/${name}.json`;
          }

          // Unknown — pass through for shadcn's upstream resolution
          return dep;
        }

        // $name — same-registry reference
        if (!dep.startsWith("$")) return dep;

        const name = dep.slice(1);

        if (!names.has(name)) {
          throw new Error(
            `[${item.name}] registryDependency "$${name}" not found in registry items`,
          );
        }

        if (!homepage) {
          throw new Error(
            `[${item.name}] cannot resolve "$" deps without a homepage`,
          );
        }

        return `${homepage}/r/${name}.json`;
      }),
    } as RegistryItem;
  });

  const { registries: _, ...output } = registry;

  return {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    ...output,
    items: resolved,
  };
}
