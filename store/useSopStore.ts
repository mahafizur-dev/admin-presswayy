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
// (transformSOPDataToSQL শুধু পরিচিত ফিল্ড রাখে, তাই customFields আলাদা করে যোগ করি)
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

      const response = await fetch(UPDATE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toBody(updatedData)),
      });

      if (!response.ok) throw new Error("Update failed");

      set({ status: "success" });
      setTimeout(() => set({ status: "idle" }), 3000);
      return true;
    } catch (error) {
      set({ status: "error", errorMessage: "আপডেট করতে সমস্যা হয়েছে!" });
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
        const dbData = await response.json();
        // n8n রেসপন্স অ্যারে হিসেবে আসতে পারে
        const result = Array.isArray(dbData) ? dbData[0] : dbData;

        if (result && Object.keys(result).length > 0) {
          set({ isFetching: false });
          // custom_fields object-এ মোড়ানো ({items:[...]}) বা সরাসরি array — দুটোই handle
          const cf = result.custom_fields;
          const customFields = Array.isArray(cf)
            ? cf
            : Array.isArray(cf?.items)
              ? cf.items
              : [];
          // static ফিল্ড + custom_fields দুটোই ফর্মে ফেরত পাঠাই
          return { ...transformSQLToSOPData(result), customFields } as any;
        }
      }
      set({ isFetching: false });
      return null;
    } catch (err) {
      set({ isFetching: false, errorMessage: "ডেটা লোড করতে ব্যর্থ।" });
      return null;
    }
  },

  // নির্দিষ্ট কোম্পানির জন্য নতুন ডেটা সাবমিট
  submitSOP: async (data) => {
    set({ status: "submitting", errorMessage: "" });
    try {
      const response = await fetch(SUBMIT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toBody(data)),
      });

      if (response.ok) {
        set({ status: "success" });
        setTimeout(() => set({ status: "idle" }), 4000);
        return true;
      } else {
        throw new Error("Submit failed");
      }
    } catch (err) {
      set({ status: "error", errorMessage: "সাবমিট করতে ব্যর্থ হয়েছে।" });
      return false;
    }
  },
}));
