import { afterEach, describe, expect, test } from "bun:test";
import { readFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const cli = resolve(repoRoot, "bin/build-registry.ts");

interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runCli(args: string[]): Promise<RunResult> {
  const proc = Bun.spawn({
    cmd: ["bun", "run", cli, ...args],
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { exitCode, stdout, stderr };
}

const generated: string[] = [];

afterEach(async () => {
  await Promise.all(
    generated.splice(0).map((p) => rm(p, { force: true, recursive: true })),
  );
});

describe("build-registry CLI", () => {
  test("writes registry.json next to the input (default export)", async () => {
    const fixture = resolve(here, "fixtures/basic/registry.ts");
    const out = resolve(here, "fixtures/basic/registry.json");
    generated.push(out);

    const result = await runCli([fixture]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("→");
    expect(result.stdout).toContain("registry.json");

    const json = JSON.parse(await readFile(out, "utf8"));

    expect(json).toEqual({
      $schema: "https://ui.schema.com/schema/registry.json",
      name: "basic",
      homepage: "https://example.com",
      items: [
        {
          type: "registry:ui",
          name: "button",
          files: [
            { path: "src/components/ui/button.tsx", type: "registry:ui" },
          ],
        },
        {
          type: "registry:block",
          name: "hero",
          files: [
            { path: "src/components/blocks/hero.tsx", type: "registry:block" },
          ],
          registryDependencies: ["https://example.com/r/button.json"],
        },
      ],
    });
  });

  test("rejects a file that only has a named `registry` export", async () => {
    const fixture = resolve(here, "fixtures/only-named-export/registry.ts");
    const result = await runCli([fixture]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/No default export/);
  });

  test("accepts a plain JavaScript registry file", async () => {
    const fixture = resolve(here, "fixtures/plain-js/registry.js");
    const out = resolve(here, "fixtures/plain-js/registry.json");
    generated.push(out);

    const result = await runCli([fixture]);

    expect(result.exitCode).toBe(0);

    const json = JSON.parse(await readFile(out, "utf8"));
    expect(json.name).toBe("plain-js");
    expect(json.homepage).toBe("https://example.com");
    expect(json.items).toHaveLength(1);
    expect(json.items[0].name).toBe("button");
    expect(json.items[0].type).toBe("registry:ui");
  });

  test("resolves tsconfig path aliases when loading the registry", async () => {
    const fixture = resolve(here, "fixtures/tsconfig-paths/registry.ts");
    const out = resolve(here, "fixtures/tsconfig-paths/registry.json");
    generated.push(out);

    const result = await runCli([fixture]);

    expect(result.exitCode).toBe(0);

    const json = JSON.parse(await readFile(out, "utf8"));
    expect(json.name).toBe("from-alias");
    expect(json.items).toHaveLength(1);
  });

  test("exits non-zero when no input path is given", async () => {
    const result = await runCli([]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/Usage:/);
  });

  test("exits non-zero when the file has no default export", async () => {
    const fixture = resolve(here, "fixtures/no-export/registry.ts");
    const result = await runCli([fixture]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/No default export/);
  });

  test("ends the output file with a trailing newline", async () => {
    const fixture = resolve(here, "fixtures/named-export/registry.ts");
    const out = resolve(here, "fixtures/named-export/registry.json");
    generated.push(out);

    const result = await runCli([fixture]);
    expect(result.exitCode).toBe(0);

    const contents = await readFile(out, "utf8");
    expect(contents.endsWith("\n")).toBe(true);
  });

  test("exits non-zero when the registry export is schema-invalid (empty items)", async () => {
    const fixture = resolve(here, "fixtures/invalid-empty-items/registry.ts");
    const result = await runCli([fixture]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/Invalid registry export/);
    expect(result.stderr).toMatch(/non-empty array/);
  });

  test("exits non-zero when an item has an invalid type (schema-enforced)", async () => {
    const fixture = resolve(here, "fixtures/invalid-bad-type/registry.ts");
    const result = await runCli([fixture]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/Invalid registry export/);
    expect(result.stderr).toMatch(/items\.0\.type/);
  });

  test("exits non-zero when homepage is missing (schema-enforced)", async () => {
    const fixture = resolve(
      here,
      "fixtures/invalid-missing-homepage/registry.ts",
    );
    const result = await runCli([fixture]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/Invalid registry export/);
    expect(result.stderr).toMatch(/homepage/);
  });

  test("exits non-zero when name is the wrong type (schema-enforced)", async () => {
    const fixture = resolve(
      here,
      "fixtures/invalid-wrong-name-type/registry.ts",
    );
    const result = await runCli([fixture]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/Invalid registry export/);
    expect(result.stderr).toMatch(/name/);
  });

  test("exits non-zero when the registry builder throws (duplicate names)", async () => {
    const fixture = resolve(
      here,
      "fixtures/invalid-duplicate-names/registry.ts",
    );
    const result = await runCli([fixture]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/Failed to load registry file/);
    expect(result.stderr).toMatch(/duplicate item name/);
  });
});
