#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);

// Handle --version
if (args.includes("--version") || args.includes("-v")) {
  const pkg = require("./package.json");
  console.log(`ev5-dev-tools v${pkg.version}`);
  process.exit(0);
}

const [command, projectName, templateArg] = args;

if (command !== "create" || !projectName) {
  console.log("Usage: ev5-dev-tools create <project-name> [--template=<template-name>]");
  process.exit(1);
}

const templateName = templateArg?.startsWith("--template=")
  ? templateArg.split("=")[1]
  : "default";

const templatesRepoDir = path.resolve(__dirname, "../ev5-dev-tools-templates/templates");
const templateDir = path.join(templatesRepoDir, templateName);
const commonDir = path.join(templatesRepoDir, "common");
const targetDir = path.join(process.cwd(), projectName);

// Recursive copy
function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(targetDir)) {
  console.log(`ERROR: Folder "${projectName}" already exists.`);
  process.exit(1);
}

if (!fs.existsSync(templateDir)) {
  console.log(`ERROR: Template "${templateName}" not found.`);
  process.exit(1);
}

// Copy shared files and then template-specific files
copyRecursive(commonDir, targetDir);
copyRecursive(templateDir, targetDir);

console.log(`✅ Created project in ./${projectName} using template "${templateName}"`);
