import { shadcn } from "../../../src/index.ts";

export default schema.registry({
  name: "named",
  homepage: "https://example.com",
  items: [schema.ui({ name: "button", files: [] })],
});
