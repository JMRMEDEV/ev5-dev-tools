export function parseArgs(args) {
    const options = {};
    for (const arg of args) {
        if (arg.startsWith("--program=")) {
            options.program = arg.split("=")[1];
        }
    }
    return options;
}