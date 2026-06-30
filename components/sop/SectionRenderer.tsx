"use client";

import React from "react";
import { type UseFormRegister, type FieldErrors } from "react-hook-form";
import { GROUP_ICONS, DEFAULT_ICON } from "@/lib/sopConfig";
import type { FieldConfig, FormValues } from "../../lib/sopTypes";

const inputBase =
  "w-full rounded-xl border bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:ring-4";
const okRing =
  "border-slate-200 focus:border-emerald-500 focus:ring-emerald-100";
const errRing = "border-rose-300 focus:border-rose-400 focus:ring-rose-100";

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps) {
  return (
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
          {GROUP_ICONS[title] ?? DEFAULT_ICON}
        </svg>
      </span>
      <h3 className="text-sm font-bold tracking-tight text-slate-800">
        {title}
      </h3>
      <span className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  );
}

interface FieldRendererProps {
  field: FieldConfig;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
}

export function FieldRenderer({
  field: f,
  register,
  errors,
}: FieldRendererProps) {
  const hasError = !!errors[f.id];
  const cls = `${inputBase} ${hasError ? errRing : okRing}`;

  return (
    <div
      key={f.id}
      id={`field-${f.id}`}
      className={`space-y-1.5 scroll-mt-24 ${f.full ? "md:col-span-2" : ""}`}
    >
      <label className="block text-xs font-semibold text-slate-600">
        {f.label}
      </label>

      {f.type === "textarea" ? (
        <textarea
          {...register(f.id)}
          rows={3}
          placeholder={f.placeholder}
          className={`${cls} resize-y`}
        />
      ) : f.type === "select" ? (
        <div className="relative">
          <select
            {...register(f.id)}
            className={`${cls} cursor-pointer appearance-none pr-9`}
          >
            <option value="" disabled hidden>
              {f.placeholder}
            </option>
            {(f.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      ) : (
        <input
          type="text"
          {...register(f.id)}
          placeholder={f.placeholder}
          className={cls}
        />
      )}

      {hasError && (
        <p className="flex items-center gap-1 text-xs text-rose-500">
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {errors[f.id]?.message as string}
        </p>
      )}
    </div>
  );
}

interface SectionRendererProps {
  title: string;
  fields: FieldConfig[];
  isVisible: (f: FieldConfig) => boolean;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  children?: React.ReactNode;
}

export function SectionRenderer({
  title,
  fields,
  isVisible,
  register,
  errors,
  children,
}: SectionRendererProps) {
  const visibleFields = fields.filter(isVisible);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white/60 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
      <SectionHeader title={title} />

      {visibleFields.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((f) =>
            isVisible(f) ? (
              <FieldRenderer
                key={f.id}
                field={f}
                register={register}
                errors={errors}
              />
            ) : null,
          )}
        </div>
      )}

      {children}
    </section>
  );
}
