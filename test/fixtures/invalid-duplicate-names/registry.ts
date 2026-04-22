import { shadcn } from "../../../src/index.ts";

const a = schema.ui({ name: "button", files: [] });
const b = schema.ui({ name: "button", files: [] });

export default schema.registry({
  name: "duplicate-names",
  homepage: "https://example.com",
  items: [a, b],
});
