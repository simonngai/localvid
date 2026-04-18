# localvid

Reshape any video to 9:16, 1:1, 4:5, or 16:9 — centered with black bars. Runs **100% in the browser** via ffmpeg.wasm. Nothing is uploaded.

**Live: https://localvid.vercel.app**

## Features

- Aspect presets: 9:16, 1:1, 4:5, 16:9
- Centered with black bars
- Trim start/end
- In-browser processing — your file never leaves your device

## Dev

```bash
npm install
npm run dev
```

## Why the COOP/COEP headers?

`ffmpeg.wasm` needs `SharedArrayBuffer`, which requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. These are set in `next.config.ts` and applied automatically by Vercel.

## Deploy

Push to GitHub, connect the repo to Vercel. No env vars, no server — fully static.
