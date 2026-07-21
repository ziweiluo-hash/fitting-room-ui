import * as fs from "node:fs";
import * as path from "node:path";
import { LintEntryResult, UiNamingConfig } from "./types";
import { validateName } from "./naming";

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegExp(pattern: string): RegExp {
  let regex = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const current = pattern[index];
    const next = pattern[index + 1];
    if (current === "*" && next === "*") {
      regex += ".*";
      index += 1;
      continue;
    }
    if (current === "*") {
      regex += "[^/]*";
      continue;
    }
    regex += escapeRegex(current);
  }
  return new RegExp(`^${regex}$`);
}

function shouldInclude(relPath: string, patterns: string[] | undefined): boolean {
  return !patterns || patterns.length === 0 || patterns.some((pattern) => globToRegExp(pattern).test(relPath));
}

function shouldIgnore(relPath: string, patterns: string[] | undefined): boolean {
  return Boolean(patterns && patterns.some((pattern) => globToRegExp(pattern).test(relPath)));
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function extractNameFromPath(filePath: string, isDirectory: boolean): string {
  const base = path.basename(filePath);
  if (isDirectory) {
    return base;
  }
  const ext = path.extname(base);
  return ext ? base.slice(0, -ext.length) : base;
}

export function lintPath(targetPath: string, config: UiNamingConfig): LintEntryResult[] {
  const absoluteTarget = path.resolve(targetPath);
  const stat = fs.statSync(absoluteTarget);
  const root = stat.isDirectory() ? absoluteTarget : path.dirname(absoluteTarget);
  const results: LintEntryResult[] = [];
  const extensions = new Set(config.scanning?.extensions ?? []);

  const visit = (currentPath: string): void => {
    const currentStat = fs.statSync(currentPath);
    const relative = toPosixPath(path.relative(root, currentPath)) || path.basename(currentPath);
    if (shouldIgnore(relative, config.scanning?.ignore)) {
      return;
    }
    if (currentStat.isDirectory()) {
      if (config.scanning?.validateDirectories && shouldInclude(relative, config.scanning?.include)) {
        const name = extractNameFromPath(currentPath, true);
        results.push({ path: currentPath, name, result: validateName(config, name) });
      }
      for (const child of fs.readdirSync(currentPath)) {
        visit(path.join(currentPath, child));
      }
      return;
    }
    if (extensions.size > 0 && !extensions.has(path.extname(currentPath))) {
      return;
    }
    if (!shouldInclude(relative, config.scanning?.include)) {
      return;
    }
    const name = extractNameFromPath(currentPath, false);
    results.push({ path: currentPath, name, result: validateName(config, name) });
  };

  if (stat.isDirectory()) {
    visit(absoluteTarget);
  } else {
    const name = extractNameFromPath(absoluteTarget, false);
    results.push({ path: absoluteTarget, name, result: validateName(config, name) });
  }
  return results;
}
