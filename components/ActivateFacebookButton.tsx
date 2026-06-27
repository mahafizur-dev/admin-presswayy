"use client";

import { useState } from "react";

type IconProps = { className?: string };

const LinkIcon = ({ className = "h-3.5 w-3.5" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const SpinnerIcon = ({ className = "h-3.5 w-3.5" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    className={`animate-spin ${className}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const FacebookIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
);

const ArrowIcon = () => (
  <svg
    viewBox="0 0 16 16"
    className="h-3.5 w-3.5 shrink-0 animate-bounce-x"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

type Status = "idle" | "activating" | "activated" | "disconnecting" | "error";

interface ActivateFacebookButtonProps {
  companyId: string;
}

const WEBHOOK = "https://server.presswayy.com/webhook/activate/fb/page";

export default function ActivateFacebookButton({
  companyId,
}: ActivateFacebookButtonProps) {
  const [status, setStatus] = useState<Status>("idle");

  const sendRequest = async (activate: boolean) => {
    setStatus(activate ? "activating" : "disconnecting");
    try {
      const res = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, activated: activate }),
      });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      setStatus(activate ? "activated" : "idle");
    } catch (err) {
      console.error("Request failed:", err);
      setStatus("error");
      setTimeout(() => setStatus(activate ? "idle" : "activated"), 3000);
    }
  };

  // ── Activated state — highlighted red disconnect CTA ──
  if (status === "activated") {
    return (
      <div className="relative">
        <span className="absolute inset-0 rounded-xl bg-red-500 opacity-30 blur-md animate-pulse pointer-events-none" />
        <button
          type="button"
          onClick={() => sendRequest(false)}
          className="relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-lg
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
            cursor-pointer bg-gradient-to-r from-red-600 to-red-500
            hover:from-red-700 hover:to-red-600 hover:shadow-red-400/50 hover:shadow-xl
            hover:-translate-y-0.5 active:translate-y-0 focus:ring-red-500"
        >
          <FacebookIcon className="h-4 w-4 shrink-0" />
          <span>Disconnect Facebook Page</span>
          <ArrowIcon />
        </button>
        
      </div>
    );
  }

  // ── Disconnecting (loading) state ──
  if (status === "disconnecting") {
    return (
      <button
        type="button"
        disabled
        className="relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-lg
          cursor-not-allowed bg-gradient-to-r from-red-400 to-red-300 opacity-80
          focus:outline-none"
      >
        <SpinnerIcon className="h-4 w-4 shrink-0" />
        <span>Disconnecting…</span>
      </button>
    );
  }

  // ── Error state ──
  if (status === "error") {
    return (
      <button
        type="button"
        onClick={() => sendRequest(true)}
        className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        <span>Failed — Retry</span>
        <LinkIcon className="h-3.5 w-3.5" />
      </button>
    );
  }

  // ── Idle / activating state — highlighted blue activate CTA ──
  const isActivating = status === "activating";

  return (
    <div className="relative">
      {!isActivating && (
        <span className="absolute inset-0 rounded-xl bg-blue-500 opacity-30 blur-md animate-pulse pointer-events-none" />
      )}
      <button
        type="button"
        onClick={() => sendRequest(true)}
        disabled={isActivating}
        className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-lg
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
          ${
            isActivating
              ? "cursor-not-allowed bg-gradient-to-r from-blue-400 to-blue-300 opacity-80"
              : "cursor-pointer bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 hover:shadow-blue-400/50 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 focus:ring-blue-500"
          }`}
      >
        {isActivating ? (
          <SpinnerIcon className="h-4 w-4 shrink-0" />
        ) : (
          <FacebookIcon className="h-4 w-4 shrink-0" />
        )}
        <span>{isActivating ? "Activating…" : "Activate Facebook Page"}</span>
        {!isActivating && <ArrowIcon />}
      </button>
      
    </div>
  );
}
