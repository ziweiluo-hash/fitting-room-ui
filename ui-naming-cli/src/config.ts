import * as fs from "node:fs";
import * as path from "node:path";
import { DEFAULT_CONFIG_FILE, STARTER_CONFIG, TOKEN_KINDS } from "./constants";
import { NameTokenKind, UiNamingConfig } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureStringRecord(value: unknown, field: string, required = true): Record<string, string> {
  if (value === undefined && !required) {
    return {};
  }
  if (!isRecord(value)) {
    throw new Error(`Config field "${field}" must be an object of token-to-description pairs.`);
  }
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string") {
      throw new Error(`Config field "${field}.${key}" must be a string description.`);
    }
    result[key] = entry;
  }
  return result;
}

function ensureStringArray(value: unknown, field: string, required = true): string[] {
  if (value === undefined && !required) {
    return [];
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`Config field "${field}" must be an array of strings.`);
  }
  return [...value];
}

function ensureTokenOrder(value: unknown): NameTokenKind[] {
  const items = ensureStringArray(value, "tokenOrder");
  if (items.length === 0) {
    throw new Error('Config field "tokenOrder" must contain at least one token kind.');
  }
  const seen = new Set<string>();
  const normalized = items.map((item) => {
    if (!TOKEN_KINDS.includes(item as NameTokenKind)) {
      throw new Error(`Unsupported token kind "${item}" in tokenOrder.`);
    }
    if (seen.has(item)) {
      throw new Error(`Duplicate token kind "${item}" found in tokenOrder.`);
    }
    seen.add(item);
    return item as NameTokenKind;
  });
  if (!normalized.includes("role")) {
    throw new Error('Config field "tokenOrder" must include "role".');
  }
  return normalized;
}

export function validateConfig(raw: unknown): UiNamingConfig {
  if (!isRecord(raw)) {
    throw new Error("Config must be a JSON object.");
  }

  const prefix = raw.prefix;
  if (typeof prefix !== "string" || prefix.trim() === "") {
    throw new Error('Config field "prefix" must be a non-empty string.');
  }

  const casing = raw.casing;
  if (casing !== "PascalCase" && casing !== "kebab-case") {
    throw new Error('Config field "casing" must be either "PascalCase" or "kebab-case".');
  }

  const separators = raw.separators;
  if (!isRecord(separators) || (separators.joiner !== "" && separators.joiner !== "-")) {
    throw new Error('Config field "separators.joiner" must be either "" or "-".');
  }

  const rules = raw.rules;
  if (!isRecord(rules)) {
    throw new Error('Config field "rules" must be an object.');
  }
  const enforceKnownTokens = rules.enforceKnownTokens;
  const preventDuplicates = rules.preventDuplicates;
  const requirePrefix = rules.requirePrefix;
  if (
    typeof enforceKnownTokens !== "boolean" ||
    typeof preventDuplicates !== "boolean" ||
    typeof requirePrefix !== "boolean"
  ) {
    throw new Error('Config field "rules" must include boolean enforceKnownTokens, preventDuplicates, and requirePrefix values.');
  }

  const requiredTokens = ensureStringArray(rules.requiredTokens, "rules.requiredTokens").map((item) => {
    if (!["domain", "role", "variant", "state"].includes(item)) {
      throw new Error(`Unsupported required token "${item}" in rules.requiredTokens.`);
    }
    return item as Exclude<NameTokenKind, "prefix">;
  });

  return {
    prefix: prefix.trim(),
    tokenOrder: ensureTokenOrder(raw.tokenOrder),
    casing,
    separators: {
      joiner: separators.joiner as "" | "-"
    },
    domains: ensureStringRecord(raw.domains, "domains"),
    roles: ensureStringRecord(raw.roles, "roles"),
    variants: ensureStringRecord(raw.variants, "variants"),
    states: ensureStringRecord(raw.states, "states"),
    forbiddenWords: ensureStringArray(raw.forbiddenWords, "forbiddenWords"),
    rules: {
      enforceKnownTokens,
      preventDuplicates,
      requirePrefix,
      requiredTokens
    },
    scanning: raw.scanning as UiNamingConfig["scanning"]
  };
}

export function resolveConfigPath(cwd: string, explicitPath?: string): string {
  return explicitPath ? path.resolve(cwd, explicitPath) : path.resolve(cwd, DEFAULT_CONFIG_FILE);
}

export function loadConfig(cwd: string, explicitPath?: string): UiNamingConfig {
  const configPath = resolveConfigPath(cwd, explicitPath);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found at ${configPath}. Run "ui-naming init" to create one.`);
  }
  const raw = fs.readFileSync(configPath, "utf8");
  return validateConfig(JSON.parse(raw));
}

export function createStarterConfig(cwd: string, explicitPath?: string, force = false): string {
  const configPath = resolveConfigPath(cwd, explicitPath);
  if (fs.existsSync(configPath) && !force) {
    throw new Error(`Config file already exists at ${configPath}. Re-run with --force to overwrite it.`);
  }
  fs.writeFileSync(configPath, `${JSON.stringify(STARTER_CONFIG, null, 2)}\n`, "utf8");
  return configPath;
}
