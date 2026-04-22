import { schema } from "../../../src/index.ts";

const button = schema.ui({
  name: "button",
  files: [schema.files.ui("@/components/ui/button.tsx")],
});

const hero = schema.block({
  name: "hero",
  files: [schema.files.block("@/components/blocks/hero.tsx")],
  registryDependencies: ["$button"],
});

export default schema.registry({
  name: "basic",
  homepage: "https://example.com",
  items: [button, hero],
});
