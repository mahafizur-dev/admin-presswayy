"use client";

import React from "react";
import type { CustomField } from "../../lib/sopTypes";

const inputBase =
  "w-full rounded-xl border bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:ring-4";
const okRing =
  "border-slate-200 focus:border-emerald-500 focus:ring-emerald-100";

interface CustomFieldsSectionProps {
  customFields: CustomField[];
  newLabel: string;
  setNewLabel: (v: string) => void;
  newType: "input" | "textarea";
  setNewType: (v: "input" | "textarea") => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdateValue: (id: string, value: string) => void;
}

export function CustomFieldsSection({
  customFields,
  newLabel,
  setNewLabel,
  newType,
  setNewType,
  onAdd,
  onRemove,
  onUpdateValue,
}: CustomFieldsSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white/60 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <h3 className="text-sm font-bold tracking-tight text-slate-800">
          কাস্টম ফিল্ড
        </h3>
        <span className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
      </div>

      {customFields.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {customFields.map((cf) => (
            <div
              key={cf.id}
              className={`space-y-1.5 ${cf.type === "textarea" ? "md:col-span-2" : ""}`}
            >
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-600">
                  {cf.label}
                </label>
                <button
                  type="button"
                  onClick={() => onRemove(cf.id)}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                  aria-label="ফিল্ড সরান"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  remove
                </button>
              </div>
              {cf.type === "textarea" ? (
                <textarea
                  value={cf.value}
                  onChange={(e) => onUpdateValue(cf.id, e.target.value)}
                  rows={3}
                  className={`${inputBase} ${okRing} resize-y`}
                />
              ) : (
                <input
                  type="text"
                  value={cf.value}
                  onChange={(e) => onUpdateValue(cf.id, e.target.value)}
                  className={`${inputBase} ${okRing}`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add field composer */}
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <label className="block text-xs font-semibold text-slate-600">
            নতুন ফিল্ডের নাম
          </label>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAdd();
              }
            }}
            placeholder="যেমন: Facebook Page Link"
            className={`${inputBase} ${okRing}`}
          />
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={!newLabel.trim()}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-slate-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          ফিল্ড যোগ করুন
        </button>
      </div>

      <p className="mt-4 hidden text-xs text-slate-400 sm:block">
        Note: আপনি যত বেশি কাস্টম ফিল্ড যোগ করবেন, তত বেশি AI প্রসেসিং খরচ
        বৃদ্ধি পাবে।
      </p>
    </section>
  );
}
