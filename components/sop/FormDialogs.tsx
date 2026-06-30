"use client";

import React from "react";

interface MissingFieldsPopupProps {
  fields: string[];
  onClose: () => void;
}

export function MissingFieldsPopup({
  fields,
  onClose,
}: MissingFieldsPopupProps) {
  if (fields.length === 0) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 px-6 pt-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
          </span>
          <div className="min-w-0">
            <h4 className="text-base font-bold text-slate-900">
              কিছু আবশ্যক তথ্য বাকি আছে
            </h4>
            <p className="mt-0.5 text-sm text-slate-500">
              সাবমিট করার আগে নিচের ফিল্ডগুলো পূরণ করুন:
            </p>
          </div>
        </div>

        <ul className="mx-6 mt-4 max-h-60 space-y-1.5 overflow-y-auto rounded-xl bg-slate-50 p-3">
          {fields.map((label) => (
            <li
              key={label}
              className="flex items-start gap-2 text-sm text-slate-700"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              {label}
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99] motion-reduce:active:scale-100"
          >
            বুঝেছি, পূরণ করছি
          </button>
        </div>
      </div>
    </div>
  );
}

interface SuccessPopupProps {
  open: boolean;
  action: "submit" | "update";
  onClose: () => void;
}

export function SuccessPopup({ open, action, onClose }: SuccessPopupProps) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex flex-col items-center gap-3 px-6 pb-2 pt-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <div>
            <h4 className="text-base font-bold text-slate-900">
              তথ্য সংরক্ষণ করা হয়েছে!
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {action === "update"
                ? "আপনার ব্যবসার তথ্য সফলভাবে আপডেট করা হয়েছে।"
                : "আপনার ব্যবসার তথ্য সফলভাবে সাবমিট করা হয়েছে।"}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99] motion-reduce:active:scale-100"
          >
            ঠিক আছে
          </button>
        </div>
      </div>
    </div>
  );
}
