import { UiNamingConfig } from "./types";

export const DEFAULT_CONFIG_FILE = "ui-naming.config.json";

export const TOKEN_KINDS = ["prefix", "domain", "role", "variant", "state"] as const;

export const STARTER_CONFIG: UiNamingConfig = {
  prefix: "Ui",
  tokenOrder: ["prefix", "domain", "role", "variant", "state"],
  casing: "PascalCase",
  separators: {
    joiner: ""
  },
  domains: {
    Commerce: "Commerce and transaction experiences",
    Admin: "Internal operations and admin tools",
    Marketing: "Acquisition and campaign surfaces"
  },
  roles: {
    Button: "Interactive action trigger",
    Card: "Content container",
    Modal: "Overlay dialog container",
    Input: "User text entry control",
    Table: "Structured data presentation"
  },
  variants: {
    Primary: "Primary emphasis style",
    Secondary: "Secondary emphasis style",
    Quiet: "Low emphasis style"
  },
  states: {
    Active: "Currently active state",
    Disabled: "Unavailable state",
    Empty: "Empty or zero-data state"
  },
  forbiddenWords: [
    "Blue",
    "Red",
    "Green",
    "Round",
    "Rounded",
    "Big",
    "Small",
    "Large"
  ],
  rules: {
    enforceKnownTokens: true,
    preventDuplicates: true,
    requirePrefix: true,
    requiredTokens: ["role"]
  },
  scanning: {
    include: [
      "components/*",
      "components/**/*",
      "src/components/*",
      "src/components/**/*"
    ],
    ignore: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.git/**"
    ],
    extensions: [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".vue"
    ],
    validateDirectories: false
  }
};
