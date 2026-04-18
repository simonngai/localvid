"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_VERSION = "0.12.10";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm`;

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export type ProgressFn = (progress: number) => void;
export type LogFn = (msg: string) => void;

export async function getFFmpeg(onLog?: LogFn): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    if (onLog) ffmpeg.on("log", ({ message }) => onLog(message));

    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      workerURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.worker.js`, "text/javascript"),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

export type AspectPreset = "9:16" | "1:1" | "16:9" | "4:5";
export type FillMode = "blur" | "black";

const PRESET_DIMENSIONS: Record<AspectPreset, { w: number; h: number }> = {
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
  "16:9": { w: 1920, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
};

export interface ProcessOptions {
  file: File;
  aspect: AspectPreset;
  fill: FillMode;
  trimStart?: number;
  trimEnd?: number;
  onProgress?: ProgressFn;
  onLog?: LogFn;
}

export async function processVideo(opts: ProcessOptions): Promise<Blob> {
  const { file, aspect, fill, trimStart, trimEnd, onProgress, onLog } = opts;
  const ffmpeg = await getFFmpeg(onLog);

  const progressHandler = ({ progress }: { progress: number }) => {
    if (onProgress) onProgress(Math.min(1, Math.max(0, progress)));
  };
  ffmpeg.on("progress", progressHandler);

  const { w, h } = PRESET_DIMENSIONS[aspect];
  const inputName = "input" + guessExt(file.name);
  const outputName = "output.mp4";

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const args: string[] = ["-y"];
  if (trimStart !== undefined && trimStart > 0) {
    args.push("-ss", trimStart.toFixed(3));
  }
  args.push("-i", inputName);
  if (trimEnd !== undefined && trimStart !== undefined && trimEnd > trimStart) {
    args.push("-t", (trimEnd - trimStart).toFixed(3));
  } else if (trimEnd !== undefined && trimStart === undefined) {
    args.push("-t", trimEnd.toFixed(3));
  }

  const filter = buildFilter(w, h, fill);
  args.push("-vf", filter);
  args.push("-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p");
  args.push("-c:a", "aac", "-b:a", "128k");
  args.push(outputName);

  try {
    await ffmpeg.exec(args);
  } finally {
    ffmpeg.off("progress", progressHandler);
  }

  const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  const bytes = new Uint8Array(data);
  return new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" });
}

function buildFilter(w: number, h: number, fill: FillMode): string {
  if (fill === "black") {
    return `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`;
  }
  return [
    `[0:v]split=2[bg][fg]`,
    `[bg]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=luma_radius=40:luma_power=2[bgb]`,
    `[fg]scale=${w}:${h}:force_original_aspect_ratio=decrease[fgs]`,
    `[bgb][fgs]overlay=(W-w)/2:(H-h)/2,setsar=1`,
  ].join(";");
}

function guessExt(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!m) return ".mp4";
  const ext = m[1];
  if (["mp4", "mov", "webm", "mkv", "avi", "m4v"].includes(ext)) return `.${ext}`;
  return ".mp4";
}

export async function probeDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video metadata"));
    };
  });
}
