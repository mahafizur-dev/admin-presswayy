"use client";

import React from "react";

interface FormHeaderProps {
  isExisting: boolean;
  filled: number;
  total: number;
  pct: number;
}

export function FormHeader({
  isExisting,
  filled,
  total,
  pct,
}: FormHeaderProps) {
  return (
    <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-emerald-50/80 via-white to-white px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            {isExisting
              ? "আপনার ব্যবসার তথ্য আপডেট করুন"
              : "আপনার ব্যবসার তথ্য দিন"}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            AI অ্যাসিস্ট্যান্ট কীভাবে গ্রাহকদের সাথে কথা বলবে তা নির্ধারণ করুন।
          </p>
        </div>

        <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-emerald-100/70 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:flex">
          {filled}/{total} পূরণ
        </span>
      </div>

      <div className="mt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
