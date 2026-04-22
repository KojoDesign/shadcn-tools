import { describe, expect, test } from "bun:test";
import {
  defineItem,
  defineFile,
  defineRegistry,
} from "../src/factories/define.ts";

describe("defineItem", () => {
  test("injects the given type into the item", () => {
    const ui = defineItem("registry:ui");
    const item = ui({ name: "button", files: [] });

    expect(item.type).toBe("registry:ui");
    expect(item.name).toBe("button");
  });

  test("preserves all user-provided fields", () => {
    const block = defineItem("registry:block");
    const item = block({
      name: "hero",
      title: "Hero",
      description: "A hero block",
      dependencies: ["react"],
      registryDependencies: ["button"],
      files: [],
    });

    expect(item).toMatchObject({
      type: "registry:block",
      name: "hero",
      title: "Hero",
      description: "A hero block",
      dependencies: ["react"],
      registryDependencies: ["button"],
    });
  });

  test("works for registry:font (different shape)", () => {
    const font = defineItem("registry:font");
    const item = font({
      name: "geist",
      font: {
        family: "Geist",
        provider: "google",
        import: "Geist",
        variable: "--font-sans",
      },
    });

    expect(item.type).toBe("registry:font");
    expect(item.name).toBe("geist");
  });
});

describe("defineFile", () => {
  test("rewrites leading @/ to src/", () => {
    const component = defineFile("registry:component");
    const file = component("@/components/ui/button.tsx");

    expect(file.path).toBe("src/components/ui/button.tsx");
    expect(file.type).toBe("registry:component");
  });

  test("leaves non-@/ paths untouched", () => {
    const lib = defineFile("registry:lib");
    expect(lib("src/lib/utils.ts").path).toBe("src/lib/utils.ts");
    expect(lib("./relative.ts").path).toBe("./relative.ts");
    expect(lib("/abs/path.ts").path).toBe("/abs/path.ts");
  });

  test("does not rewrite bare @ (without trailing slash)", () => {
    const lib = defineFile("registry:lib");
    expect(lib("@something/pkg.ts").path).toBe("@something/pkg.ts");
  });

  test("merges in opts", () => {
    const component = defineFile("registry:component");
    const file = component("@/x.tsx", {
      target: "components/x.tsx",
      content: "export {}",
    });

    expect(file).toEqual({
      path: "src/x.tsx",
      type: "registry:component",
      target: "components/x.tsx",
      content: "export {}",
    });
  });
});

describe("defineRegistry", () => {
  test("adds the $schema field", () => {
    const reg = defineRegistry({
      name: "r",
      homepage: "https://example.com",
      items: [{ type: "registry:ui", name: "button", files: [] }],
    });
    expect(reg.$schema).toBe("https://ui.schema.com/schema/registry.json");
  });

  test("strips the registries map from the output", () => {
    const reg = defineRegistry({
      name: "r",
      homepage: "https://example.com",
      registries: { other: "https://other.example.com" },
      items: [{ type: "registry:ui", name: "button", files: [] }],
    });

    expect((reg as Record<string, unknown>).registries).toBeUndefined();
  });

  test("preserves name, homepage, and items", () => {
    const reg = defineRegistry({
      name: "r",
      homepage: "https://example.com",
      items: [{ type: "registry:ui", name: "button", files: [] }],
    });

    expect(reg.name).toBe("r");
    expect(reg.homepage).toBe("https://example.com");
    expect(reg.items).toHaveLength(1);
  });

  test("resolves $name deps to `${homepage}/r/name.json`", () => {
    const reg = defineRegistry({
      name: "r",
      homepage: "https://example.com",
      items: [
        { type: "registry:ui", name: "button", files: [] },
        {
          type: "registry:block",
          name: "hero",
          files: [],
          registryDependencies: ["$button"],
        },
      ],
    });

    const hero = reg.items.find((i) => i.name === "hero")!;
    expect(hero.registryDependencies).toEqual([
      "https://example.com/r/button.json",
    ]);
  });

  test("resolves @registry/name via the registries map", () => {
    const reg = defineRegistry({
      name: "r",
      homepage: "https://example.com",
      registries: { ui: "https://ui.example.com" },
      items: [
        {
          type: "registry:block",
          name: "hero",
          files: [],
          registryDependencies: ["@ui/card"],
        },
      ],
    });

    expect(reg.items[0]!.registryDependencies).toEqual([
      "https://ui.example.com/r/card.json",
    ]);
  });

  test("passes through @unknown/name unchanged when registry isn't listed", () => {
    const reg = defineRegistry({
      name: "r",
      homepage: "https://example.com",
      items: [
        {
          type: "registry:block",
          name: "hero",
          files: [],
          registryDependencies: ["@unknown/card"],
        },
      ],
    });

    expect(reg.items[0]!.registryDependencies).toEqual(["@unknown/card"]);
  });

  test("passes through bare deps untouched", () => {
    const reg = defineRegistry({
      name: "r",
      homepage: "https://example.com",
      items: [
        {
          type: "registry:ui",
          name: "hero",
          files: [],
          registryDependencies: ["button", "card"],
        },
      ],
    });

    expect(reg.items[0]!.registryDependencies).toEqual(["button", "card"]);
  });

  test("handles mixed dep kinds in a single item", () => {
    const reg = defineRegistry({
      name: "r",
      homepage: "https://example.com",
      registries: { ui: "https://ui.example.com" },
      items: [
        { type: "registry:ui", name: "button", files: [] },
        {
          type: "registry:block",
          name: "hero",
          files: [],
          registryDependencies: ["$button", "@ui/card", "dialog"],
        },
      ],
    });

    expect(reg.items[1]!.registryDependencies).toEqual([
      "https://example.com/r/button.json",
      "https://ui.example.com/r/card.json",
      "dialog",
    ]);
  });

  test("throws when $name refers to an unknown item", () => {
    expect(() =>
      defineRegistry({
        name: "r",
        homepage: "https://example.com",
        items: [
          {
            type: "registry:block",
            name: "hero",
            files: [],
            registryDependencies: ["$missing"],
          },
        ],
      }),
    ).toThrow(/\$missing.*not found/);
  });

  test("throws when homepage is missing (schema-enforced)", () => {
    expect(() =>
      defineRegistry({
        name: "r",
        // @ts-expect-error runtime guard
        homepage: undefined,
        items: [{ type: "registry:ui", name: "button", files: [] }],
      }),
    ).toThrow(/invalid registry shape[\s\S]*homepage/i);
  });

  test("throws when name is missing (schema-enforced)", () => {
    expect(() =>
      defineRegistry({
        // @ts-expect-error runtime guard
        name: undefined,
        homepage: "https://example.com",
        items: [{ type: "registry:ui", name: "button", files: [] }],
      }),
    ).toThrow(/invalid registry shape[\s\S]*name/i);
  });

  test("throws on an invalid item type (schema-enforced)", () => {
    expect(() =>
      defineRegistry({
        name: "r",
        homepage: "https://example.com",
        items: [
          // @ts-expect-error deliberately invalid type
          { type: "registry:bogus", name: "button", files: [] },
        ],
      }),
    ).toThrow(/invalid registry shape[\s\S]*type/i);
  });

  test("throws on an invalid file type (schema-enforced)", () => {
    expect(() =>
      defineRegistry({
        name: "r",
        homepage: "https://example.com",
        items: [
          {
            type: "registry:ui",
            name: "button",
            files: [
              // @ts-expect-error deliberately invalid file type
              { path: "src/x.tsx", type: "registry:bogus" },
            ],
          },
        ],
      }),
    ).toThrow(/invalid registry shape/i);
  });

  test("accepts registry:font as a root item type", () => {
    expect(() =>
      defineRegistry({
        name: "r",
        homepage: "https://example.com",
        items: [
          {
            type: "registry:font",
            name: "geist",
            font: {
              family: "Geist",
              provider: "google",
              import: "Geist",
              variable: "--font-sans",
            },
          },
        ],
      }),
    ).not.toThrow();
  });

  test("accepts registry:base as a root item type", () => {
    expect(() =>
      defineRegistry({
        name: "r",
        homepage: "https://example.com",
        items: [{ type: "registry:base", name: "reset", files: [] }],
      }),
    ).not.toThrow();
  });

  test("accepts registry:example as a root item type (previously rejected)", () => {
    expect(() =>
      defineRegistry({
        name: "r",
        homepage: "https://example.com",
        items: [
          // @ts-expect-error the top-level union in registrySchema includes example
          { type: "registry:example", name: "demo", files: [] },
        ],
      }),
    ).not.toThrow();
  });

  test("accepts registry:internal as a root item type (previously rejected)", () => {
    expect(() =>
      defineRegistry({
        name: "r",
        homepage: "https://example.com",
        items: [
          // @ts-expect-error the top-level union in registrySchema includes internal
          { type: "registry:internal", name: "dev", files: [] },
        ],
      }),
    ).not.toThrow();
  });

  test("throws on duplicate item names before hitting the schema", () => {
    expect(() =>
      defineRegistry({
        name: "r",
        homepage: "https://example.com",
        items: [
          { type: "registry:ui", name: "button", files: [] },
          { type: "registry:ui", name: "button", files: [] },
        ],
      }),
    ).toThrow(/duplicate item name "button"/);
  });

  test("leaves items without registryDependencies unchanged", () => {
    const source = {
      type: "registry:ui" as const,
      name: "button",
      files: [],
    };

    const reg = defineRegistry({
      name: "r",
      homepage: "https://example.com",
      items: [source],
    });

    // Same reference — no unnecessary cloning of dep-free items.
    expect(reg.items[0]).toBe(source);
  });

  test("treats empty registryDependencies as no deps", () => {
    const source = {
      type: "registry:ui" as const,
      name: "button",
      files: [],
      registryDependencies: [] as string[],
    };

    const reg = defineRegistry({
      name: "r",
      homepage: "https://example.com",
      items: [source],
    });

    expect(reg.items[0]).toBe(source);
  });

  test("passes through malformed @ dep with no slash", () => {
    const reg = defineRegistry({
      name: "r",
      homepage: "https://example.com",
      items: [
        {
          type: "registry:block",
          name: "hero",
          files: [],
          registryDependencies: ["@noslash"],
        },
      ],
    });

    expect(reg.items[0]!.registryDependencies).toEqual(["@noslash"]);
  });

  test("produces a stable JSON shape", () => {
    const reg = defineRegistry({
      name: "r",
      homepage: "https://example.com",
      items: [{ type: "registry:ui", name: "button", files: [] }],
    });

    expect(JSON.parse(JSON.stringify(reg))).toEqual({
      $schema: "https://ui.schema.com/schema/registry.json",
      name: "r",
      homepage: "https://example.com",
      items: [{ type: "registry:ui", name: "button", files: [] }],
    });
  });
});
