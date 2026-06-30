import { create } from "zustand";
import {
  SOPFormData,
  transformSOPDataToSQL,
  transformSQLToSOPData,
} from "../lib/sopSchema";

const SUBMIT_WEBHOOK_URL =
  "https://server.presswayy.com/webhook/api/v1/sop-form";
const GET_WEBHOOK_URL =
  "https://server.presswayy.com/webhook/api/v1/get-sop-form";
const UPDATE_WEBHOOK_URL =
  "https://server.presswayy.com/webhook/api/v1/update-sop";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** static fields → snake_case columns; custom fields → custom_fields JSONB */
function toBody(data: any) {
  return {
    ...transformSOPDataToSQL(data),
    custom_fields: Array.isArray(data?.customFields) ? data.customFields : [],
  };
}

/** Extracts a human-readable error message from a failed Response. */
async function extractServerError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const errData = await response.json();
    return errData.message || errData.error || JSON.stringify(errData);
  } catch {
    try {
      const text = await response.text();
      if (text) return text;
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

// ── Store interface ───────────────────────────────────────────────────────────

interface SopStore {
  status: "idle" | "submitting" | "success" | "error";
  isFetching: boolean;
  errorMessage: string;
  submitSOP: (data: SOPFormData) => Promise<boolean>;
  fetchSOP: (companyId: string) => Promise<SOPFormData | null>;
  updateSOP: (updatedData: SOPFormData) => Promise<boolean>;
  resetStatus: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSopStore = create<SopStore>((set) => ({
  status: "idle",
  isFetching: false,
  errorMessage: "",

  resetStatus: () => set({ status: "idle", errorMessage: "" }),

  submitSOP: async (data) => {
    set({ status: "submitting", errorMessage: "" });
    try {
      const payload = toBody(data);
      console.log("Sending Submit Payload:", payload);

      const response = await fetch(SUBMIT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          await extractServerError(response, "সাবমিট করতে ব্যর্থ হয়েছে।"),
        );
      }

      set({ status: "success" });
      setTimeout(() => set({ status: "idle" }), 4000);
      return true;
    } catch (err: any) {
      console.error("SubmitSOP Error:", err);
      set({
        status: "error",
        errorMessage: err.message || "সাবমিট করতে ব্যর্থ হয়েছে।",
      });
      return false;
    }
  },

  updateSOP: async (updatedData) => {
    set({ status: "submitting", errorMessage: "" });
    try {
      const payload = toBody(updatedData);
      console.log("Sending Update Payload:", payload);

      const response = await fetch(UPDATE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          await extractServerError(response, "আপডেট করতে সমস্যা হয়েছে!"),
        );
      }

      set({ status: "success" });
      setTimeout(() => set({ status: "idle" }), 3000);
      return true;
    } catch (error: any) {
      console.error("UpdateSOP Error:", error);
      set({
        status: "error",
        errorMessage: error.message || "আপডেট করতে সমস্যা হয়েছে!",
      });
      return false;
    }
  },

  fetchSOP: async (companyId) => {
    if (!companyId) return null;

    set({ isFetching: true, errorMessage: "" });
    try {
      const response = await fetch(
        `${GET_WEBHOOK_URL}?company_id=${encodeURIComponent(companyId)}`,
      );

      if (!response.ok) {
        set({ isFetching: false });
        return null;
      }

      const text = await response.text();
      if (!text) {
        console.warn("API রেসপন্স খালি এসেছে!");
        set({ isFetching: false });
        return null;
      }

      const dbData = JSON.parse(text);
      const result = Array.isArray(dbData) ? dbData[0] : dbData;

      if (!result || Object.keys(result).length === 0) {
        set({ isFetching: false });
        return null;
      }

      const cf = result.custom_fields;
      const customFields = Array.isArray(cf)
        ? cf
        : Array.isArray(cf?.items)
          ? cf.items
          : [];

      set({ isFetching: false });
      return { ...transformSQLToSOPData(result), customFields } as any;
    } catch (err) {
      console.error("FetchSOP Error:", err);
      set({ isFetching: false, errorMessage: "ডেটা লোড করতে ব্যর্থ।" });
      return null;
    }
  },
}));
