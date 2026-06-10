"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sopSchema, type SOPFormData } from "../lib/sopSchema";
import { useSopStore } from "../store/useSopStore";

interface SOPFormProps {
  companyId?: string;
}

export default function SOPForm({ companyId }: SOPFormProps) {
  const { status, isFetching, errorMessage, submitSOP, updateSOP, fetchSOP } =
    useSopStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<SOPFormData>({
    resolver: zodResolver(sopSchema),
    defaultValues: {
      companyId: companyId || "",
      businessName: "",
      businessType: "",
      businessOverview: "",
      requiredAiBehavior: "Friendly",
      aiName: "",
      replyLanguage: "",
      useEmoji: "",
      addressingStyle: "",
      greetingStyle: "",
      responseLength: "",
      orderProcess: "",
      deliveryTimeInsideDhaka: "",
      deliveryTimeOutsideDhaka: "",
      deliveryChargeInsideDhaka: "",
      deliveryChargeOutsideDhaka: "",
      paymentMethod: "",
      imageGuidelines: "",
      allowNegotiation: "No",
      negotiationPolicy: "No",
      pricingFormat: "",
      returnPolicy: "",
      refundPolicy: "",
      supportPhone: "",
      websiteLink: "",
      contactDetails: "",
      outOfStockReply: "",
    },
  });

  useEffect(() => {
    async function loadExistingData() {
      if (companyId) {
        const existingData = await fetchSOP(companyId);
        if (existingData) {
          reset(existingData);
        } else {
          setValue("companyId", companyId, { shouldValidate: true });
        }
      }
    }
    loadExistingData();
  }, [companyId, fetchSOP, reset, setValue]);

  const allowNegotiation = watch("allowNegotiation");

  useEffect(() => {
    if (allowNegotiation === "No") {
      setValue("negotiationPolicy", "No", { shouldValidate: true });
    } else if (
      allowNegotiation === "Yes" &&
      watch("negotiationPolicy") === "No"
    ) {
      setValue("negotiationPolicy", "", { shouldValidate: true });
    }
  }, [allowNegotiation, setValue, watch]);

  // আপডেট করা সাবমিট লজিক
  const onSubmit = async (data: SOPFormData) => {
    const isSuccess = await (companyId ? updateSOP(data) : submitSOP(data));
    if (isSuccess && !companyId) {
      reset();
    }
  };

  const formSections = [
    ...(!companyId
      ? [
          {
            id: "companyId",
            label: "Company ID (UUID) *",
            type: "input",
            placeholder: "e.g. f1767d60...",
          },
        ]
      : []),
    {
      id: "businessName",
      label: "Business Name *",
      type: "input",
      placeholder: "আপনার ব্যবসার নাম",
    },
    {
      id: "businessType",
      label: "Business Type *",
      type: "select",
      placeholder: "Select...",
      options: ["ecommerce", "service", "restaurant", "education"],
    },
    {
      id: "businessOverview",
      label: "Business Overview",
      type: "textarea",
      placeholder: "বিস্তারিত লিখুন...",
    },
    {
      id: "requiredAiBehavior",
      label: "AI Behavior",
      type: "select",
      placeholder: "Select...",
      options: ["Friendly", "Professional", "Casual", "Formal"],
    },
    {
      id: "aiName",
      label: "AI Name",
      type: "input",
      placeholder: "যেমন: Sadia",
    },
    {
      id: "replyLanguage",
      label: "Language",
      type: "select",
      placeholder: "Select...",
      options: ["Bangla", "English"],
    },
    {
      id: "useEmoji",
      label: "Use Emoji?",
      type: "select",
      placeholder: "Select...",
      options: ["Yes", "No"],
    },
    {
      id: "addressingStyle",
      label: "Addressing Style",
      type: "select",
      placeholder: "Select...",
      options: ["Sir-Mam", "Bhaiya-Apu"],
    },
    {
      id: "greetingStyle",
      label: "Greeting Style",
      type: "select",
      placeholder: "Select...",
      options: ["Hi", "Hello", "Assalamu Alaikum"],
    },
    {
      id: "responseLength",
      label: "Response Length",
      type: "select",
      placeholder: "Select...",
      options: ["short", "medium", "long"],
    },
    {
      id: "paymentMethod",
      label: "Payment Method",
      type: "input",
      placeholder: "বিকাশ, নগদ...",
    },
    {
      id: "orderProcess",
      label: "Order Process",
      type: "textarea",
      placeholder: "প্রসেস সম্পর্কে লিখুন...",
    },
    {
      id: "pricingFormat",
      label: "Pricing Format",
      type: "textarea",
      placeholder: "যেমন: Product Name, Price",
    },
    {
      id: "deliveryTimeInsideDhaka",
      label: "Delivery Time (Inside Dhaka)",
      type: "input",
      placeholder: "e.g. 1 day",
    },
    {
      id: "deliveryTimeOutsideDhaka",
      label: "Delivery Time (Outside Dhaka)",
      type: "input",
      placeholder: "e.g. 2-3 days",
    },
    {
      id: "deliveryChargeInsideDhaka",
      label: "Delivery Charge (Inside Dhaka)",
      type: "input",
      placeholder: "70",
    },
    {
      id: "deliveryChargeOutsideDhaka",
      label: "Delivery Charge (Outside Dhaka)",
      type: "input",
      placeholder: "130",
    },
    {
      id: "returnPolicy",
      label: "Return Policy",
      type: "textarea",
      placeholder: "রিটার্ন পলিসি...",
    },
    {
      id: "refundPolicy",
      label: "Refund Policy",
      type: "textarea",
      placeholder: "রিফান্ড পলিসি...",
    },
    {
      id: "imageGuidelines",
      label: "Image Guidelines",
      type: "textarea",
      placeholder: "ছবি সংক্রান্ত গাইডলাইন...",
    },
    {
      id: "allowNegotiation",
      label: "Negotiation Policy? *",
      type: "select",
      placeholder: "Select...",
      options: ["Yes", "No"],
    },
    {
      id: "negotiationPolicy",
      label: "Negotiation Policy Details",
      type: "textarea",
      placeholder: "বিস্তারিত...",
    },
    {
      id: "supportPhone",
      label: "Hot Line Number",
      type: "input",
      placeholder: "09643331232",
    },
    {
      id: "outOfStockReply",
      label: "Out of Stock Reply",
      type: "input",
      placeholder: "স্টক আউট হলে মেসেজ...",
    },
    {
      id: "websiteLink",
      label: "Website Link",
      type: "input",
      placeholder: "https://example.com",
    },
    {
      id: "contactDetails",
      label: "Contact Details",
      type: "textarea",
      placeholder: "যোগাযোগের ঠিকানা...",
    },
  ] as const;

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        লোড হচ্ছে...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl border shadow-xl p-8">
        <header className="border-b pb-6 text-center">
          <h2 className="text-2xl font-bold">
            {companyId ? "Update Business SOP" : "Create Business SOP"}
          </h2>
        </header>

        {status === "error" && (
          <div className="p-4 bg-rose-50 text-rose-600 rounded-xl">
            {errorMessage}
          </div>
        )}
        {status === "success" && (
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl text-center">
            SOP সফলভাবে সংরক্ষণ করা হয়েছে!
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formSections.map((section) => {
              if (
                section.id === "negotiationPolicy" &&
                allowNegotiation !== "Yes"
              )
                return null;

              const isTextArea = section.type === "textarea";
              const isSelect = section.type === "select";

              return (
                <div
                  key={section.id}
                  className={`space-y-2 ${isTextArea ? "md:col-span-2" : "col-span-1"}`}
                >
                  <label className="text-sm font-semibold text-slate-700">
                    {section.label}
                  </label>
                  {isTextArea ? (
                    <textarea
                      {...register(section.id as keyof SOPFormData)}
                      className="w-full p-3 border rounded-xl"
                      rows={3}
                    />
                  ) : isSelect ? (
                    <select
                      {...register(section.id as keyof SOPFormData)}
                      className="w-full p-3 border rounded-xl"
                    >
                      <option value="" disabled hidden>
                        {section.placeholder}
                      </option>

                      {/* এখানে "options" in section চেকটি ব্যবহার করুন */}
                      {("options" in section ? section.options : []).map(
                        (opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ),
                      )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      {...register(section.id as keyof SOPFormData)}
                      className="w-full p-3 border rounded-xl"
                      placeholder={section.placeholder}
                    />
                  )}
                  {errors[section.id as keyof SOPFormData] && (
                    <p className="text-xs text-rose-500">
                      {errors[section.id as keyof SOPFormData]?.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold"
          >
            {status === "submitting" ? "সংরক্ষণ হচ্ছে..." : "Submit Form"}
          </button>
        </form>
      </div>
    </div>
  );
}
