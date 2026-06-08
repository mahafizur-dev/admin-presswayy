import { z } from "zod";

export const sopSchema = z.object({
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
    .max(100, "1০০ অক্ষরের বেশি হতে পারবে না"),
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
  returnPolicy: z.string().trim().min(2, "রিটার্ন পলিসি উল্লেখ করুন").max(100, "1০০ অক্ষরের বেশি হতে পারবে না").optional(),
  refundPolicy: z.string().trim().min(2, "রিফান্ড পলিসি উল্লেখ করুন").max(100, "1০০ অক্ষরের বেশি হতে পারবে না").optional(),
  supportPhone: z.string().trim().optional(),
  websiteLink: z.string().trim().optional(),
  contactDetails: z.string().trim().optional(),
  outOfStockReply: z.string().trim().optional(),
  deliveryTimeInsideDhaka: z.string().trim(),
  deliveryTimeOutsideDhaka: z.string().trim(),
  deliveryChargeInsideDhaka: z.string().trim(),
  deliveryChargeOutsideDhaka: z.string().trim(),
});

export type SOPFormData = z.infer<typeof sopSchema>;
