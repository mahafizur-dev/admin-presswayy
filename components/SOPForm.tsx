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
    watch,
    setValue,
    formState: { errors },
  } = useForm<SOPFormData>({
    resolver: zodResolver(sopSchema),
    defaultValues: {
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
      allowNegotiation: "No", // ডিফল্টভাবে No থাকবে
      negotiationPolicy: "No", // ডিফল্ট ভ্যালু No সেট করা হলো
      pricingFormat: "",
      returnPolicy: "",
      refundPolicy: "",
      supportPhone: "",
      websiteLink: "",
      contactDetails: "",
      outOfStockReply: "",
    },
  });

  const allowNegotiation = watch("allowNegotiation");

  // এই ইফেক্টটি dropdown চেঞ্জ হলে টেক্সট এরিয়ার ভ্যালু কন্ট্রোল করবে
  React.useEffect(() => {
    if (allowNegotiation === "No") {
      setValue("negotiationPolicy", "No", { shouldValidate: true });
    } else if (
      allowNegotiation === "Yes" &&
      watch("negotiationPolicy") === "No"
    ) {
      setValue("negotiationPolicy", "", { shouldValidate: true }); // ইউজার যেন লিখতে পারে তাই খালি করে দেওয়া হলো
    }
  }, [allowNegotiation, setValue, watch]);

  const onSubmit = async (data: SOPFormData) => {
    await submitSOP(data);
  };

  const formSections = [
    {
      id: "businessName",
      label: "Business Name *",
      type: "input",
      placeholder: "আপনার ব্যবসা বা ব্র্যান্ডের নাম",
    },
    {
      id: "businessType",
      label: "Business Type *",
      type: "select",
      placeholder: "Select an option ...",
      options: ["ecommerce", "service", "restaurant", "education"],
    },
    {
      id: "businessOverview",
      label: "Business Overview",
      type: "textarea",
      placeholder:
        "সংক্ষিপ্ত ভাবে আপনার বিসনেস এর ডিটেলস বলেন... যেমন আপনার বিসনেস কিভাবে পরিচালনা করেন",
    },
    {
      id: "requiredAiBehavior",
      label: "How to make AI behavior with Customer",
      type: "select",
      placeholder: "AI এর আচরণ বা টোন নির্বাচন করুন...",
      options: ["Friendly", "Professional", "Casual", "Formal"],
    },
    {
      id: "aiName",
      label: "What is your AI assistant's name?",
      type: "input",
      placeholder: "AI assistant এর নাম (যেমন: Sadia, Jasa)",
    },
    {
      id: "replyLanguage",
      label: "Select Your AI Reply Language",
      type: "select",
      placeholder: "Select an option ...",
      options: ["Bangla", "English"],
    },
    {
      id: "useEmoji",
      label: "Do you want to use emoji?",
      type: "select",
      placeholder: "Select an option ...",
      options: ["Yes", "No"],
    },
    {
      id: "addressingStyle",
      label: "How do you want to address the customer?",
      type: "select",
      placeholder: "Select an option ...",
      options: ["Sir-Mam", "Bhaiya-Apu"],
    },
    {
      id: "greetingStyle",
      label: "How do you want to greet the customer?",
      type: "select",
      placeholder: "Select an option ...",
      options: ["Hi", "Hello", "Assalamu Alaikum"],
    },
    {
      id: "responseLength",
      label: "Choose your AI response length",
      type: "select",
      placeholder: "Select an option ...",
      options: ["short", "medium", "long"],
    },
    {
      id: "paymentMethod",
      label: "What is your Payment Method",
      type: "input",
      placeholder: "বিকাশ, নগদ, বা ক্যাশ অন ডেলিভারি...",
    },
    {
      id: "orderProcess",
      label: "What is your order process?",
      type: "textarea",
      placeholder:
        "অর্ডার সম্পন্ন করার জন্য গ্রাহকের কাছ থেকে কোন তথ্য সংগ্রহ করতে হবে? গ্রাহকের নাম, মোবাইল নম্বর, ঠিকানা, পণ্যের নাম, পণ্যের পরিমাণ (Quantity)",
    },
    {
      id: "pricingFormat",
      label: "How to display Pricing Format",
      type: "textarea",
      placeholder:
        "যেমন:Product Name,Product Regular Price, Product Offer Price",
    },
    {
      id: "deliveryTimeInsideDhaka",
      label: "Delivery Time Inside Dhaka",
      type: "input",
      placeholder: "e.g. 1 day",
    },
    {
      id: "deliveryTimeOutsideDhaka",
      label: "Delivery Time Outside Dhaka",
      type: "input",
      placeholder: "e.g. 2 to 3 days",
    },
    {
      id: "deliveryChargeInsideDhaka",
      label: "Delivery Charge Inside Dhaka (BDT)",
      type: "input",
      placeholder: "e.g. 70",
    },
    {
      id: "deliveryChargeOutsideDhaka",
      label: "Delivery Charge Outside Dhaka (BDT)",
      type: "input",
      placeholder: "e.g. 130",
    },

    {
      id: "returnPolicy",
      label: "If have any Return Policy",
      type: "textarea",
      placeholder:
        "আপনার যদি রিটার্ন পলিসি থাকে, তবে এখানে লিখুন। অথবা রিটার্ন পলিসির ওয়েবসাইট লিংক থাকলে লিংকটি পেস্ট করুন।",
    },
    {
      id: "refundPolicy",
      label: "If have any Refund Policy",
      type: "textarea",
      placeholder:
        "আপনার যদি রিফান্ড পলিসি থাকে, তবে এখানে লিখুন। অথবা রিফান্ড পলিসির ওয়েবসাইট লিংক থাকলে লিংকটি পেস্ট করুন।",
    },
    {
      id: "imageGuidelines",
      label: "Image Guidelines",
      type: "textarea",
      placeholder:
        "গ্রাহক ছবি চাইলে, AI প্রতি মেসেজে কতগুলো ছবি পাঠাবে? প্রতি মেসেজে ছবির সর্বোচ্চ সীমা ২৫টি।",
    },
    {
      id: "allowNegotiation",
      label: "Do you have a Negotiation Policy? *",
      type: "select",
      placeholder: "Select an option ...",
      options: ["Yes", "No"],
    },
    {
      id: "negotiationPolicy",
      label: "Negotiation Policy Details",
      type: "textarea",
      placeholder: "নেগোশিয়েশন পলিসি...",
    },
    {
      id: "supportPhone",
      label: "Your Hot Line Number",
      type: "input",
      placeholder: "e.g. 09643331232",
    },
    {
      id: "outOfStockReply",
      label: "How to respond when the product is Out of Stock",
      type: "input",
      placeholder:
        "যদি পণ্যটি বর্তমানে স্টকে না থাকে, তাহলে গ্রাহককে কী ধরনের উত্তর প্রদান করা হবে তা এখানে লিখুন।",
    },
    {
      id: "websiteLink",
      label: "Your Website Link",
      type: "input",
      placeholder: "https://example.com",
    },
    {
      id: "contactDetails",
      label: "Your Contact Details",
      type: "textarea",
      placeholder: "এখানে সম্পূর্ণ ঠিকানাসহ আপনার যোগাযোগের তথ্য লিখুন।",
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
              {formSections.map((section) => {
                if (
                  section.id === "negotiationPolicy" &&
                  allowNegotiation !== "Yes"
                ) {
                  return null;
                }

                return (
                  <div
                    key={section.id}
                    className={`space-y-2 ${section.type === "textarea" ? "md:col-span-2" : "col-span-1"}`}
                  >
                    <label className="text-sm font-semibold text-slate-700">
                      {section.label.split(" *")[0]}
                      {section.label.includes("*") && (
                        <span className="text-rose-500 ml-1">*</span>
                      )}
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
                        className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-sm focus:ring-2 transition-all outline-none ${errors[section.id as keyof SOPFormData] ? "border-rose-400 focus:ring-rose-500/50" : "border-slate-200 focus:ring-indigo-500/50"}`}
                        disabled={status === "submitting"}
                      >
                        {"placeholder" in section && (
                          <option value="" disabled hidden>
                            {section.placeholder}
                          </option>
                        )}
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
                );
              })}
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
