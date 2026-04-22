import { schema } from "../../../src/index.ts";

export const registry = schema.registry({
  name: "only-named",
  homepage: "https://example.com",
  items: [schema.ui({ name: "button", files: [] })],
});
