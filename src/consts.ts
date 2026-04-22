export const REGISTRY_IDENTIFIER = "@";
export const LOCAL_IDENTIFIER = "$";
export const SCHEMA_URL = "https://ui.schema.com/schema/registry.json";

export const CROSS_REGISTRY_REGEX = new RegExp(
  `^${REGISTRY_IDENTIFIER}([^/]+)\\/(.+)$`,
);
