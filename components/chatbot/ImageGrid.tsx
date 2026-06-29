"use client";

import React, { useState, useEffect } from "react";
import { normalizeImageList } from "../../lib/imageUtils";

const GRID_MAX = 4;

interface ImageGridProps {
  images?: string[];
  onOpenImage: (all: string[], index: number) => void;
  className?: string;
}

function gridTemplateColumns(count: number): string {
  if (count === 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-[2fr_1fr]";
  return "grid-cols-2";
}

function slotHeight(count: number, index: number): string {
  if (count === 2) return "h-28";
  if (count === 3) return index === 0 ? "" : "h-20";
  return "h-28";
}

function slotRowSpan(count: number, index: number): string {
  return count === 3 && index === 0 ? "row-span-2" : "";
}

export function ChatImage({
  src,
  onOpen,
  dimmed = false,
  fit = "cover",
}: {
  src: string;
  onOpen: () => void;
  dimmed?: boolean;
  fit?: "cover" | "contain";
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  if (!src) return null;

  return (
    <div
      className="group relative h-full w-full overflow-hidden"
      onClick={!failed ? onOpen : undefined}
      style={{ cursor: failed ? "default" : "zoom-in" }}
    >
      {!loaded && !failed && (
        <div className="absolute inset-0 animate-pulse bg-slate-200" />
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-[10px] text-slate-400">
          ছবি লোড হয়নি
        </div>
      )}
      <img
        src={src}
        alt="content"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full transition-opacity duration-300 ${
          fit === "contain" ? "object-contain" : "object-cover"
        } ${dimmed ? "brightness-[0.4]" : ""} ${
          loaded && !failed ? "opacity-100" : "opacity-0"
        }`}
      />
      {loaded && !failed && !dimmed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-150 group-hover:bg-black/25">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function SingleChatImage({
  src,
  onOpen,
}: {
  src: string;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  if (!src) return null;

  if (failed) {
    return (
      <div className="flex h-32 w-44 items-center justify-center rounded-xl bg-slate-100 text-[10px] text-slate-400">
        ছবি লোড হয়নি
      </div>
    );
  }

  return (
    <div
      className="group relative inline-block overflow-hidden rounded-xl"
      onClick={onOpen}
      style={{ cursor: "zoom-in" }}
    >
      {!loaded && (
        <div className="h-44 w-44 animate-pulse rounded-xl bg-slate-200" />
      )}
      <img
        src={src}
        alt="content"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`block max-h-72 w-auto max-w-full rounded-xl object-contain transition-opacity duration-300 ${
          loaded ? "opacity-100" : "absolute inset-0 h-full w-full opacity-0"
        }`}
      />
      {loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-150 group-hover:bg-black/20">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function MessageImageGrid({
  images,
  onOpenImage,
  className = "",
}: ImageGridProps) {
  const clean = normalizeImageList(images);
  if (clean.length === 0) return null;

  if (clean.length === 1) {
    return (
      <div className={className}>
        <SingleChatImage src={clean[0]} onOpen={() => onOpenImage(clean, 0)} />
      </div>
    );
  }

  const shown = clean.slice(0, GRID_MAX);
  const overflow = clean.length - GRID_MAX;

  return (
    <div
      className={`${className} grid gap-[3px] overflow-hidden rounded-xl ${gridTemplateColumns(shown.length)}`}
    >
      {shown.map((src, i) => {
        const isOverflowSlot = i === GRID_MAX - 1 && overflow > 0;
        return (
          <div
            key={`${src}-${i}`}
            className={`relative overflow-hidden ${slotHeight(shown.length, i)} ${slotRowSpan(shown.length, i)}`}
          >
            {isOverflowSlot ? (
              <div className="relative h-full w-full">
                <ChatImage
                  src={src}
                  onOpen={() => onOpenImage(clean, i)}
                  dimmed
                />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-xl font-medium leading-none text-white">
                    +{overflow}
                  </span>
                  <span className="text-[11px] text-white/80">more</span>
                </div>
              </div>
            ) : (
              <ChatImage src={src} onOpen={() => onOpenImage(clean, i)} />
            )}
          </div>
        );
      })}
    </div>
  );
}
