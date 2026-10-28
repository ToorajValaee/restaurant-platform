import fs from "node:fs/promises";
import path from "node:path";

const target = path.resolve("public/fonts/Morabba-Medium.woff");
const source = "https://raw.githubusercontent.com/ToorajValaee/menu.cucinetta.ir/main/public/fonts/Morabba-Medium.woff";

try {
  const stat = await fs.stat(target);
  if (stat.isFile() && stat.size > 1000) {
    console.log(`Morabba font already present: ${target}`);
    process.exit(0);
  }
} catch {}

await fs.mkdir(path.dirname(target), { recursive: true });

const response = await fetch(source);
if (!response.ok) {
  throw new Error(`Failed to download Morabba font: ${response.status} ${response.statusText}`);
}

const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.length !== 39796) {
  throw new Error(`Unexpected Morabba font size: ${bytes.length} bytes`);
}

await fs.writeFile(target, bytes);
console.log(`Downloaded Morabba-Medium.woff (${bytes.length} bytes)`);
