import { create } from "zustand";
import {
  SOPFormData,
  transformSOPDataToSQL,
  transformSQLToSOPData,
} from "../lib/sopSchema";

// নির্দিষ্ট কোম্পানি কেন্দ্রিক এন্ডপয়েন্টসমূহ
const SUBMIT_WEBHOOK_URL =
  "https://server.presswayy.com/webhook/api/v1/sop-form";
const GET_WEBHOOK_URL =
  "https://server.presswayy.com/webhook/api/v1/get-sop-form";
const UPDATE_WEBHOOK_URL =
  "https://server.presswayy.com/webhook/api/v1/update-sop";

interface SopStore {
  status: "idle" | "submitting" | "success" | "error";
  isFetching: boolean;
  errorMessage: string;
  submitSOP: (data: SOPFormData) => Promise<boolean>;
  fetchSOP: (companyId: string) => Promise<SOPFormData | null>;
  updateSOP: (updatedData: SOPFormData) => Promise<boolean>;
  resetStatus: () => void;
}

// static ফিল্ড → snake_case column; custom field → custom_fields JSONB
function toBody(data: any) {
  return {
    ...transformSOPDataToSQL(data),
    custom_fields: Array.isArray(data?.customFields) ? data.customFields : [],
  };
}

export const useSopStore = create<SopStore>((set) => ({
  status: "idle",
  isFetching: false,
  errorMessage: "",

  resetStatus: () => set({ status: "idle", errorMessage: "" }),

  // নির্দিষ্ট কোম্পানির ডেটা আপডেট
  updateSOP: async (updatedData) => {
    try {
      set({ status: "submitting", errorMessage: "" });

      const payload = toBody(updatedData);
      // ডিবাগ করার জন্য পেলোডটি কনসোলে প্রিন্ট করে দেখা যাবে
      console.log("Sending Update Payload:", payload);

      const response = await fetch(UPDATE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // ব্যাকএন্ড/n8n থেকে পাঠানো আসল এরর মেসেজটি বের করার চেষ্টা
        let serverError = "আপডেট করতে সমস্যা হয়েছে!";
        try {
          const errData = await response.json();
          serverError =
            errData.message || errData.error || JSON.stringify(errData);
        } catch {
          try {
            const textError = await response.text();
            if (textError) serverError = textError;
          } catch {}
        }
        throw new Error(serverError);
      }

      set({ status: "success" });
      setTimeout(() => set({ status: "idle" }), 3000);
      return true;
    } catch (error: any) {
      console.error("UpdateSOP Error Details:", error);
      set({
        status: "error",
        errorMessage: error.message || "আপডেট করতে সমস্যা হয়েছে!",
      });
      return false;
    }
  },

  // নির্দিষ্ট কোম্পানির ডেটা ফেচ
  fetchSOP: async (companyId) => {
    if (!companyId) return null;

    set({ isFetching: true, errorMessage: "" });
    try {
      const response = await fetch(
        `${GET_WEBHOOK_URL}?company_id=${encodeURIComponent(companyId)}`,
      );

      if (response.ok) {
        // ১. রেসপন্সটিকে টেক্সট হিসেবে নিন
        const text = await response.text();

        // ২. টেক্সট খালি থাকলে রিটার্ন করে দিন
        if (!text) {
          console.warn("API রেসপন্স খালি এসেছে!");
          set({ isFetching: false });
          return null;
        }

        // ৩. এরপর পার্স করুন
        const dbData = JSON.parse(text);
        const result = Array.isArray(dbData) ? dbData[0] : dbData;

        if (result && Object.keys(result).length > 0) {
          set({ isFetching: false });
          const cf = result.custom_fields;
          const customFields = Array.isArray(cf)
            ? cf
            : Array.isArray(cf?.items)
              ? cf.items
              : [];
          return { ...transformSQLToSOPData(result), customFields } as any;
        }
      }
      set({ isFetching: false });
      return null;
    } catch (err) {
      console.error("FetchSOP Error:", err);
      set({ isFetching: false, errorMessage: "ডেটা লোড করতে ব্যর্থ।" });
      return null;
    }
  },

  // নির্দিষ্ট কোম্পানির জন্য নতুন ডেটা সাবমিট
  submitSOP: async (data) => {
    try {
      set({ status: "submitting", errorMessage: "" });

      const payload = toBody(data);
      console.log("Sending Submit Payload:", payload);

      const response = await fetch(SUBMIT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let serverError = "সাবমিট করতে ব্যর্থ হয়েছে।";
        try {
          const errData = await response.json();
          serverError =
            errData.message || errData.error || JSON.stringify(errData);
        } catch {
          try {
            const textError = await response.text();
            if (textError) serverError = textError;
          } catch {}
        }
        throw new Error(serverError);
      }

      set({ status: "success" });
      setTimeout(() => set({ status: "idle" }), 4000);
      return true;
    } catch (err: any) {
      console.error("SubmitSOP Error Details:", err);
      set({
        status: "error",
        errorMessage: err.message || "সাবমিট করতে ব্যর্থ হয়েছে।",
      });
      return false;
    }
  },
}));
