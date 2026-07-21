import * as path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createStarterConfig, loadConfig } from "./config";
import { lintPath } from "./fs-utils";
import { generateName, validateName } from "./naming";
import { CandidateInput, CliOptions, ValidationIssue } from "./types";

function parseArgs(argv: string[]): { command?: string; positionals: string[]; options: CliOptions } {
  const [command, ...rest] = argv;
  const positionals: string[] = [];
  const options: CliOptions = {};
  const readOptionValue = (option: string, nextValue: string | undefined): string => {
    if (!nextValue || nextValue.startsWith("--")) {
      throw new Error(`Missing value for option "${option}".`);
    }
    return nextValue;
  };

  for (let index = 0; index < rest.length; index += 1) {
    const current = rest[index];
    if (!current.startsWith("--")) {
      positionals.push(current);
      continue;
    }
    switch (current) {
      case "--config":
        options.configPath = readOptionValue(current, rest[index + 1]);
        index += 1;
        break;
      case "--force":
        options.force = true;
        break;
      case "--interactive":
        options.interactive = true;
        break;
      case "--domain":
        options.domain = readOptionValue(current, rest[index + 1]);
        index += 1;
        break;
      case "--role":
        options.role = readOptionValue(current, rest[index + 1]);
        index += 1;
        break;
      case "--variant":
        options.variant = readOptionValue(current, rest[index + 1]);
        index += 1;
        break;
      case "--state":
        options.state = readOptionValue(current, rest[index + 1]);
        index += 1;
        break;
      default:
        throw new Error(`Unknown option "${current}".`);
    }
  }

  return { command, positionals, options };
}

function renderIssues(label: string, issues: ValidationIssue[]): string[] {
  return issues.map((issue) => `- ${label} ${issue.code}${issue.token ? ` [token: ${issue.token}]` : ""}: ${issue.message}${issue.suggestion ? ` Suggestion: ${issue.suggestion}.` : ""}`);
}

function printHelp(): void {
  console.log(`UI Naming CLI

Usage:
  ui-naming init [--config <path>] [--force]
  ui-naming generate --role <value> [--domain <value>] [--variant <value>] [--state <value>] [--interactive]
  ui-naming lint <path> [--config <path>]
  ui-naming explain <name> [--config <path>]`);
}

async function collectGenerateInput(options: CliOptions): Promise<CandidateInput> {
  const provided: CandidateInput = {
    domain: options.domain,
    role: options.role,
    variant: options.variant,
    state: options.state
  };
  if (!options.interactive && provided.role) {
    return provided;
  }
  const rl = readline.createInterface({ input, output });
  try {
    if (!provided.domain) {
      provided.domain = (await rl.question("Domain (optional): ")).trim() || undefined;
    }
    if (!provided.role) {
      provided.role = (await rl.question("Role (required): ")).trim() || undefined;
    }
    if (!provided.variant) {
      provided.variant = (await rl.question("Variant (optional): ")).trim() || undefined;
    }
    if (!provided.state) {
      provided.state = (await rl.question("State (optional): ")).trim() || undefined;
    }
  } finally {
    rl.close();
  }
  return provided;
}

async function runInit(cwd: string, options: CliOptions): Promise<number> {
  console.log(`Created starter config at ${createStarterConfig(cwd, options.configPath, options.force)}`);
  return 0;
}

async function runGenerate(cwd: string, options: CliOptions): Promise<number> {
  const generated = generateName(loadConfig(cwd, options.configPath), await collectGenerateInput(options));
  console.log(`Generated name: ${generated.name}`);
  for (const [kind, token] of Object.entries(generated.normalizedTokens)) {
    console.log(`- ${kind}: ${token}`);
  }
  return 0;
}

async function runExplain(cwd: string, name: string, options: CliOptions): Promise<number> {
  const result = validateName(loadConfig(cwd, options.configPath), name);
  console.log(`Name: ${name}`);
  console.log(`Valid: ${result.valid ? "yes" : "no"}`);
  if (result.normalizedName) {
    console.log(`Normalized: ${result.normalizedName}`);
  }
  console.log("Segments:");
  for (const segment of result.parsedSegments) {
    console.log(`- ${segment.raw} -> ${segment.kind}`);
  }
  for (const line of renderIssues("error", result.errors)) {
    console.log(line);
  }
  for (const line of renderIssues("warning", result.warnings)) {
    console.log(line);
  }
  return result.valid ? 0 : 1;
}

async function runLint(cwd: string, target: string, options: CliOptions): Promise<number> {
  const entries = lintPath(path.resolve(cwd, target), loadConfig(cwd, options.configPath));
  const failed = entries.filter((entry) => !entry.result.valid);
  for (const entry of entries) {
    console.log(`${entry.result.valid ? "PASS" : "FAIL"} ${entry.path}`);
    for (const line of renderIssues("error", entry.result.errors)) {
      console.log(line);
    }
    for (const line of renderIssues("warning", entry.result.warnings)) {
      console.log(line);
    }
  }
  console.log(`Summary: scanned ${entries.length} item(s), ${entries.length - failed.length} passed, ${failed.length} failed.`);
  return failed.length === 0 ? 0 : 1;
}

export async function runCli(argv: string[], cwd = process.cwd()): Promise<number> {
  const { command, positionals, options } = parseArgs(argv);
  switch (command) {
    case "init":
      return runInit(cwd, options);
    case "generate":
      return runGenerate(cwd, options);
    case "explain":
      if (!positionals[0]) {
        throw new Error('Missing required argument <name> for "explain".');
      }
      return runExplain(cwd, positionals[0], options);
    case "lint":
      if (!positionals[0]) {
        throw new Error('Missing required argument <path> for "lint".');
      }
      return runLint(cwd, positionals[0], options);
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      return 0;
    default:
      throw new Error(`Unknown command "${command}".`);
  }
}
