import { execSync } from "child_process";
import { parseArgs } from "./common.mjs";
import fs from 'fs';
import path from "path";

export function handleBuild(args) {
    const opts = parseArgs(args);
    const program = opts.program || "main";

    const sdkInclude = process.env.EV5_SDK + "/includeRTOSEV5";
    const objectDir = `${sdkInclude}/o`;
    const linkerScript = `${objectDir}/stm32_flash.ld`;

    const cc = "arm-none-eabi-gcc";
    const objcopy = "arm-none-eabi-objcopy";

    try {
        console.log(`🔨 Compiling ${program}.c...`);
        execSync(`${cc} -I${sdkInclude} -mcpu=cortex-m3 -mthumb -Os -fsigned-char -w -gdwarf-2 -DF_CPU=72000000UL -std=gnu99 -c ${program}.c -o ${program}.o`, { stdio: "inherit" });

        console.log("🔗 Linking...");
        const supportObjs = fs.readdirSync(objectDir).filter(f => f.endsWith(".o")).map(f => `"${path.join(objectDir, f)}"`).join(" ");
        execSync(`${cc} -mcpu=cortex-m3 -mthumb -L${objectDir} -T${linkerScript} -Wl,--gc-sections -Wl,-Map=${program}.map,-cref ${supportObjs} ${program}.o -lm -o ${program}.elf`, { stdio: "inherit" });

        console.log("📦 Creating binary...");
        execSync(`${objcopy} -O binary ${program}.elf ${program}.bin`, { stdio: "inherit" });

        console.log("🧹 Cleaning up...");
        ["o", "elf", "map"].forEach(ext => {
            const f = `${program}.${ext}`;
            if (fs.existsSync(f)) fs.unlinkSync(f);
        });

        console.log(`✅ Build complete: ${program}.bin`);
    } catch (err) {
        console.error("❌ Build failed:", err.message);
        process.exit(1);
    }
}
