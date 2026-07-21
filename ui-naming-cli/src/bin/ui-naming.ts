#!/usr/bin/env node

import { runCli } from "../cli";

void (async () => {
  try {
    process.exitCode = await runCli(process.argv.slice(2));
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
})();
