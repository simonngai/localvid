import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(process.cwd());
const core = resolve(root, "node_modules/@ffmpeg/core-mt/dist/esm");
const ffmpeg = resolve(root, "node_modules/@ffmpeg/ffmpeg/dist/esm");

const targets = [
  [`${core}/ffmpeg-core.js`, "public/ffmpeg/core/ffmpeg-core.js"],
  [`${core}/ffmpeg-core.wasm`, "public/ffmpeg/core/ffmpeg-core.wasm"],
  [`${core}/ffmpeg-core.worker.js`, "public/ffmpeg/core/ffmpeg-core.worker.js"],
  [`${ffmpeg}/worker.js`, "public/ffmpeg/classes/worker.js"],
  [`${ffmpeg}/const.js`, "public/ffmpeg/classes/const.js"],
  [`${ffmpeg}/errors.js`, "public/ffmpeg/classes/errors.js"],
  [`${ffmpeg}/types.js`, "public/ffmpeg/classes/types.js"],
];

for (const [from, to] of targets) {
  if (!existsSync(from)) {
    console.error(`[copy-ffmpeg] missing source: ${from}`);
    process.exit(1);
  }
  const dest = resolve(root, to);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(from, dest);
  console.log(`[copy-ffmpeg] ${to}`);
}
