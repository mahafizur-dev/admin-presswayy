import { z } from "zod";

export const sopSchema = z.object({
  businessOverview: z.string().trim().min(10, "কমপক্ষে ১০টি অক্ষর লিখতে হবে"),

  // z.enum এর বদলে এখানে z.string() এবং .refine ব্যবহার করছি
  requiredAiBehavior: z
    .string()
    .refine(
      (val) => ["Friendly", "Professional", "Casual", "Formal"].includes(val),
      { message: "একটি আচরণ নির্বাচন করুন" },
    ),

  orderProcess: z
    .string()
    .trim()
    .min(5, "অর্ডার প্রসেস সম্পর্কে বিস্তারিত লিখুন"),
  deliveryCharges: z.string().trim().min(2, "ডেলিভারি চার্জ উল্লেখ করুন"),
  paymentMethod: z.string().trim().min(2, "পেমেন্ট মেথড উল্লেখ করুন"),
  imageGuidelines: z.string().trim().min(5, "ইমেজ গাইডলাইন দিন"),
  negotiationPolicy: z.string().trim().min(5, "নেগোসিয়েশন পলিসি উল্লেখ করুন"),
});

export type SOPFormData = z.infer<typeof sopSchema>;
