"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import InventoryUpload from "@/components/InventoryUpload";

interface PageProps {
  params: Promise<{ id: string }>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function InventoryPage({ params }: PageProps) {
  const { id: companyId } = use(params);

  if (!companyId || !UUID_REGEX.test(companyId)) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 8V5a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 5v14a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 19v-3M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
              </svg>
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold text-slate-800 sm:text-base">
                ইনভেন্টরি সিঙ্ক
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Product Inventory Management
              </p>
            </div>
          </div>

          <span className="max-w-[140px] truncate rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-500">
            #{companyId.slice(0, 8)}
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
        <InventoryUpload companyId={companyId} embedded />
      </div>
    </main>
  );
}
