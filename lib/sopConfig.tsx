import React from "react";
import type { FieldConfig } from "./sopTypes";

// service ব্যবসায় বাদ / শুধু service ব্যবসায় দেখানোর নিয়ম
const HIDE_FOR_SERVICE = { field: "businessType", in: ["service"] };
const SERVICE_ONLY = { field: "businessType", in: ["service"] };

export const FIELD_CONFIG: FieldConfig[] = [
  // ── ব্যবসার তথ্য ────────────────────────────────────────────────────────────
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
    label: "Business Name - আপনার ব্যবসার নাম লিখুন *",
    type: "input",
    group: "ব্যবসার তথ্য",
    placeholder: "আপনার ব্যবসার নাম লিখুন",
    required: true,
  },
  {
    id: "businessType",
    label: "Business Type - আপনার ব্যবসার ধরন নির্বাচন করুন *",
    type: "select",
    group: "ব্যবসার তথ্য",
    placeholder: "ব্যবসার ধরন নির্বাচন করুন",
    options: ["ecommerce", "service"],
    required: true,
  },
  {
    id: "businessOverview",
    label: "Business Overview - আপনার ব্যবসা সম্পর্কে বিস্তারিত লিখুন *",
    type: "textarea",
    group: "ব্যবসার তথ্য",
    placeholder:
      "আপনার ব্যবসা কী ধরনের, কী কী পণ্য বা সেবা দেন—বিস্তারিত লিখুন",
    full: true,
    required: true,
  },
  {
    id: "paymentMethod",
    label: "Payment Method - আপনার পেমেন্ট মাধ্যম লিখুন *",
    type: "input",
    group: "ব্যবসার তথ্য",
    placeholder: "যেমন: বিকাশ, নগদ, ক্যাশ অন ডেলিভারি ইত্যাদি",
    required: true,
    hideIf: HIDE_FOR_SERVICE, // service-এ পেমেন্ট মেথড দরকার নেই
  },

  // ── AI কনফিগারেশন ───────────────────────────────────────────────────────────
  {
    id: "requiredAiBehavior",
    label: "AI Behavior - AI কীভাবে কথা বলবে নির্বাচন করুন *",
    type: "select",
    group: "AI কনফিগারেশন",
    placeholder: "AI-এর আচরণ নির্বাচন করুন",
    options: ["Friendly", "Professional", "Casual", "Formal"],
    default: "Friendly",
    required: true,
  },
  {
    id: "aiName",
    label: "AI Name - আপনার AI-এর নাম লিখুন *",
    type: "input",
    group: "AI কনফিগারেশন",
    placeholder: "যেমন: Sadia, Jasa, Emad",
    required: true,
  },
  {
    id: "replyLanguage",
    label: "Language - AI কোন ভাষায় রিপ্লাই দেবে নির্বাচন করুন *",
    type: "select",
    group: "AI কনফিগারেশন",
    placeholder: "ভাষা নির্বাচন করুন",
    options: ["Bangla", "English"],
    required: true,
  },
  {
    id: "useEmoji",
    label: "Use Emoji - রিপ্লাইতে ইমোজি ব্যবহার করবে কি? *",
    type: "select",
    group: "AI কনফিগারেশন",
    placeholder: "ইমোজি ব্যবহার নির্বাচন করুন",
    options: ["Yes", "No"],
    default: "Yes",
  },
  {
    id: "addressingStyle",
    label: "Addressing Style - কাস্টমারকে কীভাবে সম্বোধন করবে নির্বাচন করুন *",
    type: "select",
    group: "AI কনফিগারেশন",
    placeholder: "সম্বোধনের ধরন নির্বাচন করুন",
    options: ["Sir-Mam", "Bhaiya-Apu"],
    required: true,
  },
  {
    id: "greetingStyle",
    label: "Greeting Style - AI কীভাবে শুভেচ্ছা জানাবে নির্বাচন করুন *",
    type: "select",
    group: "AI কনফিগারেশন",
    placeholder: "শুভেচ্ছার ধরন নির্বাচন করুন",
    options: ["Hi", "Hello", "Assalamu Alaikum"],
    required: true,
  },
  {
    id: "responseLength",
    label: "Response Length - রিপ্লাই কতটা বড় হবে নির্বাচন করুন *",
    type: "select",
    group: "AI কনফিগারেশন",
    placeholder: "রিপ্লাইয়ের দৈর্ঘ্য নির্বাচন করুন",
    options: ["short", "medium", "long"],
    required: true,
  },

  // ── অর্ডার ও প্রাইসিং (service-এ বাদ) ────────────────────────────────────────
  {
    id: "pricingFormat",
    label: "Pricing Format - প্রাইস কীভাবে দেখাবে লিখুন",
    type: "textarea",
    group: "অর্ডার ও প্রাইসিং",
    placeholder: "যেমন: পণ্যের নাম, সাইজ, দাম, অফার প্রাইস ইত্যাদি",
    full: true,
    hideIf: HIDE_FOR_SERVICE,
  },
  {
    id: "allowNegotiation",
    label: "Negotiation Policy - দাম নিয়ে আলোচনা করা যাবে কি? *",
    type: "select",
    group: "অর্ডার ও প্রাইসিং",
    placeholder: "নির্বাচন করুন",
    options: ["Yes", "No"],
    required: true,
    default: "No",
    hideIf: HIDE_FOR_SERVICE,
  },
  {
    id: "negotiationPolicy",
    label: "Negotiation Policy Details - দাম নিয়ে আলোচনার নিয়ম লিখুন",
    type: "textarea",
    group: "অর্ডার ও প্রাইসিং",
    placeholder: "দাম কমানো যাবে কি না, কীভাবে উত্তর দেবে—বিস্তারিত লিখুন",
    full: true,
    showIf: { field: "allowNegotiation", equals: "Yes" },
    hideIf: HIDE_FOR_SERVICE,
  },

  // ── FAQ (শুধু service) — STARTER, edit as needed ──────────────────────────
  {
    id: "faqList",
    label: "FAQ - সাধারণ প্রশ্ন ও উত্তরগুলো লিখুন",
    type: "textarea",
    group: "FAQ",
    placeholder:
      "প্র: সার্ভিস চার্জ কত?\nউ: ...\n\nপ্র: কত দিনে কাজ শেষ হয়?\nউ: ...",
    full: true,
    showIf: SERVICE_ONLY,
  },

  // ── ডেলিভারি (service-এ বাদ) ─────────────────────────────────────────────────
  {
    id: "deliveryTimeInsideDhaka",
    label: "Delivery Time Inside Dhaka - ঢাকার ভিতরে ডেলিভারি সময় লিখুন *",
    type: "input",
    group: "ডেলিভারি",
    placeholder: "যেমন: ১ দিন",
    required: true,
    hideIf: HIDE_FOR_SERVICE,
  },
  {
    id: "deliveryTimeOutsideDhaka",
    label: "Delivery Time Outside Dhaka - ঢাকার বাইরে ডেলিভারি সময় লিখুন *",
    type: "input",
    group: "ডেলিভারি",
    placeholder: "যেমন: ২-৩ দিন",
    required: true,
    hideIf: HIDE_FOR_SERVICE,
  },
  {
    id: "deliveryChargeInsideDhaka",
    label: "Delivery Charge Inside Dhaka - ঢাকার ভিতরে ডেলিভারি চার্জ লিখুন",
    type: "input",
    group: "ডেলিভারি",
    placeholder: "যেমন: 70",
    hideIf: HIDE_FOR_SERVICE,
  },
  {
    id: "deliveryChargeOutsideDhaka",
    label: "Delivery Charge Outside Dhaka - ঢাকার বাইরে ডেলিভারি চার্জ লিখুন",
    type: "input",
    group: "ডেলিভারি",
    placeholder: "যেমন: 130",
    hideIf: HIDE_FOR_SERVICE,
  },

  // ── পলিসি ও গাইডলাইন (service-এ বাদ) ─────────────────────────────────────────
  {
    id: "returnPolicy",
    label: "Return Policy - রিটার্ন পলিসি লিখুন",
    type: "textarea",
    group: "পলিসি ও গাইডলাইন",
    placeholder: "কোন অবস্থায় রিটার্ন করা যাবে, সময়সীমা কত—বিস্তারিত লিখুন",
    full: true,
    hideIf: HIDE_FOR_SERVICE,
  },
  {
    id: "refundPolicy",
    label: "Refund Policy - রিফান্ড পলিসি লিখুন",
    type: "textarea",
    group: "পলিসি ও গাইডলাইন",
    placeholder: "রিফান্ড করা যাবে কি না, কীভাবে করা হবে—বিস্তারিত লিখুন",
    full: true,
    hideIf: HIDE_FOR_SERVICE,
  },
  {
    id: "imageGuidelines",
    label: "Image Guidelines - ছবি সম্পর্কিত গাইডলাইন লিখুন *",
    type: "textarea",
    group: "পলিসি ও গাইডলাইন",
    placeholder:
      "AI ছবি কীভাবে ব্যবহার করবে বা ছবির ক্ষেত্রে কী নিয়ম মানবে—বিস্তারিত লিখুন",
    full: true,
    required: true,
    hideIf: HIDE_FOR_SERVICE,
  },
  {
    id: "imageRecognition",
    label: "Image Recognition - ছবি কীভাবে শনাক্ত করবে গাইডলাইন লিখুন *",
    type: "textarea",
    group: "পলিসি ও গাইডলাইন",
    placeholder:
      "AI যেন আমনের প্রোডাক্টের ছবি ঠিকঠাক চিনতে পারে, হেইডার বিস্তারিত কইরা লেখেন।",
    full: true,
    required: true,
    hideIf: HIDE_FOR_SERVICE,
  },
  {
    id: "outOfStockReply",
    label: "Out of Stock Reply - স্টক শেষ হলে কী রিপ্লাই দেবে লিখুন",
    type: "input",
    group: "পলিসি ও গাইডলাইন",
    placeholder: "যেমন: দুঃখিত, পণ্যটি বর্তমানে স্টকে নেই",
    full: true,
    hideIf: HIDE_FOR_SERVICE,
  },

  // ── যোগাযোগ ──────────────────────────────────────────────────────────────────
  {
    id: "supportPhone",
    label: "Hotline Number - আপনার হটলাইন নম্বর লিখুন",
    type: "input",
    group: "যোগাযোগ",
    placeholder: "যেমন: 09643331232",
  },
  {
    id: "websiteLink",
    label: "Website Link - আপনার ওয়েবসাইট লিংক লিখুন",
    type: "input",
    group: "যোগাযোগ",
    placeholder: "যেমন: https://example.com",
  },
  {
    id: "contactDetails",
    label: "Contact Details - যোগাযোগের বিস্তারিত তথ্য লিখুন",
    type: "textarea",
    group: "যোগাযোগ",
    placeholder:
      "অফিস ঠিকানা, ইমেইল, ফোন নম্বর বা অন্যান্য যোগাযোগের তথ্য লিখুন",
    full: true,
  },
];

export const GROUP_ICONS: Record<string, React.ReactNode> = {
  "ব্যবসার তথ্য": <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />,
  "AI কনফিগারেশন": (
    <path d="M12 8V4M8 2h8M3 11h18M5 11v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9M9 16h.01M15 16h.01" />
  ),
  "Lead Collection": (
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6" />
  ),
  FAQ: (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
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

export const DEFAULT_ICON = (
  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" />
);
