"use client";

import React, { useState, useTransition } from "react";
import {
  Save,
  Building2,
  Bot,
  ShoppingCart,
  Truck,
  CreditCard,
  Smile,
  Image as ImageIcon,
  Handshake,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

const WEBHOOK_URL = "https://server.presswayy.com/webhook/sop";

export default function SOPForm() {
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    businessOverview: "",
    requiredAiBehavior: "",
    orderProcess: "",
    deliveryCharges: "",
    paymentMethod: "",
    emojiUsageRules: "",
    imageGuidelines: "",
    negotiationPolicy: "",
    unknownQueryHandling: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // UI ট্রানজিশন স্মুথ রাখার জন্য useTransition ব্যবহার করা হয়েছে
    startTransition(async () => {
      setStatus("submitting");
      setErrorMessage("");

      try {
        const response = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            company_id: "f1767d60-ac8c-485a-b89a-ab739cf48f5f", // আপনার আগের প্লাগইনের আইডি অনুযায়ী রাখা হলো, প্রয়োজন না হলে বাদ দিতে পারেন
            ...formData,
          }),
        });

        if (response.ok) {
          setStatus("success");
          // ৩ সেকেন্ড পর সাকসেস মেসেজ হাইড করে ফর্ম রিসেট করতে চাইলে করতে পারেন
          setTimeout(() => setStatus("idle"), 4000);
        } else {
          setStatus("error");
          setErrorMessage(`সার্ভার রেসপন্স এরর কোড: ${response.status}`);
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          "নেটওয়ার্ক কানেকশন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
        );
      }
    });
  };

  const formSections = [
    {
      id: "businessOverview",
      label: "Business Overview",
      icon: <Building2 className="w-4 h-4" />,
      type: "textarea",
      placeholder:
        "Describe the core business, target audience, and primary value proposition...",
    },
    {
      id: "requiredAiBehavior",
      label: "Required AI Behavior",
      icon: <Bot className="w-4 h-4" />,
      type: "textarea",
      placeholder:
        "Define the persona, tone of voice, and strict behavioral boundaries for the AI...",
    },
    {
      id: "orderProcess",
      label: "Order Process",
      icon: <ShoppingCart className="w-4 h-4" />,
      type: "textarea",
      placeholder:
        "Step-by-step guide on how customers place orders and how they are fulfilled...",
    },
    {
      id: "deliveryCharges",
      label: "Delivery Charges",
      icon: <Truck className="w-4 h-4" />,
      type: "input",
      placeholder: "e.g., Inside Dhaka: 60 BDT, Outside Dhaka: 120 BDT",
    },
    {
      id: "paymentMethod",
      label: "Payment Method",
      icon: <CreditCard className="w-4 h-4" />,
      type: "input",
      placeholder: "e.g., bKash, Nagad, Cash on Delivery (COD), Card",
    },
    {
      id: "emojiUsageRules",
      label: "Emoji Usage Rules",
      icon: <Smile className="w-4 h-4" />,
      type: "input",
      placeholder: "e.g., Maximum 2 per message, no informal emojis like 🤪",
    },
    {
      id: "imageGuidelines",
      label: "Image Guidelines",
      icon: <ImageIcon className="w-4 h-4" />,
      type: "textarea",
      placeholder:
        "Rules for sharing product images, size charts, or requesting images from users...",
    },
    {
      id: "negotiationPolicy",
      label: "Negotiation Policy",
      icon: <Handshake className="w-4 h-4" />,
      type: "textarea",
      placeholder:
        "State whether prices are fixed or outline approved discount margins...",
    },
    {
      id: "unknownQueryHandling",
      label: "Unknown Query Handling",
      icon: <HelpCircle className="w-4 h-4" />,
      type: "textarea",
      placeholder:
        "Instructions for when the AI cannot answer (e.g., escalate to human agent)...",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          <header className="space-y-2 border-b border-slate-100 pb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              AI Standard Operating Procedure (SOP)
            </h2>
            <p className="text-sm text-slate-500">
              Configure the foundational knowledge, behavioral rules, and
              business policies for your AI agent.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formSections.map((section) => (
                <div
                  key={section.id}
                  className={`space-y-2 ${
                    section.type === "textarea" ? "md:col-span-2" : "col-span-1"
                  }`}
                >
                  <label
                    htmlFor={section.id}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                  >
                    <span className="text-indigo-500">{section.icon}</span>
                    {section.label}
                  </label>

                  {section.type === "textarea" ? (
                    <textarea
                      id={section.id}
                      name={section.id}
                      value={formData[section.id as keyof typeof formData]}
                      onChange={handleChange}
                      placeholder={section.placeholder}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-y"
                      required
                      disabled={status === "submitting" || isPending}
                    />
                  ) : (
                    <input
                      type="text"
                      id={section.id}
                      name={section.id}
                      value={formData[section.id as keyof typeof formData]}
                      onChange={handleChange}
                      placeholder={section.placeholder}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      required
                      disabled={status === "submitting" || isPending}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* স্ট্যাটাস নোটিফিকেশন জোন */}
            <div className="space-y-4 pt-4">
              {status === "success" && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-3 text-emerald-800 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold">সাফল্যের সাথে সেভ হয়েছে!</p>
                    <p className="opacity-80">
                      SOP ডাটাবেজে কনফিগারেশন আপডেট সম্পন্ন হয়েছে।
                    </p>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 text-rose-800 animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold">অপারেশন ব্যর্থ হয়েছে</p>
                    <p className="opacity-80">{errorMessage}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={status === "submitting" || isPending}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-100"
              >
                {status === "submitting" || isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {status === "submitting" || isPending
                  ? "সংরক্ষণ হচ্ছে..."
                  : "Save SOP Configuration"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
