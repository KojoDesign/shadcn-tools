import { CROSS_REGISTRY_REGEX, LOCAL_IDENTIFIER } from "./consts.ts";

function ensureTrailingSlash(url: string) {
  return url.endsWith("/") ? url : url + "/";
}

export function joinUrl(base: string, path: string) {
  return new URL(path.replace(/^\//, ""), ensureTrailingSlash(base)).toString();
}

export function resolveDependency(
  dep: string,
  ctx: {
    itemName: string;
    names: Set<string>;
    homepage: string;
    registries?: Record<string, string>;
  },
): string {
  // @registry/name — cross-registry reference
  const match = dep.match(CROSS_REGISTRY_REGEX);

  if (match) {
    const [, reg, name] = match as unknown as [string, string, string];
    const base = ctx.registries?.[reg] ?? ctx.registries?.[`@${reg}`];

    // Unknown — pass through for shadcn's upstream resolution
    if (!base) return dep;

    return base.includes("{name}")
      ? base.replaceAll("{name}", name)
      : joinUrl(base, `r/${name}.json`);
  }

  // $name — same-registry reference
  if (!dep.startsWith(LOCAL_IDENTIFIER)) return dep;

  const name = dep.slice(1);

  if (!ctx.names.has(name)) {
    throw new Error(
      `[${ctx.itemName}] registryDependency "$${name}" not found in registry items`,
    );
  }

  return joinUrl(ctx.homepage, `r/${name}.json`);
}
