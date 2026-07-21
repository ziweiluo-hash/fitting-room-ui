import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createStarterConfig, loadConfig, validateConfig } from "../src/config";

test("validateConfig accepts the starter config shape", () => {
  const config = validateConfig({
    prefix: "Ui",
    tokenOrder: ["prefix", "domain", "role", "variant", "state"],
    casing: "PascalCase",
    separators: { joiner: "" },
    domains: { Commerce: "Commerce" },
    roles: { Button: "Button" },
    variants: { Primary: "Primary" },
    states: { Active: "Active" },
    forbiddenWords: ["Blue"],
    rules: {
      enforceKnownTokens: true,
      preventDuplicates: true,
      requirePrefix: true,
      requiredTokens: ["role"]
    }
  });
  assert.equal(config.prefix, "Ui");
});

test("validateConfig rejects invalid casing", () => {
  assert.throws(
    () =>
      validateConfig({
        prefix: "Ui",
        tokenOrder: ["role"],
        casing: "camelCase",
        separators: { joiner: "" },
        domains: {},
        roles: { Button: "Button" },
        variants: {},
        states: {},
        forbiddenWords: [],
        rules: {
          enforceKnownTokens: true,
          preventDuplicates: true,
          requirePrefix: true,
          requiredTokens: ["role"]
        }
      }),
    /casing/
  );
});

test("createStarterConfig writes a loadable config file", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-naming-config-"));
  createStarterConfig(tempDir);
  const loaded = loadConfig(tempDir);
  assert.equal(loaded.prefix, "Ui");
});
