import { CandidateInput, NameTokenKind, ParsedSegment, UiNamingConfig, ValidationResult } from "./types";

function splitWords(value: string): string[] {
  return value.trim().replace(/[_\s]+/g, "-").replace(/([a-z0-9])([A-Z])/g, "$1-$2").split("-").map((segment) => segment.trim()).filter(Boolean);
}

function toPascalCase(value: string): string {
  return splitWords(value).map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()).join("");
}

function toKebabCase(value: string): string {
  return splitWords(value).map((segment) => segment.toLowerCase()).join("-");
}

function splitName(name: string): string[] {
  return name.includes("-") ? name.split("-").filter(Boolean) : splitWords(name);
}

function vocabForKind(config: UiNamingConfig, kind: NameTokenKind): string[] {
  switch (kind) {
    case "prefix":
      return [config.prefix];
    case "domain":
      return Object.keys(config.domains);
    case "role":
      return Object.keys(config.roles);
    case "variant":
      return Object.keys(config.variants);
    case "state":
      return Object.keys(config.states);
  }
}

function normalizeForLookup(value: string): string {
  return toPascalCase(value);
}

function getCanonicalToken(value: string, config: UiNamingConfig, kind: NameTokenKind): string | undefined {
  const lookup = normalizeForLookup(value);
  return vocabForKind(config, kind).find((token) => normalizeForLookup(token) === lookup);
}

function uniqueSegments(parts: Array<string | undefined>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    if (!part) {
      continue;
    }
    const normalized = normalizeForLookup(part);
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(part);
  }
  return result;
}

export function composeName(config: UiNamingConfig, input: CandidateInput): string {
  const values: Partial<Record<NameTokenKind, string | undefined>> = {
    prefix: config.prefix,
    domain: input.domain && getCanonicalToken(input.domain, config, "domain"),
    role: input.role && getCanonicalToken(input.role, config, "role"),
    variant: input.variant && getCanonicalToken(input.variant, config, "variant"),
    state: input.state && getCanonicalToken(input.state, config, "state")
  };
  const ordered = uniqueSegments(config.tokenOrder.map((kind) => values[kind]));
  if (config.casing === "PascalCase") {
    return ordered.map((token) => toPascalCase(token)).join(config.separators.joiner);
  }
  return ordered.map((token) => toKebabCase(token)).join(config.separators.joiner || "-");
}

export function generateName(config: UiNamingConfig, input: CandidateInput): {
  name: string;
  normalizedTokens: Partial<Record<NameTokenKind, string>>;
} {
  const normalizedTokens: Partial<Record<NameTokenKind, string>> = {};
  for (const kind of ["domain", "role", "variant", "state"] as const) {
    const value = input[kind];
    if (!value) {
      continue;
    }
    const canonical = getCanonicalToken(value, config, kind);
    if (!canonical) {
      throw new Error(`Unknown ${kind} token "${value}". Add it to the config before generating names.`);
    }
    normalizedTokens[kind] = canonical;
  }
  for (const forbidden of config.forbiddenWords) {
    const hit = Object.values(normalizedTokens).find((value): value is string => typeof value === "string" && normalizeForLookup(value) === normalizeForLookup(forbidden));
    if (hit) {
      throw new Error(`Token "${hit}" is forbidden by config.`);
    }
  }
  for (const required of config.rules.requiredTokens) {
    if (!normalizedTokens[required]) {
      throw new Error(`Missing required token "${required}".`);
    }
  }
  return {
    name: composeName(config, normalizedTokens),
    normalizedTokens
  };
}

export function parseName(config: UiNamingConfig, name: string): ParsedSegment[] {
  return splitName(name).map((segment) => {
    const normalized = toPascalCase(segment);
    const matchedKind = (["prefix", "domain", "role", "variant", "state"] as const).find((kind) => Boolean(getCanonicalToken(segment, config, kind)));
    return {
      raw: segment,
      normalized,
      kind: matchedKind ?? "unknown"
    };
  });
}

function buildSuggestion(config: UiNamingConfig, parsed: ParsedSegment[]): string | undefined {
  const tokenMap: Partial<Record<NameTokenKind, string>> = {};
  for (const segment of parsed) {
    if (segment.kind === "unknown") {
      continue;
    }
    tokenMap[segment.kind] = getCanonicalToken(segment.normalized, config, segment.kind);
  }
  if (config.rules.requirePrefix && !tokenMap.prefix) {
    tokenMap.prefix = config.prefix;
  }
  if (!tokenMap.role) {
    return undefined;
  }
  return composeName(config, tokenMap);
}

export function validateName(config: UiNamingConfig, name: string): ValidationResult {
  const parsed = parseName(config, name);
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];
  const counts = new Map<NameTokenKind, number>();
  const unknownSegments: string[] = [];

  for (const segment of parsed) {
    for (const forbidden of config.forbiddenWords) {
      if (normalizeForLookup(segment.normalized) === normalizeForLookup(forbidden)) {
        errors.push({
          code: "FORBIDDEN_WORD",
          message: `Token "${segment.raw}" is forbidden by config.`,
          token: segment.raw
        });
      }
    }
    if (segment.kind === "unknown") {
      unknownSegments.push(segment.raw);
      continue;
    }
    counts.set(segment.kind, (counts.get(segment.kind) ?? 0) + 1);
  }

  const suggestion = buildSuggestion(config, parsed);
  if (suggestion && suggestion !== name) {
    errors.push({
      code: "BAD_CASING",
      message: `Name does not match the configured ${config.casing} format and token separator rules.`,
      suggestion
    });
  }
  if (config.rules.requirePrefix && !counts.has("prefix")) {
    errors.push({
      code: "MISSING_PREFIX",
      message: `Name must include prefix "${config.prefix}".`,
      suggestion
    });
  }
  for (const required of config.rules.requiredTokens) {
    if (!counts.has(required)) {
      errors.push({
        code: "MISSING_REQUIRED_TOKEN",
        message: `Missing required ${required} token.`,
        token: required,
        suggestion
      });
    }
  }
  if (config.rules.preventDuplicates) {
    for (const [kind, count] of counts.entries()) {
      if (count > 1) {
        errors.push({
          code: "DUPLICATE_TOKEN",
          message: `Token kind "${kind}" appears more than once.`,
          token: kind
        });
      }
    }
  }
  if (config.rules.enforceKnownTokens && unknownSegments.length > 0) {
    errors.push({
      code: "UNKNOWN_TOKEN",
      message: `Unknown token(s): ${unknownSegments.join(", ")}.`,
      token: unknownSegments.join(", "),
      suggestion
    });
  } else if (unknownSegments.length > 0) {
    warnings.push({
      code: "UNKNOWN_TOKEN",
      message: `Unknown token(s): ${unknownSegments.join(", ")}.`
    });
  }

  const actualOrder = parsed.filter((segment): segment is ParsedSegment & { kind: NameTokenKind } => segment.kind !== "unknown").map((segment) => segment.kind);
  const expectedOrder = config.tokenOrder.filter((kind) => counts.has(kind));
  if (actualOrder.join("|") !== expectedOrder.join("|")) {
    errors.push({
      code: "WRONG_ORDER",
      message: `Tokens are out of order. Expected ${expectedOrder.join(" -> ")}.`,
      suggestion
    });
  }

  return {
    valid: errors.length === 0,
    normalizedName: suggestion,
    parsedSegments: parsed,
    errors,
    warnings
  };
}
