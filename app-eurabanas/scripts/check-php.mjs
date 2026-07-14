import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Engine } from "php-parser";

const root = path.resolve("server-sync");
const parser = new Engine({
  parser: { extractDoc: true, suppressErrors: false },
  ast: { withPositions: true },
});

const files = fs.readdirSync(root).filter((file) => file.endsWith(".php")).sort();
let failures = 0;

for (const file of files) {
  const fullPath = path.join(root, file);
  try {
    parser.parseCode(fs.readFileSync(fullPath, "utf8"), file);
  } catch (error) {
    failures += 1;
    console.error(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures) {
  console.error(`PHP: ${failures} archivo(s) con errores.`);
  process.exit(1);
}

console.log(`PHP: ${files.length} archivo(s) analizados sin errores.`);
