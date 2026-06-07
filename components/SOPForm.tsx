"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sopSchema, type SOPFormData } from "../lib/sopSchema";
import { useSopStore } from "../store/useSopStore";

export default function SOPForm() {
  const { status, errorMessage, submitSOP } = useSopStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SOPFormData>({
    resolver: zodResolver(sopSchema),
    defaultValues: {
      businessOverview: "",
      requiredAiBehavior: "Friendly",
      orderProcess: "",
      deliveryCharges: "",
      paymentMethod: "",
      imageGuidelines: "",
      negotiationPolicy: "",
    },
  });

  const onSubmit = async (data: SOPFormData) => {
    await submitSOP(data);
  };

  const formSections = [
    {
      id: "businessOverview",
      label: "Business Overview",
      type: "textarea",
      placeholder: "আপনার বিসনেস সম্পর্কে লিখুন...",
    },
    {
      id: "requiredAiBehavior",
      label: "Required AI Behavior",
      type: "select",
      options: ["Friendly", "Professional", "Casual", "Formal"],
    },
    {
      id: "orderProcess",
      label: "Order Process",
      type: "textarea",
      placeholder: "অর্ডার প্রসেস বর্ণনা করুন...",
    },
    {
      id: "deliveryCharges",
      label: "Delivery Charges",
      type: "input",
      placeholder: "ডেলিভারি চার্জ...",
    },
    {
      id: "paymentMethod",
      label: "Payment Method",
      type: "input",
      placeholder: "বিকাশ, নগদ, বা ক্যাশ অন ডেলিভারি...",
    },
    {
      id: "imageGuidelines",
      label: "Image Guidelines",
      type: "textarea",
      placeholder: "ইমেজ গাইডলাইন...",
    },
    {
      id: "negotiationPolicy",
      label: "Negotiation Policy",
      type: "textarea",
      placeholder: "নেগোশিয়েশন পলিসি...",
    },
  ] as const;

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          <header className="border-b border-slate-100 pb-6 text-center">
            <h2 className="text-2xl font-bold text-slate-900">
              Your Business Form
            </h2>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formSections.map((section) => (
                <div
                  key={section.id}
                  className={`space-y-2 ${section.type === "textarea" ? "md:col-span-2" : "col-span-1"}`}
                >
                  <label className="text-sm font-semibold text-slate-700">
                    {section.label}
                  </label>

                  {section.type === "textarea" ? (
                    <textarea
                      {...register(section.id as keyof SOPFormData)}
                      placeholder={section.placeholder}
                      rows={3}
                      className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-sm focus:ring-2 transition-all ${errors[section.id as keyof SOPFormData] ? "border-rose-400 focus:ring-rose-500/50" : "border-slate-200 focus:ring-indigo-500/50"}`}
                      disabled={status === "submitting"}
                    />
                  ) : section.type === "select" ? (
                    <select
                      {...register(section.id as keyof SOPFormData)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                      disabled={status === "submitting"}
                    >
                      {section.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      {...register(section.id as keyof SOPFormData)}
                      placeholder={section.placeholder}
                      className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-sm focus:ring-2 transition-all ${errors[section.id as keyof SOPFormData] ? "border-rose-400 focus:ring-rose-500/50" : "border-slate-200 focus:ring-indigo-500/50"}`}
                      disabled={status === "submitting"}
                    />
                  )}
                  {errors[section.id as keyof SOPFormData] && (
                    <p className="text-xs text-rose-500 font-medium">
                      {errors[section.id as keyof SOPFormData]?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-center">
              <button
                type="submit"
                disabled={status === "submitting"}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-70"
              >
                {status === "submitting" ? "সংরক্ষণ হচ্ছে..." : "Submit Form"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
