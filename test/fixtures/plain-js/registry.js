import { shadcn } from "../../../src/index.ts";

const button = schema.ui({
  name: "button",
  files: [schema.files.ui("@/components/ui/button.tsx")],
});

export default schema.registry({
  name: "plain-js",
  homepage: "https://example.com",
  items: [button],
});
