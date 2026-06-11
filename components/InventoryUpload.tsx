"use client";

import React, { useCallback, useRef, useState, useTransition } from "react";
import {
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  Download,
  X,
  RotateCcw,
} from "lucide-react";

/* --------------------------- constants --------------------------- */

const WEBHOOK_URL = "/api/proxy-inventory";
const MAX_FILE_MB = 10;

type Status = "idle" | "uploading" | "success" | "error";

const SAMPLE_CSV =
  "id,name,category,regular_price,offer_price,inventory_quantity,size,color,product_type,size_chart_image_url\n" +
  "101,Panjabi Semi Fit,Panjabi,2790,1950,100000,3B,Deep ash,3287#1,https://res.cloudinary.com/drchxbdit/image/upload/v1776054103/size_chart_panjabi_tmeusj.webp\n" +
  "102,Premium Shirt,Clothing,1500,1200,500,L,Blue,Casual,https://example.com/shirt-chart.png";

/* ----------------------------- helpers --------------------------- */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ------------------------------ atoms ---------------------------- */

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
      {n}
    </span>
  );
}

/* ------------------------------ main ----------------------------- */

interface InventoryUploadProps {
  companyId?: string;
  embedded?: boolean; // form/page-এর ভেতরে বসালে full-screen wrapper বাদ যায়
}

export default function InventoryUpload({
  companyId,
  embedded = false,
}: InventoryUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const isUploading = status === "uploading";

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setErrorMessage("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const validateAndSet = (selected?: File) => {
    if (!selected) return;
    const isCsv =
      selected.type === "text/csv" ||
      selected.name.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      setStatus("error");
      setErrorMessage(
        "ভুল ফাইল ফরম্যাট। অনুগ্রহ করে একটি স্ট্যান্ডার্ড .csv ফাইল দিন।",
      );
      return;
    }
    if (selected.size > MAX_FILE_MB * 1024 * 1024) {
      setStatus("error");
      setErrorMessage(`ফাইল খুব বড় (সর্বোচ্চ ${MAX_FILE_MB}MB)।`);
      return;
    }
    setFile(selected);
    setStatus("idle");
    setProgress(0);
    setErrorMessage("");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    validateAndSet(e.dataTransfer.files?.[0]);
  }, []);

  const uploadCSV = () => {
    if (!file) return;
    if (!companyId) {
      setStatus("error");
      setErrorMessage("Company ID পাওয়া যায়নি। পেজটি রিফ্রেশ করুন।");
      return;
    }

    startTransition(async () => {
      setStatus("uploading");
      setProgress(0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("companyId", companyId);

      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable)
              setProgress(Math.round((event.loaded / event.total) * 100));
          });
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setStatus("success");
              resolve();
            } else {
              setStatus("error");
              setErrorMessage(`সার্ভার রেসপন্স এরর কোড: ${xhr.status}`);
              reject();
            }
          });
          xhr.addEventListener("error", () => {
            setStatus("error");
            setErrorMessage("নেটওয়ার্ক কানেকশন ব্যর্থ হয়েছে।");
            reject();
          });
          xhr.open("POST", WEBHOOK_URL);
          xhr.send(formData);
        });
      } catch {
        /* state already set above */
      }
    });
  };

  /* ----------------------------- content --------------------------- */

  const content = (
    <div className="space-y-6">
      {!embedded && (
        <header className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">
            প্রোডাক্ট ইনভেন্টরি সিঙ্ক
          </h2>
          <p className="text-sm text-slate-500">
            CSV ফাইল আপলোড করে আপনার ডাটাবেজের সাথে ইনভেন্টরি আপডেট করুন।
          </p>
        </header>
      )}

      {/* Step 1 — template */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <StepBadge n={1} />
          <h3 className="text-sm font-semibold text-slate-700">টেমপ্লেট নিন</h3>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3.5">
          <p className="text-xs text-emerald-800/90">
            স্ট্যান্ডার্ড ফরম্যাটে ডাটা সাজাতে নমুনা CSV ডাউনলোড করুন।
          </p>
          <button
            type="button"
            onClick={() =>
              downloadFile(
                SAMPLE_CSV,
                "product_inventory_sample.csv",
                "text/csv;charset=utf-8;",
              )
            }
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
          >
            <Download className="h-3.5 w-3.5" />
            টেমপ্লেট
          </button>
        </div>
      </section>

      {/* Step 2 — upload */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <StepBadge n={2} />
          <h3 className="text-sm font-semibold text-slate-700">
            ফাইল আপলোড করুন
          </h3>
        </div>

        {!file ? (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              if (!isUploading) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`relative flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed p-9 text-center transition-all ${
              dragActive
                ? "border-emerald-400 bg-emerald-50/60"
                : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              onChange={(e) => validateAndSet(e.target.files?.[0])}
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
              disabled={isUploading}
            />
            <Upload className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">
              CSV ফাইল ড্র্যাগ করুন অথবা ব্রাউজ করুন
            </p>
            <p className="mt-1 text-xs text-slate-400">
              শুধুমাত্র .csv • সর্বোচ্চ {MAX_FILE_MB}MB
            </p>
          </label>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {file.name}
              </p>
              <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
            </div>
            {!isUploading && (
              <button
                type="button"
                onClick={reset}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                aria-label="ফাইল সরান"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {file && status !== "success" && !isUploading && (
          <button
            type="button"
            onClick={uploadCSV}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-[0.99]"
          >
            সার্ভারে আপলোড করুন
          </button>
        )}
      </section>

      {/* Status / progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              ডাটাবেজে সিঙ্ক হচ্ছে...
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-3">
          <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">সফলভাবে সম্পন্ন হয়েছে!</p>
              <p className="opacity-80">
                আপনার ইনভেন্টরি আপডেট প্রসেস করা হয়েছে।
              </p>
            </div>
          </div>
          
        </div>
      )}

      {status === "error" && (
        <div className="flex gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">অপারেশন ব্যর্থ হয়েছে</p>
            <p className="opacity-80">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );

  /* ----------------------------- render ---------------------------- */

  if (embedded) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {content}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        {content}
      </div>
    </div>
  );
}
