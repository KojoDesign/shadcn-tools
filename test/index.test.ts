import { describe, expect, test } from "bun:test";
import { shadcn } from "../src/index.ts";

describe("public API surface", () => {
  test("exposes item factories on shadcn", () => {
    expect(typeof schema.base).toBe("function");
    expect(typeof schema.ui).toBe("function");
    expect(typeof schema.block).toBe("function");
    expect(typeof schema.hook).toBe("function");
    expect(typeof schema.lib).toBe("function");
    expect(typeof schema.page).toBe("function");
    expect(typeof schema.file).toBe("function");
    expect(typeof schema.style).toBe("function");
    expect(typeof schema.theme).toBe("function");
    expect(typeof schema.component).toBe("function");
    expect(typeof schema.font).toBe("function");
    expect(typeof schema.item).toBe("function");
  });

  test("exposes registry as the defineRegistry helper", () => {
    expect(typeof schema.registry).toBe("function");

    const button = schema.ui({ name: "button", files: [] });
    const reg = schema.registry({
      name: "test",
      homepage: "https://example.com",
      items: [button],
    });

    expect(reg.$schema).toBe("https://ui.schema.com/schema/registry.json");
  });

  test("exposes file factories under schema.files", () => {
    expect(typeof schema.files.component).toBe("function");
    expect(typeof schema.files.hook).toBe("function");
    expect(typeof schema.files.lib).toBe("function");
    expect(typeof schema.files.ui).toBe("function");
    expect(typeof schema.files.block).toBe("function");
    expect(typeof schema.files.page).toBe("function");
    expect(typeof schema.files.file).toBe("function");
    expect(typeof schema.files.theme).toBe("function");
    expect(typeof schema.files.style).toBe("function");
    expect(typeof schema.files.base).toBe("function");
    expect(typeof schema.files.item).toBe("function");
  });

  test("end-to-end: build a tiny registry using the public API", () => {
    const button = schema.ui({
      name: "button",
      files: [schema.files.ui("@/components/ui/button.tsx")],
    });

    const hero = schema.block({
      name: "hero",
      files: [schema.files.block("@/components/blocks/hero.tsx")],
      registryDependencies: ["$button", "@ext/card", "dialog"],
    });

    const reg = schema.registry({
      name: "example",
      homepage: "https://example.com",
      registries: { ext: "https://ext.example.com" },
      items: [button, hero],
    });

    expect(reg).toEqual({
      $schema: "https://ui.schema.com/schema/registry.json",
      name: "example",
      homepage: "https://example.com",
      items: [
        {
          type: "registry:ui",
          name: "button",
          files: [
            {
              path: "src/components/ui/button.tsx",
              type: "registry:ui",
            },
          ],
        },
        {
          type: "registry:block",
          name: "hero",
          files: [
            {
              path: "src/components/blocks/hero.tsx",
              type: "registry:block",
            },
          ],
          registryDependencies: [
            "https://example.com/r/button.json",
            "https://ext.example.com/r/card.json",
            "dialog",
          ],
        },
      ],
    });
  });
});
