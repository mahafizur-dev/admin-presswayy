"use client";

import { use, useState } from "react";
import SOPForm from "@/components/SOPForm";
import ChatbotInterface from "@/components/ChatbotInterface";
import ActivateFacebookButton from "@/components/ActivateFacebookButton";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

type Tab = "form" | "chat";

type IconProps = { className?: string };

const EditIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const ChatIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const TABS: {
  id: Tab;
  label: string;
  Icon: (p: IconProps) => React.JSX.Element;
}[] = [
  { id: "form", label: "সেটআপ", Icon: EditIcon },
  { id: "chat", label: "লাইভ চ্যাট", Icon: ChatIcon },
];

export default function CompanySOPPage({ params }: PageProps) {
  const { id: companyId } = use(params);
  const [tab, setTab] = useState<Tab>("form");

  if (!companyId || companyId.length < 5) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <header className="sticky top-0 z-30 h-16 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="leading-tight">
              <h1 className="text-sm font-bold text-slate-800 sm:text-base">
                Presswayy
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                AI Business Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 md:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-500 sm:block max-w-[100px] truncate">
              #{companyId.slice(0, 8)}
            </span>

            <ActivateFacebookButton companyId={companyId} />
          </div>
        </div>
      </header>

      <div className="sticky top-[64px] z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-[1600px] gap-1.5 p-2">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-pressed={active}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-8 md:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
          {/* বাম: SOP Form */}
          <section
            className={`${tab === "form" ? "block" : "hidden"} lg:col-span-7 lg:block xl:col-span-8`}
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <SOPForm companyId={companyId} />
            </div>
          </section>

          <aside
            className={`${tab === "chat" ? "block" : "hidden"} lg:col-span-5 lg:sticky lg:top-24 lg:block xl:col-span-4`}
          >
            <div className="mb-3 hidden items-center gap-2 lg:flex">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                <ChatIcon className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                লাইভ প্রিভিউ
              </h3>
            </div>

            <ChatbotInterface companyId={companyId} />

            <p className="mt-3 text-center text-xs text-slate-400">
              ⚡ পরিবর্তন সেভ করার পর এখানে টেস্ট করুন
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
