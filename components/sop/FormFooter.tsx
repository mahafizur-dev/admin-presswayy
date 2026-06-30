"use client";

import React from "react";

interface FormFooterProps {
  isExisting: boolean;
  pct: number;
  isSubmitting: boolean;
}

export function FormFooter({ isExisting, pct, isSubmitting }: FormFooterProps) {
  return (
    <div className="sticky bottom-0 z-10 mt-8 -mx-6 flex items-center justify-between gap-4 border-t border-slate-100 bg-white/85 px-6 py-4 backdrop-blur-md">
      <span className="hidden text-xs text-slate-400 sm:block">
        {pct === 100 ? "সব তথ্য পূরণ হয়েছে" : `${pct}% সম্পন্ন`}
      </span>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all duration-150 hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:active:scale-100 sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            সংরক্ষণ হচ্ছে...
          </>
        ) : isExisting ? (
          "আপডেট করুন"
        ) : (
          "সাবমিট করুন"
        )}
      </button>
    </div>
  );
}
