"use client";

import { useEffect, useRef, useState } from "react";
import { cropVideoToCard, prepareImageFile, recognizeCardText } from "@/lib/ocr";
import { suggestQuery } from "@/lib/query";

interface ScannerProps {
  busy: boolean;
  onRecognized: (text: string, suggested: string, imageUrl: string) => void;
  onStatus: (message: string) => void;
}

export function Scanner({ busy, onRecognized, onStatus }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
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
      setError("Camera blocked. Upload a photo instead.");
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
    const canvas = await prepareImageFile(file);
    await readCanvas(canvas);
  }

  const locked = busy || reading;

  return (
    <div className="glass holo-border overflow-hidden rounded-[28px]">
      <div className="relative aspect-[4/5] bg-black sm:aspect-[5/4]">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${live ? "opacity-100" : "opacity-0"}`}
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
            className="scan-frame relative h-[72%] w-[52%] rounded-[18px]"
          >
            <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-[16px] border-l-2 border-t-2 border-[#7dffe1]" />
            <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-[16px] border-r-2 border-t-2 border-[#7dffe1]" />
            <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-[16px] border-b-2 border-l-2 border-[#7dffe1]" />
            <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-[16px] border-b-2 border-r-2 border-[#7dffe1]" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4">
        {live ? (
          <>
            <button
              type="button"
              disabled={locked}
              onClick={() => void capture()}
              className="rounded-2xl bg-[#7dffe1] px-4 py-2.5 text-sm font-semibold text-[#071016] disabled:opacity-60"
            >
              {reading ? "Reading…" : "Scan card"}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-2xl border border-white/15 px-4 py-2.5 text-sm"
            >
              Stop camera
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void startCamera()}
            className="rounded-2xl bg-[#7dffe1] px-4 py-2.5 text-sm font-semibold text-[#071016]"
          >
            Open camera
          </button>
        )}

        <label className="cursor-pointer rounded-2xl border border-white/15 px-4 py-2.5 text-sm">
          Upload photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={locked}
            onChange={(event) => {
              const file = event.target.files?.[0];
              void onFile(file);
              event.currentTarget.value = "";
            }}
          />
        </label>

        {error ? <p className="text-xs text-[#e7c37a]">{error}</p> : null}
      </div>
    </div>
  );
}
