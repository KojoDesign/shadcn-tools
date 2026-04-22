import { describe, expect, test } from "bun:test";
import {
  component,
  hook,
  lib,
  ui,
  block,
  page,
  file,
  theme,
  style,
  base,
  item,
} from "../src/factories/files.ts";

describe("file factories set the correct registry type", () => {
  test.each([
    ["component", component, "registry:component"],
    ["hook", hook, "registry:hook"],
    ["lib", lib, "registry:lib"],
    ["ui", ui, "registry:ui"],
    ["block", block, "registry:block"],
    ["theme", theme, "registry:theme"],
    ["style", style, "registry:style"],
    ["base", base, "registry:base"],
    ["item", item, "registry:item"],
  ] as const)("%s", (_name, factory, expected) => {
    const file = factory("@/x.ts");
    expect(file.type).toBe(expected);
    expect(file.path).toBe("src/x.ts");
  });

  test("page requires target", () => {
    const f = page("@/x.ts", { target: "app/x.ts" });
    expect(f.type).toBe("registry:page");
    expect(f.target).toBe("app/x.ts");
  });

  test("file requires target", () => {
    const f = file("@/x.ts", { target: "~/.env" });
    expect(f.type).toBe("registry:file");
    expect(f.target).toBe("~/.env");
  });
});
