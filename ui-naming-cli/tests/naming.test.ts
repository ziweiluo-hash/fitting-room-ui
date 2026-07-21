import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { STARTER_CONFIG } from "../src/constants";
import { lintPath } from "../src/fs-utils";
import { generateName, validateName } from "../src/naming";

test("generateName is deterministic", () => {
  const generated = generateName(STARTER_CONFIG, {
    domain: "Commerce",
    role: "Button",
    variant: "Primary",
    state: "Active"
  });
  assert.equal(generated.name, "UiCommerceButtonPrimaryActive");
});

test("validateName reports wrong order and duplicate tokens", () => {
  const result = validateName(STARTER_CONFIG, "Commerce-Ui-Button-Button");
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((entry) => entry.code === "WRONG_ORDER"));
  assert.ok(result.errors.some((entry) => entry.code === "DUPLICATE_TOKEN"));
});

test("lintPath scans configured files", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-naming-lint-"));
  const componentsDir = path.join(tempDir, "components");
  fs.mkdirSync(componentsDir, { recursive: true });
  fs.writeFileSync(path.join(componentsDir, "UiCommerceButton.tsx"), "export {};\n", "utf8");
  fs.writeFileSync(path.join(componentsDir, "BlueButton.tsx"), "export {};\n", "utf8");
  const results = lintPath(tempDir, STARTER_CONFIG);
  assert.equal(results.length, 2);
  assert.equal(results.filter((entry) => !entry.result.valid).length, 1);
});
