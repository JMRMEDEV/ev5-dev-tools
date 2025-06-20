#!/usr/bin/env node

import { handleBuild } from "./src/build.mjs";
import { createProject } from "./src/create.mjs";
import { help } from "./src/help.mjs";
import { handleUpload } from "./src/upload.mjs";
import { showVersion } from "./src/version.mjs";

const args = process.argv.slice(2);
const [command, ...restArgs] = args;

if (args.includes("--version") || args.includes("-v")) {
  showVersion();
  process.exit(0);
}

switch (command) {
  case "create": {
    createProject(restArgs);
    break;
  }

  case "build":
    handleBuild(restArgs);
    break;

  case "upload":
    handleUpload(restArgs);
    break;

  case "--version":
  case "-v":
    showVersion();
    break;

  case "--help":
  case "-h":
    help();
    break;

  default:
    console.log("Unknown or missing command.\n");
    help();
    process.exit(1);
}
