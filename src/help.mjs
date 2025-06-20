export function help() {
    console.log("Usage:");
    console.log("  ev5-dev-tools create <project-name> [--template=<template-name>]");
    console.log("      Create a new project with an optional template (default is 'default').");
    console.log("");
    console.log("  ev5-dev-tools build [--program=<program-name>]");
    console.log("      Compile the specified program (default is 'main').");
    console.log("");
    console.log("  ev5-dev-tools upload [--program=<program-name>]");
    console.log("      Upload the compiled binary to the EV5 USB device.");
    console.log("");
    console.log("  ev5-dev-tools --version");
    console.log("      Show the CLI version.");
}

