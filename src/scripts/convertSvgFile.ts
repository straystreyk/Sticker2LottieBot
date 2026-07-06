import { execFile } from "node:child_process";
import { delimiter, dirname, join, resolve } from "node:path";
import { access, mkdir, readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findOnPath(command: string) {
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, command);
    if (await fileExists(candidate)) return candidate;
  }

  return undefined;
}

async function resolveLottieConvertBin() {
  if (process.env.LOTTIE_CONVERT_BIN && (await fileExists(process.env.LOTTIE_CONVERT_BIN))) {
    return process.env.LOTTIE_CONVERT_BIN;
  }

  const pathCommand = await findOnPath("lottie_convert.py");
  if (pathCommand) return pathCommand;

  const localBinary = resolve("vendor/lottie-convert/lottie_convert");
  if (await fileExists(localBinary)) return localBinary;

  throw new Error("No SVG to TGS converter found.");
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error("Usage: node dist/scripts/convertSvgFile.js input.svg output.tgs");
  process.exit(2);
}

const converter = await resolveLottieConvertBin();
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await execFileAsync(
  converter,
  [
    inputPath,
    outputPath,
    "--sanitize",
    "--fps",
    "30",
    "--width",
    "512",
    "--height",
    "512",
    "--optimize",
    "2",
  ],
  { timeout: 30_000, maxBuffer: 1024 * 1024 },
);

const output = await readFile(outputPath);
console.log(`created ${outputPath} (${output.byteLength} bytes)`);
