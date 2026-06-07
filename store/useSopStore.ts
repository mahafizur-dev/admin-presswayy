import { create } from "zustand";
import { SOPFormData } from "../lib/sopSchema";


const WEBHOOK_URL ="https://server.presswayy.com/webhook/api/v1/sop-form";

interface SopStore {
  status: "idle" | "submitting" | "success" | "error";
  errorMessage: string;
  submitSOP: (data: SOPFormData) => Promise<void>;
  resetStatus: () => void;
}

export const useSopStore = create<SopStore>((set) => ({
  status: "idle",
  errorMessage: "",

  resetStatus: () => set({ status: "idle", errorMessage: "" }),

  submitSOP: async (data) => {
    set({ status: "submitting", errorMessage: "" });

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: "f1767d60-ac8c-485a-b89a-ab739cf48f5f",
          ...data,
        }),
      });

      if (response.ok) {
        set({ status: "success" });
                setTimeout(() => set({ status: "idle" }), 4000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        set({
          status: "error",
          errorMessage:
            errorData.message || `সার্ভার রেসপন্স এরর কোড: ${response.status}`,
        });
      }
    } catch (err) {
      set({
        status: "error",
        errorMessage:
          "নেটওয়ার্ক কানেকশন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
      });
    }
  },
}));
