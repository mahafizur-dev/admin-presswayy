import { z } from "zod";

export const sopSchema = z.object({
  companyId: z.string().uuid("একটি সঠিক Company ID (UUID) প্রদান করুন"),

  businessName: z
    .string()
    .trim()
    .min(2, "ব্যবসার নাম লিখতে হবে")
    .max(100, "ব্যবসার নাম ১০০ অক্ষরের বেশি হতে পারবে না"),
  businessType: z
    .string()
    .refine(
      (val) =>
        ["ecommerce", "service", "restaurant", "education"].includes(val),
      { message: "অনুগ্রহ করে একটি ব্যবসার ধরন নির্বাচন করুন" },
    ),
  businessOverview: z
    .string()
    .trim()
    .min(10, "কমপক্ষে ১০টি অক্ষর লিখতে হবে")
    .max(200, "২০০ অক্ষরের বেশি হতে পারবে না"),

  requiredAiBehavior: z
    .string()
    .refine(
      (val) => ["Friendly", "Professional", "Casual", "Formal"].includes(val),
      { message: "অনুগ্রহ করে একটি আচরণ নির্বাচন করুন" },
    ),

  aiName: z
    .string()
    .trim()
    .min(1, "AI এর নাম লিখতে হবে")
    .max(50, "5০ অক্ষরের বেশি হতে পারবে না"),
  replyLanguage: z
    .string()
    .refine((val) => ["Bangla", "English"].includes(val), {
      message: "অনুগ্রহ করে একটি ভাষা নির্বাচন করুন",
    }),
  useEmoji: z.string().refine((val) => ["Yes", "No"].includes(val), {
    message: "ইমোজি অপশন নির্বাচন করুন",
  }),
  addressingStyle: z
    .string()
    .refine((val) => ["Sir-Mam", "Bhaiya-Apu"].includes(val), {
      message: "সম্বোধনের ধরণ নির্বাচন করুন",
    }),
  greetingStyle: z
    .string()
    .refine((val) => ["Hi", "Hello", "Assalamu Alaikum"].includes(val), {
      message: "Greeting স্টাইল নির্বাচন করুন",
    }),
  responseLength: z
    .string()
    .refine((val) => ["short", "medium", "long"].includes(val), {
      message: "রেসপন্স এর দৈর্ঘ্য নির্বাচন করুন",
    }),

  orderProcess: z
    .string()
    .trim()
    .min(5, "অর্ডার প্রসেস সম্পর্কে বিস্তারিত লিখুন"),
  paymentMethod: z
    .string()
    .trim()
    .min(2, "পেমেন্ট মেথড উল্লেখ করুন")
    .max(100, "1০০ অক্ষরের বেশি হতে পারবে না")
    .optional(),
  imageGuidelines: z.string().trim().min(5, "ইমেজ গাইডলাইন দিন"),
  allowNegotiation: z.string().refine((val) => ["Yes", "No"].includes(val), {
    message: "অনুগ্রহ করে নির্বাচন করুন",
  }),
  negotiationPolicy: z.string().trim().min(2, "নেগোসিয়েশন পলিসি উল্লেখ করুন"),
  pricingFormat: z
    .string()
    .trim()
    .min(2, "প্রাইসিং ফরম্যাট উল্লেখ করুন")
    .max(100, "1০০ অক্ষরের বেশি হতে পারবে না")
    .optional(),
  returnPolicy: z
    .string()
    .trim()
    .min(2, "রিটার্ন পলিসি উল্লেখ করুন")
    .max(100, "১০০ অক্ষরের বেশি হতে পারবে না")
    .optional(),
  refundPolicy: z
    .string()
    .trim()
    .min(2, "রিফান্ড পলিসি উল্লেখ করুন")
    .max(100, "১০০ অক্ষরের বেশি হতে পারবে না")
    .optional(),
  supportPhone: z.string().trim().optional(),
  websiteLink: z.string().trim().optional(),
  contactDetails: z.string().trim().optional(),
  outOfStockReply: z.string().trim().optional(),
  deliveryTimeInsideDhaka: z.string().trim(),
  deliveryTimeOutsideDhaka: z.string().trim(),

  // সংখ্যা ইনপুট ভ্যালিডেশন
  deliveryChargeInsideDhaka: z
    .string()
    .regex(/^\d+$/, "শুধুমাত্র সংখ্যা লিখতে হবে"),
  deliveryChargeOutsideDhaka: z
    .string()
    .regex(/^\d+$/, "শুধুমাত্র সংখ্যা লিখতে হবে"),
});

export type SOPFormData = z.infer<typeof sopSchema>;

// delivery_charge_* কলাম DB-তে NOT NULL DEFAULT 0।
// explicit null পাঠালে DEFAULT কাজ করে না → NOT NULL ভঙ্গ হয়।
// তাই খালি/অবৈধ হলে null নয়, 0 পাঠাই; বৈধ সংখ্যা হলে সেটিই।
const toCharge = (v?: string): number => {
  const n = Number((v ?? "").trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

// ফর্মের ডেটা (camelCase) কে ডেটাবেসের ফরম্যাটে (snake_case) রূপান্তর করার হেল্পার ফাংশন
export const transformSOPDataToSQL = (data: SOPFormData) => {
  return {
    company_id: data.companyId,
    business_name: data.businessName,
    business_type: data.businessType,
    business_overview: data.businessOverview,
    required_ai_behavior: data.requiredAiBehavior,
    ai_name: data.aiName,
    reply_language: data.replyLanguage,
    use_emoji: data.useEmoji === "Yes", // String থেকে Boolean এ কনভার্ট
    addressing_style: data.addressingStyle,
    greeting_style: data.greetingStyle,
    response_length: data.responseLength,
    order_process: data.orderProcess,
    payment_method: data.paymentMethod,
    image_guidelines: data.imageGuidelines,
    allow_negotiation: data.allowNegotiation === "Yes", // String থেকে Boolean এ কনভার্ট
    negotiation_policy: data.negotiationPolicy,
    pricing_format: data.pricingFormat,
    return_policy: data.returnPolicy,
    refund_policy: data.refundPolicy,
    support_phone: data.supportPhone,
    website_link: data.websiteLink,
    contact_details: data.contactDetails,
    out_of_stock_reply: data.outOfStockReply,
    delivery_time_inside_dhaka: data.deliveryTimeInsideDhaka,
    delivery_time_outside_dhaka: data.deliveryTimeOutsideDhaka,
    delivery_charge_inside_dhaka: toCharge(data.deliveryChargeInsideDhaka),
    delivery_charge_outside_dhaka: toCharge(data.deliveryChargeOutsideDhaka),
  };
};

// ডেটাবেস (SQL) থেকে আসা ডেটাকে ফর্মের ফরম্যাটে (Zod Schema) রূপান্তর করার হেল্পার ফাংশন
export const transformSQLToSOPData = (dbData: any): SOPFormData => {
  return {
    companyId: dbData.company_id || "",
    businessName: dbData.business_name || "",
    businessType: dbData.business_type || "",
    businessOverview: dbData.business_overview || "",
    requiredAiBehavior: dbData.required_ai_behavior || "Friendly",
    aiName: dbData.ai_name || "",
    replyLanguage: dbData.reply_language || "",
    useEmoji: dbData.use_emoji ? "Yes" : "No",
    addressingStyle: dbData.addressing_style || "",
    greetingStyle: dbData.greeting_style || "",
    responseLength: dbData.response_length || "",
    orderProcess: dbData.order_process || "",
    paymentMethod: dbData.payment_method || "",
    imageGuidelines: dbData.image_guidelines || "",
    allowNegotiation: dbData.allow_negotiation ? "Yes" : "No",
    negotiationPolicy: dbData.negotiation_policy || "No",
    pricingFormat: dbData.pricing_format || "",
    returnPolicy: dbData.return_policy || "",
    refundPolicy: dbData.refund_policy || "",
    supportPhone: dbData.support_phone || "",
    websiteLink: dbData.website_link || "",
    contactDetails: dbData.contact_details || "",
    outOfStockReply: dbData.out_of_stock_reply || "",
    deliveryTimeInsideDhaka: dbData.delivery_time_inside_dhaka || "",
    deliveryTimeOutsideDhaka: dbData.delivery_time_outside_dhaka || "",
    deliveryChargeInsideDhaka:
      dbData.delivery_charge_inside_dhaka?.toString() || "", // Int to String
    deliveryChargeOutsideDhaka:
      dbData.delivery_charge_outside_dhaka?.toString() || "", // Int to String
  };
};
