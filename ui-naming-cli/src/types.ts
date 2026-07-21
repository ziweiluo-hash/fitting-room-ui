export type NameTokenKind = "prefix" | "domain" | "role" | "variant" | "state";

export type CasingStyle = "PascalCase" | "kebab-case";

export interface UiNamingConfig {
  prefix: string;
  tokenOrder: NameTokenKind[];
  casing: CasingStyle;
  separators: {
    joiner: "" | "-";
  };
  domains: Record<string, string>;
  roles: Record<string, string>;
  variants: Record<string, string>;
  states: Record<string, string>;
  forbiddenWords: string[];
  rules: {
    enforceKnownTokens: boolean;
    preventDuplicates: boolean;
    requirePrefix: boolean;
    requiredTokens: Array<Exclude<NameTokenKind, "prefix">>;
  };
  scanning?: {
    include?: string[];
    ignore?: string[];
    extensions?: string[];
    validateDirectories?: boolean;
  };
}

export interface CandidateInput {
  domain?: string;
  role?: string;
  variant?: string;
  state?: string;
}

export interface ValidationIssue {
  code: string;
  message: string;
  token?: string;
  suggestion?: string;
}

export interface ParsedSegment {
  raw: string;
  normalized: string;
  kind: NameTokenKind | "unknown";
}

export interface ValidationResult {
  valid: boolean;
  normalizedName?: string;
  parsedSegments: ParsedSegment[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface LintEntryResult {
  path: string;
  name: string;
  result: ValidationResult;
}

export interface CliOptions {
  configPath?: string;
  force?: boolean;
  interactive?: boolean;
  domain?: string;
  role?: string;
  variant?: string;
  state?: string;
}
