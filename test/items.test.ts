import { describe, expect, test } from "bun:test";
import {
  base,
  ui,
  block,
  hook,
  lib,
  page,
  file,
  style,
  theme,
  component,
  font,
  item,
} from "../src/factories/items.ts";

describe("item factories set the correct registry type", () => {
  test.each([
    ["base", base, "registry:base"],
    ["ui", ui, "registry:ui"],
    ["block", block, "registry:block"],
    ["hook", hook, "registry:hook"],
    ["lib", lib, "registry:lib"],
    ["page", page, "registry:page"],
    ["file", file, "registry:file"],
    ["style", style, "registry:style"],
    ["theme", theme, "registry:theme"],
    ["component", component, "registry:component"],
    ["item", item, "registry:item"],
  ] as const)("%s", (_name, factory, expected) => {
    const item = factory({ name: "x", files: [] });
    expect(item.type).toBe(expected);
  });

  test("font uses registry:font", () => {
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
  });
});
