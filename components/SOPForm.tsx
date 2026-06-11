"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSopStore } from "../store/useSopStore";

interface SOPFormProps {
  companyId?: string;
}


type FieldType = "input" | "select" | "textarea";

interface FieldConfig {
  id: string;
  label: string;
  type: FieldType;
  group: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  full?: boolean;
  default?: string;
  onlyWhenNew?: boolean; // শুধু নতুন SOP তৈরিতে দেখাবে (যেমন companyId)
  showIf?: { field: string; equals: string }; // শর্তসাপেক্ষ ফিল্ড
}

// user runtime-এ যে custom field যোগ করে
interface CustomField {
  id: string;
  label: string;
  type: "input" | "textarea";
  value: string;
}

const FIELD_CONFIG: FieldConfig[] = [
  // ----- ব্যবসার তথ্য -----
  {
    id: "companyId",
    label: "Company ID (UUID) *",
    type: "input",
    group: "ব্যবসার তথ্য",
    placeholder: "e.g. f1767d60...",
    required: true,
    full: true,
    onlyWhenNew: true,
  },
  {
    id: "businessName",
    label: "Business Name *",
    type: "input",
    group: "ব্যবসার তথ্য",
    placeholder: "আপনার ব্যবসার নাম",
    required: true,
  },
  {
    id: "businessType",
    label: "Business Type *",
    type: "select",
    group: "ব্যবসার তথ্য",
    placeholder: "Select...",
    options: ["ecommerce", "service", "restaurant", "education"],
    required: true,
  },
  {
    id: "businessOverview",
    label: "Business Overview",
    type: "textarea",
    group: "ব্যবসার তথ্য",
    placeholder: "বিস্তারিত লিখুন...",
    full: true,
  },
  {
    id: "paymentMethod",
    label: "Payment Method",
    type: "input",
    group: "ব্যবসার তথ্য",
    placeholder: "বিকাশ, নগদ...",
  },

  // ----- AI ব্যক্তিত্ব -----
  {
    id: "requiredAiBehavior",
    label: "AI Behavior",
    type: "select",
    group: "AI ব্যক্তিত্ব",
    placeholder: "Select...",
    options: ["Friendly", "Professional", "Casual", "Formal"],
    default: "Friendly",
  },
  {
    id: "aiName",
    label: "AI Name",
    type: "input",
    group: "AI ব্যক্তিত্ব",
    placeholder: "যেমন: Sadia",
  },
  {
    id: "replyLanguage",
    label: "Language",
    type: "select",
    group: "AI ব্যক্তিত্ব",
    placeholder: "Select...",
    options: ["Bangla", "English"],
  },
  {
    id: "useEmoji",
    label: "Use Emoji?",
    type: "select",
    group: "AI ব্যক্তিত্ব",
    placeholder: "Select...",
    options: ["Yes", "No"],
  },
  {
    id: "addressingStyle",
    label: "Addressing Style",
    type: "select",
    group: "AI ব্যক্তিত্ব",
    placeholder: "Select...",
    options: ["Sir-Mam", "Bhaiya-Apu"],
  },
  {
    id: "greetingStyle",
    label: "Greeting Style",
    type: "select",
    group: "AI ব্যক্তিত্ব",
    placeholder: "Select...",
    options: ["Hi", "Hello", "Assalamu Alaikum"],
  },
  {
    id: "responseLength",
    label: "Response Length",
    type: "select",
    group: "AI ব্যক্তিত্ব",
    placeholder: "Select...",
    options: ["short", "medium", "long"],
  },

  // ----- অর্ডার ও প্রাইসিং -----
  {
    id: "orderProcess",
    label: "Order Process",
    type: "textarea",
    group: "অর্ডার ও প্রাইসিং",
    placeholder: "প্রসেস সম্পর্কে লিখুন...",
    full: true,
  },
  {
    id: "pricingFormat",
    label: "Pricing Format",
    type: "textarea",
    group: "অর্ডার ও প্রাইসিং",
    placeholder: "যেমন: Product Name, Price",
    full: true,
  },
  {
    id: "allowNegotiation",
    label: "Negotiation Policy? *",
    type: "select",
    group: "অর্ডার ও প্রাইসিং",
    placeholder: "Select...",
    options: ["Yes", "No"],
    required: true,
    default: "No",
  },
  {
    id: "negotiationPolicy",
    label: "Negotiation Policy Details",
    type: "textarea",
    group: "অর্ডার ও প্রাইসিং",
    placeholder: "বিস্তারিত...",
    full: true,
    showIf: { field: "allowNegotiation", equals: "Yes" },
  },

  // ----- ডেলিভারি -----
  {
    id: "deliveryTimeInsideDhaka",
    label: "Delivery Time (Inside Dhaka)",
    type: "input",
    group: "ডেলিভারি",
    placeholder: "e.g. 1 day",
  },
  {
    id: "deliveryTimeOutsideDhaka",
    label: "Delivery Time (Outside Dhaka)",
    type: "input",
    group: "ডেলিভারি",
    placeholder: "e.g. 2-3 days",
  },
  {
    id: "deliveryChargeInsideDhaka",
    label: "Delivery Charge (Inside Dhaka)",
    type: "input",
    group: "ডেলিভারি",
    placeholder: "70",
  },
  {
    id: "deliveryChargeOutsideDhaka",
    label: "Delivery Charge (Outside Dhaka)",
    type: "input",
    group: "ডেলিভারি",
    placeholder: "130",
  },

  // ----- পলিসি ও গাইডলাইন -----
  {
    id: "returnPolicy",
    label: "Return Policy",
    type: "textarea",
    group: "পলিসি ও গাইডলাইন",
    placeholder: "রিটার্ন পলিসি...",
    full: true,
  },
  {
    id: "refundPolicy",
    label: "Refund Policy",
    type: "textarea",
    group: "পলিসি ও গাইডলাইন",
    placeholder: "রিফান্ড পলিসি...",
    full: true,
  },
  {
    id: "imageGuidelines",
    label: "Image Guidelines",
    type: "textarea",
    group: "পলিসি ও গাইডলাইন",
    placeholder: "ছবি সংক্রান্ত গাইডলাইন...",
    full: true,
  },
  {
    id: "outOfStockReply",
    label: "Out of Stock Reply",
    type: "input",
    group: "পলিসি ও গাইডলাইন",
    placeholder: "স্টক আউট হলে মেসেজ...",
    full: true,
  },

  // ----- যোগাযোগ -----
  {
    id: "supportPhone",
    label: "Hotline Number",
    type: "input",
    group: "যোগাযোগ",
    placeholder: "09643331232",
  },
  {
    id: "websiteLink",
    label: "Website Link",
    type: "input",
    group: "যোগাযোগ",
    placeholder: "https://example.com",
  },
  {
    id: "contactDetails",
    label: "Contact Details",
    type: "textarea",
    group: "যোগাযোগ",
    placeholder: "যোগাযোগের ঠিকানা...",
    full: true,
  },
];

// প্রতিটি group-এর আইকন (নতুন group যোগ করলে এখানে আইকন দাও, নাহলে default)
const GROUP_ICONS: Record<string, React.ReactNode> = {
  "ব্যবসার তথ্য": <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />,
  "AI ব্যক্তিত্ব": (
    <path d="M12 8V4M8 2h8M3 11h18M5 11v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9M9 16h.01M15 16h.01" />
  ),
  "অর্ডার ও প্রাইসিং": (
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
  ),
  ডেলিভারি: (
    <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 18.5a2.5 2.5 0 1 0 0-.01M18.5 18.5a2.5 2.5 0 1 0 0-.01" />
  ),
  "পলিসি ও গাইডলাইন": <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  যোগাযোগ: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  ),
};
const DEFAULT_ICON = (
  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" />
);


type FormValues = Record<string, string>;

function buildSchema(fields: FieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    shape[f.id] = f.required
      ? z.string().min(1, `${f.label.replace(/\s*\*$/, "")} আবশ্যক`)
      : z.string().optional().or(z.literal(""));
  }
  return z.object(shape);
}

function buildDefaults(fields: FieldConfig[], companyId?: string): FormValues {
  const out: FormValues = {};
  for (const f of fields) out[f.id] = f.default ?? "";
  if (companyId) out.companyId = companyId;
  return out;
}

const inputBase =
  "w-full rounded-xl border bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2";
const okRing = "border-slate-200 focus:border-indigo-400 focus:ring-indigo-100";
const errRing = "border-rose-300 focus:border-rose-400 focus:ring-rose-100";


export default function SOPForm({ companyId }: SOPFormProps) {
  const { status, isFetching, errorMessage, submitSOP, updateSOP, fetchSOP } =
    useSopStore();

  // এই tenant-এ যে ফিল্ডগুলো প্রযোজ্য
  const activeFields = useMemo(
    () => FIELD_CONFIG.filter((f) => !(f.onlyWhenNew && companyId)),
    [companyId],
  );

  const schema = useMemo(() => buildSchema(activeFields), [activeFields]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    // dynamic schema → resolver type cast (runtime ঠিক, শুধু TS mismatch)
    resolver: zodResolver(schema) as any,
    defaultValues: buildDefaults(activeFields, companyId),
  });

  // ----- কাস্টম ফিল্ড (runtime-এ user যোগ করে) -----
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"input" | "textarea">("input");

  const addCustomField = () => {
    const label = newLabel.trim();
    if (!label) return;
    setCustomFields((prev) => [
      ...prev,
      {
        id: `cf_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        label,
        type: newType,
        value: "",
      },
    ]);
    setNewLabel("");
    setNewType("input");
  };
  const updateCustomValue = (id: string, value: string) =>
    setCustomFields((prev) =>
      prev.map((c) => (c.id === id ? { ...c, value } : c)),
    );
  // নোট: custom field একবার যোগ করলে আর মুছে ফেলা যাবে না (ইচ্ছাকৃত)।

  useEffect(() => {
    async function loadExistingData() {
      if (companyId) {
        const existingData = await fetchSOP(companyId);
        if (existingData) {
          // backend answers JSONB বা flat object — দুটোই handle
          const data: any = (existingData as any).answers ?? existingData;
          const { customFields: savedCustom, ...rest } = data || {};
          reset({ ...buildDefaults(activeFields, companyId), ...rest });
          // null value → "" (controlled input warning এড়াতে)
          setCustomFields(
            Array.isArray(savedCustom)
              ? savedCustom.map((c: any) => ({ ...c, value: c.value ?? "" }))
              : [],
          );
        } else {
          setValue("companyId", companyId, { shouldValidate: true });
        }
      }
    }
    loadExistingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const values = watch();

  const isVisible = (f: FieldConfig) =>
    !f.showIf || values[f.showIf.field] === f.showIf.equals;

  const onSubmit = async (data: FormValues) => {
    // hidden শর্তসাপেক্ষ ফিল্ড বাদ দিয়ে payload
    // খালি value → null (DB-তে NULL হিসেবে সেভ হবে)
    const nullIfEmpty = (v: string) => {
      const t = (v ?? "").trim();
      return t === "" ? null : t;
    };

    const payload: Record<string, any> = {};
    for (const f of activeFields) {
      if (isVisible(f)) payload[f.id] = nullIfEmpty(data[f.id]);
    }
    // companyId কখনো null হবে না (required) — সরাসরি বসাই
    if (companyId) payload.companyId = companyId;

    // custom field গুলো answers JSONB-তে; খালি value → null
    payload.customFields = customFields.map((c) => ({
      ...c,
      value: nullIfEmpty(c.value),
    }));

    const isSuccess = await (companyId
      ? updateSOP(payload as any)
      : submitSOP(payload as any));
    if (isSuccess && !companyId) {
      reset(buildDefaults(activeFields));
      setCustomFields([]);
    }
  };


  const groups = useMemo(() => {
    const order: string[] = [];
    const map: Record<string, FieldConfig[]> = {};
    for (const f of activeFields) {
      if (!map[f.group]) {
        map[f.group] = [];
        order.push(f.group);
      }
      map[f.group].push(f);
    }
    return order.map((title) => ({ title, fields: map[title] }));
  }, [activeFields]);

  /* ---------- field renderer ---------- */

  const renderField = (f: FieldConfig) => {
    if (!isVisible(f)) return null;

    const hasError = !!errors[f.id];
    const cls = `${inputBase} ${hasError ? errRing : okRing}`;

    return (
      <div
        key={f.id}
        className={`space-y-1.5 ${f.full ? "md:col-span-2" : ""}`}
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
              className={`${cls} appearance-none pr-9`}
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
          <p className="text-xs text-rose-500">
            {errors[f.id]?.message as string}
          </p>
        )}
      </div>
    );
  };

  /* ---------- loading ---------- */

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-slate-500">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm">লোড হচ্ছে...</p>
      </div>
    );
  }

  /* ---------- form ---------- */

  return (
    <div className="flex flex-col">
      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="text-lg font-bold text-slate-900">
          {companyId ? "ব্যবসার তথ্য আপডেট" : "নতুন ব্যবসার তথ্য"}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          AI অ্যাসিস্ট্যান্ট কীভাবে গ্রাহকদের সাথে কথা বলবে তা নির্ধারণ করুন।
        </p>
      </div>

      {status === "error" && (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <span className="mt-0.5">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}
      {status === "success" && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>✅</span>
          <span>তথ্য সংরক্ষণ করা হয়েছে!</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6">
        <div className="space-y-8">
          {groups.map((group) => {
            const visible = group.fields.filter(isVisible);
            if (visible.length === 0) return null;

            return (
              <section key={group.title}>
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {GROUP_ICONS[group.title] ?? DEFAULT_ICON}
                    </svg>
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    {group.title}
                  </h3>
                  <span className="h-px flex-1 bg-slate-100" />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {group.fields.map(renderField)}
                </div>
              </section>
            );
          })}
        </div>

        {/* ---------- কাস্টম ফিল্ড (Add Field) ---------- */}
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
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
            <h3 className="text-sm font-bold text-slate-800">কাস্টম ফিল্ড</h3>
            <span className="h-px flex-1 bg-slate-100" />
          </div>

          {customFields.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {customFields.map((cf) => (
                <div
                  key={cf.id}
                  className={`space-y-1.5 ${cf.type === "textarea" ? "md:col-span-2" : ""}`}
                >
                  <label className="block text-xs font-semibold text-slate-600">
                    {cf.label}
                  </label>
                  {cf.type === "textarea" ? (
                    <textarea
                      value={cf.value}
                      onChange={(e) => updateCustomValue(cf.id, e.target.value)}
                      rows={3}
                      className={`${inputBase} ${okRing} resize-y`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={cf.value}
                      onChange={(e) => updateCustomValue(cf.id, e.target.value)}
                      className={`${inputBase} ${okRing}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Field composer */}
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3 sm:flex-row sm:items-end">
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
                    addCustomField();
                  }
                }}
                placeholder="যেমন: Facebook Page Link"
                className={`${inputBase} ${okRing}`}
              />
            </div>

            <button
              type="button"
              onClick={addCustomField}
              disabled={!newLabel.trim()}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
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
              Add Field
            </button>
          </div>
          <p className="hidden mt-4 text-xs text-slate-400 sm:block">
            Note: আপনি যত বেশি কাস্টম ফিল্ড যোগ করবেন, তত বেশি AI প্রসেসিং খরচ বৃদ্ধি
            পাবে।
          </p>
        </section>

        <div className="mt-8 flex items-center justify-center gap-4 border-t border-slate-100 pt-5">
         
          <button
            type="submit"
            disabled={status === "submitting"}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {status === "submitting" ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                সংরক্ষণ হচ্ছে...
              </>
            ) : companyId ? (
              "আপডেট করুন"
            ) : (
              "সাবমিট করুন"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
