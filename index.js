#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");
const simpleGit = require("simple-git");

const args = process.argv.slice(2);

// --version
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

const targetDir = path.join(process.cwd(), projectName);

if (fs.existsSync(targetDir)) {
  console.error(`ERROR: Folder "${projectName}" already exists.`);
  process.exit(1);
}

// Create a temp directory
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ev5-templates-"));
const repoUrl = "https://github.com/JMRMEDEV/ev5-dev-tools-templates.git";

console.log("📦 Downloading templates...");
simpleGit()
  .clone(repoUrl, tempDir)
  .then(() => {
    const templatesPath = path.join(tempDir, "templates");
    const commonDir = path.join(templatesPath, "common");
    const selectedTemplateDir = path.join(templatesPath, templateName);

    if (!fs.existsSync(selectedTemplateDir)) {
      console.error(`ERROR: Template "${templateName}" not found.`);
      process.exit(1);
    }

    // Copy function
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

    // Create the new project directory and copy files
    copyRecursive(commonDir, targetDir);
    copyRecursive(selectedTemplateDir, targetDir);

    console.log(`✅ Created project in ./${projectName} using template "${templateName}"`);

    // Optional cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  })
  .catch((err) => {
    console.error("❌ Failed to clone templates:", err.message);
    process.exit(1);
  });
