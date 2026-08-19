"use client";

import { useEffect, useRef, useState } from "react";
import { cropVideoToCard, prepareImageFile, recognizeCardText } from "@/lib/ocr";
import { suggestQuery } from "@/lib/query";

interface ScannerProps {
  busy: boolean;
  onRecognized: (text: string, suggested: string, imageUrl: string) => void;
  onStatus: (message: string) => void;
  /** Full-bleed camera on phones; the panel look is used on tablet/desktop. */
  fullBleed?: boolean;
}

export function Scanner({
  busy,
  onRecognized,
  onStatus,
  fullBleed = true,
}: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLive(true);
    } catch {
      setError("Camera blocked. Take a photo or pick one from your camera roll.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLive(false);
  }

  async function readCanvas(canvas: HTMLCanvasElement) {
    setReading(true);
    onStatus("Reading card text…");
    try {
      const text = await recognizeCardText(canvas, (update) => {
        if (update.status === "recognizing text") {
          onStatus(`Reading card… ${Math.round(update.progress * 100)}%`);
        }
      });
      const suggested = suggestQuery(text) || "trading card";
      onRecognized(text, suggested, canvas.toDataURL("image/jpeg", 0.85));
    } catch {
      onStatus("Could not read that photo. Try a flatter, brighter shot.");
    } finally {
      setReading(false);
    }
  }

  async function capture() {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame) return;
    const canvas = cropVideoToCard(
      video,
      frame.getBoundingClientRect(),
      video.getBoundingClientRect(),
    );
    await readCanvas(canvas);
  }

  async function onFile(file?: File) {
    if (!file) return;
    setError("");
    try {
      const canvas = await prepareImageFile(file);
      await readCanvas(canvas);
    } catch {
      setError("That file could not be opened. Try a JPG or PNG photo.");
    }
  }

  const locked = busy || reading;
  const stageClass = fullBleed
    ? "relative min-h-[58dvh] bg-black sm:min-h-0 sm:aspect-[5/4] lg:aspect-[4/3]"
    : "relative aspect-[4/5] bg-black sm:aspect-[5/4]";

  return (
    <div className="glass holo-border overflow-hidden rounded-[28px]">
      <div className={stageClass}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`h-full w-full object-cover ${live ? "opacity-100" : "opacity-0"} absolute inset-0`}
        />
        {!live ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="relative">
              <div className="pulse-ring absolute inset-0 rounded-full border border-[#7dffe1]/40" />
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#7dffe1]/50 text-[#7dffe1]">
                ⌖
              </div>
            </div>
            <p className="text-sm text-[#c9d9d4]">
              Align the card in the frame, then scan.
            </p>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            ref={frameRef}
            className="scan-frame relative h-[72%] w-[62%] rounded-[18px] sm:w-[52%]"
          >
            <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-[16px] border-l-2 border-t-2 border-[#7dffe1]" />
            <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-[16px] border-r-2 border-t-2 border-[#7dffe1]" />
            <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-[16px] border-b-2 border-l-2 border-[#7dffe1]" />
            <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-[16px] border-b-2 border-r-2 border-[#7dffe1]" />
          </div>
        </div>

        {reading ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#071016] to-transparent px-4 py-3 text-center text-sm text-[#7dffe1]">
            Reading card…
          </div>
        ) : null}
      </div>

      <div className="p-3 sm:p-4">
        {live ? (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={locked}
              className="tap tap-target flex items-center justify-center rounded-2xl border border-white/15 px-4 text-sm disabled:opacity-60"
            >
              Camera roll
            </button>
            <button
              type="button"
              aria-label="Scan card"
              disabled={locked}
              onClick={() => void capture()}
              className="tap flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border-4 border-[#7dffe1]/40 bg-[#7dffe1] text-[11px] font-semibold uppercase tracking-wide text-[#071016] disabled:opacity-60"
            >
              {reading ? "…" : "Scan"}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="tap tap-target flex items-center justify-center rounded-2xl border border-white/15 px-4 text-sm"
            >
              Stop
            </button>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => void startCamera()}
              className="tap tap-target flex items-center justify-center rounded-2xl bg-[#7dffe1] px-4 text-sm font-semibold text-[#071016]"
            >
              Open camera
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => cameraInputRef.current?.click()}
              className="tap tap-target flex items-center justify-center rounded-2xl border border-white/15 px-4 text-sm disabled:opacity-60"
            >
              Take photo
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => galleryInputRef.current?.click()}
              className="tap tap-target flex items-center justify-center rounded-2xl border border-white/15 px-4 text-sm disabled:opacity-60"
            >
              Camera roll
            </button>
          </div>
        )}

        {/* Native camera capture (iOS/Android open the camera app directly). */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={locked}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onFile(file);
          }}
        />
        {/* Gallery picker: no `capture`, so users can choose an existing photo. */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={locked}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onFile(file);
          }}
        />

        {error ? (
          <p className="mt-3 text-xs text-[#e7c37a]" role="status">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
