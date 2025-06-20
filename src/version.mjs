import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function showVersion() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const pkgPath = path.join(__dirname, "../package.json");

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  console.log(`ev5-dev-tools v${pkg.version}`);
}
