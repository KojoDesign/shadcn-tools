import type { RegistryItem } from "shadcn/schema";

export type { RegistryItem };

export type RegistryItemFile = NonNullable<RegistryItem["files"]>[number];

export type RegistryItemFileType = RegistryItemFile["type"];

type NarrowByType<U, T> = U extends infer R
  ? R extends { type: infer V }
    ? T extends V
      ? Omit<R, "type"> & { type: T }
      : never
    : never
  : never;

export type RegistryItemFileOf<T extends RegistryItemFileType> = NarrowByType<RegistryItemFile, T>;

export type FileOpts<T extends RegistryItemFileType = RegistryItemFileType> = Omit<
  RegistryItemFileOf<T>,
  "path" | "type"
>;

export interface Registry {
  $schema: string;
  name: string;
  homepage: string;
  items: [RegistryItem, ...RegistryItem[]];
}

// Input shape accepted by `schema.registry(...)`.
// `registries` is an authoring-time convenience and is stripped from output.
export interface RegistryDefinition extends Omit<Registry, "$schema"> {
  registries?: Record<string, string>;
}

export type RegistryItemOf<T extends RegistryItem["type"]> = NarrowByType<RegistryItem, T>;
