import Editor from "./components/Editor";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10 md:py-16">
        <header className="mb-10 md:mb-14">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            100% local · nothing uploaded
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            localvid
          </h1>
          <p className="mt-3 max-w-2xl text-white/60 md:text-lg">
            Reshape any video to 9:16, 1:1, 4:5 or 16:9 — centered with
            black bars. Runs entirely in your browser via WebAssembly. Your
            file never leaves your device.
          </p>
        </header>

        <Editor />

        <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-white/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              Powered by ffmpeg.wasm. No servers, no accounts, no tracking.
            </div>
            <div>
              First convert loads ~30 MB of WASM (cached after). Longer clips
              take longer — this is your CPU, not a server.
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
