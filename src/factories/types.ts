import type { RegistryItem } from "shadcn/schema";

export type { RegistryItem };

export type RegistryItemFile = NonNullable<RegistryItem["files"]>[number];

export type FileOpts = Omit<RegistryItemFile, "path" | "type">;

export interface Registry {
  $schema: string;
  name: string;
  homepage?: string;
  registries?: Record<string, string>;
  items: RegistryItem[];
}
