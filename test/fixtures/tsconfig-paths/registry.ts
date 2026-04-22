import { schema } from "../../../src/index.ts";
import { name } from "@lib/name";

export default schema.registry({
  name,
  homepage: "https://example.com",
  items: [schema.ui({ name: "button", files: [] })],
});
