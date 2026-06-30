import { useState, useEffect } from "react";
import type { OrderField } from "../lib/sopTypes";

const MANAGE_FIELDS_WEBHOOK =
  "https://server.presswayy.com/webhook/manage-order-fields";
const GET_FIELDS_WEBHOOK =
  "https://server.presswayy.com/webhook/get-order-fields";

export const DEFAULT_FIELD_KEYS = [
  "product_name",
  "status",
  "customer_name",
  "phone",
  "address",
  "total_amount",
  "attributes",
];

export function useOrderFields(companyId?: string) {
  const [fields, setFields] = useState<OrderField[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const fetchFields = async (id: string) => {
    setFetchLoading(true);
    try {
      const response = await fetch(`${GET_FIELDS_WEBHOOK}?company_id=${id}`);
      if (response.ok) {
        const text = await response.text();
        let data: any = [];
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            console.warn("Order fields API returned non-JSON response:", text);
          }
        }
        setFields(Array.isArray(data) ? data : []);
      } else {
        setFields([]);
      }
    } catch (err) {
      console.error("Order fields fetch error:", err);
      setFields([]);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    if (!companyId) {
      setFields([]);
      setFetchLoading(false);
      return;
    }
    fetchFields(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const saveField = async (formData: OrderField): Promise<boolean> => {
    clearMessages();
    if (!companyId) {
      setError("আগে ID দিন, তারপর অর্ডার ফিল্ড যোগ করুন।");
      return false;
    }
    if (
      !formData.field_key ||
      !formData.field_label ||
      !formData.question_text
    ) {
      setError("Key, Label এবং Question Text পূরণ করা বাধ্যতামূলক!");
      return false;
    }

    setLoading(true);
    try {
      const payload = {
        action: formData.id ? "UPDATE" : "CREATE",
        data: {
          ...formData,
          company_id: companyId,
          field_options: formData.field_options
            ? JSON.parse(formData.field_options as string)
            : null,
          display_order: Number(formData.display_order),
        },
      };

      const response = await fetch(MANAGE_FIELDS_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Network response was not ok");

      showSuccess(
        formData.id
          ? "ফিল্ড সফলভাবে আপডেট হয়েছে!"
          : "নতুন ফিল্ড সফলভাবে যোগ করা হয়েছে!",
      );

      await fetchFields(companyId);
      return true;
    } catch (err) {
      setError("ডেটা সেভ করতে সমস্যা হয়েছে। দয়া করে চেক করুন।");
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteField = async (id: string): Promise<boolean> => {
    if (!window.confirm("আপনি কি নিশ্চিত যে এটি মুছে ফেলতে চান?")) return false;

    setLoading(true);
    try {
      const payload = { action: "DELETE", data: { id, company_id: companyId } };
      const response = await fetch(MANAGE_FIELDS_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Delete request failed");

      setFields((prev) => prev.filter((f) => f.id !== id));
      showSuccess("ফিল্ডটি মুছে ফেলা হয়েছে!");
      return true;
    } catch (err) {
      setError("মুছে ফেলতে সমস্যা হয়েছে!");
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    fields,
    loading,
    fetchLoading,
    error,
    success,
    clearMessages,
    saveField,
    deleteField,
    fieldCount: fields.length,
  };
}
