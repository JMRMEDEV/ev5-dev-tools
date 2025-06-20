import { parseArgs } from "./common.mjs";
import { execSync } from "child_process";
import os from "os";
import fs from "fs";
import path from "path";

export function handleUpload(args) {
    const opts = parseArgs(args);
    const program = opts.program || "main";
    const binFile = `${program}.bin`;

    if (!fs.existsSync(binFile)) {
        console.error(`❌ Binary file "${binFile}" not found. Run build first.`);
        process.exit(1);
    }

    let ev5Path;

    if (os.platform() === "win32") {
        try {
            const volOutput = execSync(`powershell "Get-Volume | Where-Object { $_.FileSystemLabel -eq 'EV5' } | Select-Object -ExpandProperty DriveLetter"`).toString().trim();
            ev5Path = `${volOutput}:\\${program}.bin`;
        } catch {
            console.error("❌ Could not locate EV5 USB on Windows.");
            process.exit(1);
        }
    } else if (os.platform() === "darwin") {
        // macOS - look in /Volumes
        const volumes = fs.readdirSync("/Volumes");
        const ev5 = volumes.find(v => v === "EV5");
        if (!ev5) {
            console.error("❌ EV5 USB drive not found on macOS.");
            process.exit(1);
        }
        ev5Path = path.join("/Volumes", ev5, `${program}.bin`);
    } else if (os.platform() === "linux") {
        // Linux - use /media/$USER or /run/media/$USER
        const mountPoints = [
            path.join("/media", os.userInfo().username),
            path.join("/run/media", os.userInfo().username),
        ];
        let found = false;
        for (const mp of mountPoints) {
            if (fs.existsSync(mp)) {
                const volumes = fs.readdirSync(mp);
                const ev5 = volumes.find(v => v === "EV5");
                if (ev5) {
                    ev5Path = path.join(mp, ev5, `${program}.bin`);
                    found = true;
                    break;
                }
            }
        }
        if (!found) {
            console.error("❌ EV5 USB drive not found on Linux.");
            process.exit(1);
        }
    }

    try {
        console.log(`📤 Uploading ${binFile} to EV5 (${ev5Path})...`);
        fs.copyFileSync(binFile, ev5Path);
        console.log("✅ Upload complete.");
    } catch (err) {
        console.error("❌ Upload failed:", err.message);
        process.exit(1);
    }
}
