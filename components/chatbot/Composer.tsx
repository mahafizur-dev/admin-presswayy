"use client";

import React from "react";
import type { Attachment } from "../../hooks/useAttachments";

// ── Icons ─────────────────────────────────────────────────────────────────────

export function TrashIcon({
  className = "h-[18px] w-[18px]",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
    </svg>
  );
}

// ── AttachmentPreview ─────────────────────────────────────────────────────────

export function AttachmentPreview({
  items,
  onRemove,
}: {
  items: Attachment[];
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto border-t border-slate-100 bg-slate-50 px-3 py-2">
      {items.map((item) => (
        <div key={item.id} className="relative shrink-0">
          <img
            src={item.preview || item.url}
            alt={item.name}
            className={`h-12 w-12 rounded-lg border border-slate-200 object-cover ${item.status !== "done" ? "opacity-60" : ""}`}
          />
          {item.status === "uploading" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
          {item.status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-500/40 text-[9px] font-bold text-white">
              ত্রুটি
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-white transition hover:bg-slate-900"
            aria-label="সরান"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-2.5 w-2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────

export function ConfirmDialog({
  open,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      onClick={busy ? undefined : onCancel}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex flex-col items-center gap-3 px-5 pt-5 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
            <TrashIcon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-800">
              সব চ্যাট মুছে ফেলবেন?
            </h4>
            <p className="text-xs leading-relaxed text-slate-500">
              এই সেশনের সব মেসেজ ও কথোপকথন স্থায়ীভাবে মুছে যাবে। এটি ফেরানো
              যাবে না।
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2 border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {busy ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                মুছছি...
              </>
            ) : (
              "মুছে ফেলুন"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Composer ──────────────────────────────────────────────────────────────────

interface ComposerProps {
  inputMessage: string;
  setInputMessage: (value: string) => void;
  uploading: boolean;
  canSend: boolean;
  attachmentCount: number;
  maxAttachments: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPickFiles: (files: FileList | null) => void;
  onPaste: (event: React.ClipboardEvent) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function Composer({
  inputMessage,
  setInputMessage,
  uploading,
  canSend,
  attachmentCount,
  maxAttachments,
  fileInputRef,
  onPickFiles,
  onPaste,
  onSubmit,
}: ComposerProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-2 border-t border-slate-100 bg-white p-2.5"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onPickFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={attachmentCount >= maxAttachments}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="ছবি যোগ করুন"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
      <input
        type="text"
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={onPaste}
        placeholder={uploading ? "আপলোড হচ্ছে..." : "মেসেজ লিখুন..."}
        disabled={uploading}
        className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={!canSend}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        aria-label="পাঠান"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      </button>
    </form>
  );
}
