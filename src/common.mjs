export function parseArgs(args) {
    const options = {};
    for (const arg of args) {
        if (arg.startsWith("--program=")) {
            options.program = arg.split("=")[1];
        }
        if (arg.startsWith("--wifi")) {
            options.wiFiUpload = true;
        }
        if (arg.startsWith("--ip")) {
            options.ip = arg.split("=")[1];
        }
        if (arg.startsWith("--code")) {
            options.code = arg.split("=")[1];
        }
    }
    return options;
}