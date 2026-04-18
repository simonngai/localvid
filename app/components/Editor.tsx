"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AspectPreset,
  probeDuration,
  processVideo,
} from "../lib/ffmpeg";

const ASPECTS: { key: AspectPreset; label: string; hint: string }[] = [
  { key: "9:16", label: "9:16", hint: "Reels / TikTok / Shorts" },
  { key: "1:1", label: "1:1", hint: "IG feed square" },
  { key: "4:5", label: "4:5", hint: "IG feed portrait" },
  { key: "16:9", label: "16:9", hint: "YouTube / landscape" },
];

export default function Editor() {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [aspect, setAspect] = useState<AspectPreset>("9:16");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirmTweak, setConfirmTweak] = useState(false);

  const previewUrl = useSourceUrl(file);

  const onFile = useCallback(async (f: File) => {
    setFile(f);
    setOutputUrl(null);
    setError(null);
    setProgress(0);
    try {
      const d = await probeDuration(f);
      setDuration(d);
      setTrimStart(0);
      setTrimEnd(d);
    } catch {
      setDuration(0);
    }
  }, []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const run = async () => {
    if (!file || processing) return;
    setProcessing(true);
    setProgress(0);
    setOutputUrl(null);
    setError(null);
    setLogs([]);
    try {
      const blob = await processVideo({
        file,
        aspect,
        trimStart: trimStart > 0 ? trimStart : undefined,
        trimEnd: trimEnd > 0 && trimEnd < duration ? trimEnd : undefined,
        onProgress: setProgress,
        onLog: (m) => setLogs((prev) => [...prev.slice(-40), m]),
      });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessing(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setOutputUrl(null);
    setDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setProgress(0);
    setLogs([]);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`block cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition ${
            dragOver
              ? "border-white/60 bg-white/5"
              : "border-white/20 hover:border-white/40 hover:bg-white/5"
          }`}
        >
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={onPick}
          />
          <div className="text-lg font-medium">Drop a video here</div>
          <div className="mt-1 text-sm text-white/60">
            or click to pick a file — nothing leaves your device
          </div>
        </label>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="flex items-center justify-center overflow-hidden rounded-xl bg-black">
              {outputUrl ? (
                <video
                  src={outputUrl}
                  controls
                  className="max-h-[70vh] max-w-full object-contain"
                />
              ) : previewUrl ? (
                <video
                  src={previewUrl}
                  controls
                  className="max-h-[70vh] max-w-full object-contain"
                />
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-white/60">
              <span className="rounded bg-white/5 px-2 py-1">
                {file.name}
              </span>
              <span className="rounded bg-white/5 px-2 py-1">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              {duration > 0 && (
                <span className="rounded bg-white/5 px-2 py-1">
                  {duration.toFixed(1)}s
                </span>
              )}
              <button
                onClick={resetFile}
                className="ml-auto text-white/50 underline-offset-4 hover:text-white hover:underline"
              >
                Pick another
              </button>
            </div>
          </div>

          <div className="space-y-5 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            {outputUrl ? (
              <>
                <div className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Done · {aspect}
                </div>
                <a
                  href={outputUrl}
                  download={`localvid-${aspect.replace(":", "x")}.mp4`}
                  className="block w-full rounded-lg bg-white py-3 text-center text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Download
                </a>
                {confirmTweak ? (
                  <div className="space-y-2 rounded-lg border border-white/20 bg-white/5 p-3">
                    <div className="text-xs text-white/70">
                      Discard this result and go back to edit?
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setOutputUrl(null);
                          setConfirmTweak(false);
                        }}
                        className="flex-1 rounded-md border border-white/30 py-2 text-xs font-medium transition hover:bg-white/10"
                      >
                        Yes, tweak
                      </button>
                      <button
                        onClick={() => setConfirmTweak(false)}
                        className="flex-1 rounded-md border border-white/10 py-2 text-xs text-white/60 transition hover:bg-white/5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmTweak(true)}
                    className="block w-full rounded-lg border border-white/20 py-3 text-center text-sm font-medium transition hover:bg-white/5"
                  >
                    Tweak settings
                  </button>
                )}
                <button
                  onClick={resetFile}
                  className="block w-full text-center text-xs text-white/50 underline-offset-4 hover:text-white hover:underline"
                >
                  Convert another video
                </button>
              </>
            ) : (
              <>
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                    Aspect
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {ASPECTS.map((a) => (
                      <button
                        key={a.key}
                        onClick={() => setAspect(a.key)}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                          aspect === a.key
                            ? "border-white bg-white text-black"
                            : "border-white/15 hover:border-white/40"
                        }`}
                      >
                        <div className="font-medium">{a.label}</div>
                        <div
                          className={`text-xs ${
                            aspect === a.key ? "text-black/60" : "text-white/50"
                          }`}
                        >
                          {a.hint}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {duration > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                      Trim
                    </h3>
                    <div className="space-y-3 text-xs">
                      <label className="block">
                        <div className="mb-1 flex justify-between text-white/60">
                          <span>Start</span>
                          <span>{trimStart.toFixed(2)}s</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={duration}
                          step={0.05}
                          value={trimStart}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setTrimStart(Math.min(v, trimEnd - 0.1));
                          }}
                          className="w-full"
                        />
                      </label>
                      <label className="block">
                        <div className="mb-1 flex justify-between text-white/60">
                          <span>End</span>
                          <span>{trimEnd.toFixed(2)}s</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={duration}
                          step={0.05}
                          value={trimEnd}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setTrimEnd(Math.max(v, trimStart + 0.1));
                          }}
                          className="w-full"
                        />
                      </label>
                    </div>
                  </section>
                )}

                <button
                  onClick={run}
                  disabled={processing}
                  className="w-full rounded-lg bg-white py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing
                    ? `Processing… ${Math.round(progress * 100)}%`
                    : "Convert"}
                </button>

                {processing && (
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-white transition-all"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                    {error}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <details className="text-xs text-white/40">
          <summary className="cursor-pointer select-none">ffmpeg log</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-black/40 p-3 font-mono text-[11px] leading-relaxed">
            {logs.join("\n")}
          </pre>
        </details>
      )}
    </div>
  );
}

function useSourceUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (prev.current) URL.revokeObjectURL(prev.current);
    if (!file) {
      setUrl(null);
      prev.current = null;
      return;
    }
    const u = URL.createObjectURL(file);
    prev.current = u;
    setUrl(u);
    return () => {
      URL.revokeObjectURL(u);
    };
  }, [file]);
  return url;
}
