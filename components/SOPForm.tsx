"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useSopStore } from "../store/useSopStore";

interface SOPFormProps {
  companyId?: string;
}

type FieldType = "input" | "select" | "textarea";

interface FieldConfig {
  id: string;
  label: string;
  type: FieldType;
  group: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  full?: boolean;
  default?: string;
  onlyWhenNew?: boolean;
  showIf?: { field: string; equals: string };
}

interface CustomField {
  id: string;
  label: string;
  type: "input" | "textarea";
  value: string;
}


interface OrderField {
  id?: string;
  company_id: string;
  field_key: string;
  field_label: string;
  question_text: string;
  field_type: string;
  field_options: string | null;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
}

const DEFAULT_FIELD_KEYS = [
  "product_name",
  "status",
  "customer_name",
  "phone",
  "address",
  "total_amount",
  "attributes",
];

const MANAGE_FIELDS_WEBHOOK =
  "https://server.presswayy.com/webhook/manage-order-fields";
const GET_FIELDS_WEBHOOK =
  "https://server.presswayy.com/webhook/get-order-fields";

function OrderFieldsManager({ companyId }: { companyId?: string }) {
  const [fields, setFields] = useState<OrderField[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [customKeys, setCustomKeys] = useState<string[]>([]);
  const [isAddingCustomKey, setIsAddingCustomKey] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState("");

  const emptyForm: OrderField = {
    company_id: companyId || "",
    field_key: "",
    field_label: "",
    question_text: "",
    field_type: "text",
    field_options: "",
    is_required: true,
    display_order: 0,
    is_active: true,
  };

  const [formData, setFormData] = useState<OrderField>(emptyForm);

  const fetchCompanyFields = async (id: string) => {
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
    fetchCompanyFields(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setFormData({
      ...emptyForm,
      company_id: companyId || "",
      display_order: fields.length + 1,
    });
    setError(null);
    setIsAddingCustomKey(false);
    setCustomKeyInput("");
  };

  const openModal = (field?: OrderField) => {
    if (field) {
      const optionsStr =
        field.field_options && typeof field.field_options === "object"
          ? JSON.stringify(field.field_options)
          : field.field_options || "";

      setFormData({ ...field, field_options: optionsStr as string });

      if (
        field.field_key &&
        !DEFAULT_FIELD_KEYS.includes(field.field_key) &&
        !customKeys.includes(field.field_key)
      ) {
        setCustomKeys((prev) => [...prev, field.field_key]);
      }
    } else {
      resetForm();
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleAddCustomKey = () => {
    const newKey = customKeyInput.trim().replace(/\s+/g, "_").toLowerCase();
    if (newKey) {
      if (
        !DEFAULT_FIELD_KEYS.includes(newKey) &&
        !customKeys.includes(newKey)
      ) {
        setCustomKeys((prev) => [...prev, newKey]);
      }
      setFormData((prev) => ({ ...prev, field_key: newKey }));
    }
    setIsAddingCustomKey(false);
    setCustomKeyInput("");
  };

  // CREATE & UPDATE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!companyId) {
      setError("আগে ID দিন, তারপর অর্ডার ফিল্ড যোগ করুন।");
      return;
    }

    if (
      !formData.field_key ||
      !formData.field_label ||
      !formData.question_text
    ) {
      setError("Key, Label এবং Question Text পূরণ করা বাধ্যতামূলক!");
      return;
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

      setSuccess(
        formData.id
          ? "ফিল্ড সফলভাবে আপডেট হয়েছে!"
          : "নতুন ফিল্ড সফলভাবে যোগ করা হয়েছে!",
      );

      await fetchCompanyFields(companyId);
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError("ডেটা সেভ করতে সমস্যা হয়েছে। দয়া করে চেক করুন।");
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // DELETE
  const handleDelete = async (id: string) => {
    if (!window.confirm("আপনি কি নিশ্চিত যে এটি মুছে ফেলতে চান?")) return;

    setLoading(true);
    try {
      const payload = {
        action: "DELETE",
        data: { id, company_id: companyId },
      };

      const response = await fetch(MANAGE_FIELDS_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Delete request failed");

      setFields((prev) => prev.filter((f) => f.id !== id));
      setSuccess("ফিল্ডটি মুছে ফেলা হয়েছে!");
    } catch (err) {
      setError("মুছে ফেলতে সমস্যা হয়েছে!");
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const allAvailableKeys = [...DEFAULT_FIELD_KEYS, ...customKeys];

  return (
    <div className="mt-5 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800">
            অর্ডার ফিল্ড (Order Definition)
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            কাস্টমারের কাছ থেকে অর্ডারে কোন তথ্যগুলো নেওয়া হবে তা নির্ধারণ
            করুন।
          </p>
        </div>

        <button
          type="button"
          onClick={() => openModal()}
          disabled={!companyId}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Plus size={16} /> নতুন ফিল্ড
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <CheckCircle2 size={15} /> {success}
        </div>
      )}
      {error && !isModalOpen && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* List / states */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {!companyId ? (
          <div className="p-6 text-center text-xs text-slate-500">
            অর্ডার ফিল্ড ম্যানেজ করতে আগে ID দিন।
          </div>
        ) : fetchLoading ? (
          <div className="flex items-center justify-center gap-2 p-6 text-xs text-slate-400">
            <Loader2 className="animate-spin" size={16} /> ফিল্ড লোড হচ্ছে...
          </div>
        ) : fields.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            কোনো অর্ডার ফিল্ড নেই। উপরের "নতুন ফিল্ড" বাটন থেকে যোগ করুন।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">Key</th>
                  <th className="p-2.5">Label &amp; Question</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5 text-center">Required</th>
                  <th className="p-2.5 text-center">Status</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...fields]
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((field) => (
                    <tr key={field.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-medium text-slate-900">
                        {field.display_order}
                      </td>
                      <td className="p-2.5">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                          {field.field_key}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="font-medium text-slate-900">
                          {field.field_label}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {field.question_text}
                        </div>
                      </td>
                      <td className="p-2.5 capitalize">{field.field_type}</td>
                      <td className="p-2.5 text-center">
                        {field.is_required ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                            Yes
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                            No
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            field.is_active ? "bg-emerald-500" : "bg-rose-400"
                          }`}
                        />
                      </td>
                      <td className="space-x-1 p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => openModal(field)}
                          className="rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(field.id!)}
                          className="rounded-md p-1.5 text-rose-500 transition-colors hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add / Edit field */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-bold text-slate-800">
                {formData.id ? "ফিল্ড এডিট করুন" : "নতুন ফিল্ড যোগ করুন"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 transition-colors hover:text-slate-600"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Field Key */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Field Key *
                  </label>
                  {!isAddingCustomKey ? (
                    <select
                      name="field_key"
                      value={formData.field_key}
                      onChange={(e) => {
                        if (e.target.value === "ADD_CUSTOM_KEY") {
                          setIsAddingCustomKey(true);
                          setCustomKeyInput("");
                        } else {
                          handleChange(e);
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="" disabled>
                        -- নির্বাচন করুন --
                      </option>
                      {allAvailableKeys.map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                      <option
                        value="ADD_CUSTOM_KEY"
                        className="font-bold text-emerald-600"
                      >
                        ➕ Add Custom Key...
                      </option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customKeyInput}
                        onChange={(e) => setCustomKeyInput(e.target.value)}
                        placeholder="e.g., custom_field_key"
                        autoFocus
                        className="w-full rounded-lg border border-emerald-300 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-emerald-100"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomKey}
                        disabled={!customKeyInput.trim()}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:bg-emerald-300"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomKey(false);
                          setCustomKeyInput("");
                        }}
                        className="rounded-lg bg-slate-200 px-2.5 py-2 text-slate-700 transition-colors hover:bg-slate-300"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400">
                    ইউনিক আইডেন্টিফায়ার (স্পেস ছাড়া)
                  </p>
                </div>

                {/* Field Label */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Field Label *
                  </label>
                  <input
                    type="text"
                    name="field_label"
                    value={formData.field_label}
                    onChange={handleChange}
                    placeholder="e.g., কাস্টমারের নাম"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Question Text (Chatbot Prompt) *
                </label>
                <input
                  type="text"
                  name="question_text"
                  value={formData.question_text}
                  onChange={handleChange}
                  placeholder="e.g., আপনার নামটি বলুন?"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Field Type
                  </label>
                  <select
                    name="field_type"
                    value={formData.field_type}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="text">Text (Standard Input)</option>
                    <option value="number">Number</option>
                    <option value="dropdown">Dropdown / Options</option>
                    <option value="checkbox">Checkbox (True/False)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Display Order
                  </label>
                  <input
                    type="number"
                    name="display_order"
                    value={formData.display_order}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {formData.field_type === "dropdown" && (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
                  <label className="mb-1 block text-xs font-semibold text-emerald-900">
                    Field Options (JSON Array)
                  </label>
                  <textarea
                    name="field_options"
                    value={(formData.field_options as string) || ""}
                    onChange={handleChange}
                    placeholder='["Dhaka", "Chattogram", "Sylhet"]'
                    className="h-24 w-full rounded-lg border border-emerald-200 px-3 py-2 font-mono text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                  <p className="mt-1 text-[11px] text-emerald-500">
                    Valid JSON Array ফরমেটে অপশনগুলো দিন।
                  </p>
                </div>
              )}

              <div className="flex gap-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    name="is_required"
                    checked={formData.is_required}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Required Field
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Active
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  বাতিল করুন
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {loading ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */

const FIELD_CONFIG: FieldConfig[] = [
  // ----- ব্যবসার তথ্য -----
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
    options: ["ecommerce", "service", "restaurant", "education"],
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
  },

  // ----- AI কনফিগারেশন -----
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

  // ----- অর্ডার ও প্রাইসিং -----
  // NOTE: "Order Process" (free-text) ফিল্ড সরানো হয়েছে — এর পরিবর্তে এই
  // সেকশনে নিচে schema-based OrderFieldsManager রেন্ডার হয়।
  {
    id: "pricingFormat",
    label: "Pricing Format - প্রাইস কীভাবে দেখাবে লিখুন",
    type: "textarea",
    group: "অর্ডার ও প্রাইসিং",
    placeholder: "যেমন: পণ্যের নাম, সাইজ, দাম, অফার প্রাইস ইত্যাদি",
    full: true,
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
  },
  {
    id: "negotiationPolicy",
    label: "Negotiation Policy Details - দাম নিয়ে আলোচনার নিয়ম লিখুন",
    type: "textarea",
    group: "অর্ডার ও প্রাইসিং",
    placeholder: "দাম কমানো যাবে কি না, কীভাবে উত্তর দেবে—বিস্তারিত লিখুন",
    full: true,
    showIf: { field: "allowNegotiation", equals: "Yes" },
  },

  // ----- ডেলিভারি -----
  {
    id: "deliveryTimeInsideDhaka",
    label: "Delivery Time Inside Dhaka - ঢাকার ভিতরে ডেলিভারি সময় লিখুন *",
    type: "input",
    group: "ডেলিভারি",
    placeholder: "যেমন: ১ দিন",
    required: true,
  },
  {
    id: "deliveryTimeOutsideDhaka",
    label: "Delivery Time Outside Dhaka - ঢাকার বাইরে ডেলিভারি সময় লিখুন *",
    type: "input",
    group: "ডেলিভারি",
    placeholder: "যেমন: ২-৩ দিন",
    required: true,
  },
  {
    id: "deliveryChargeInsideDhaka",
    label: "Delivery Charge Inside Dhaka - ঢাকার ভিতরে ডেলিভারি চার্জ লিখুন",
    type: "input",
    group: "ডেলিভারি",
    placeholder: "যেমন: 70",
  },
  {
    id: "deliveryChargeOutsideDhaka",
    label: "Delivery Charge Outside Dhaka - ঢাকার বাইরে ডেলিভারি চার্জ লিখুন",
    type: "input",
    group: "ডেলিভারি",
    placeholder: "যেমন: 130",
  },

  // ----- পলিসি ও গাইডলাইন -----
  {
    id: "returnPolicy",
    label: "Return Policy - রিটার্ন পলিসি লিখুন",
    type: "textarea",
    group: "পলিসি ও গাইডলাইন",
    placeholder: "কোন অবস্থায় রিটার্ন করা যাবে, সময়সীমা কত—বিস্তারিত লিখুন",
    full: true,
  },
  {
    id: "refundPolicy",
    label: "Refund Policy - রিফান্ড পলিসি লিখুন",
    type: "textarea",
    group: "পলিসি ও গাইডলাইন",
    placeholder: "রিফান্ড করা যাবে কি না, কীভাবে করা হবে—বিস্তারিত লিখুন",
    full: true,
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
  },
  {
    id: "outOfStockReply",
    label: "Out of Stock Reply - স্টক শেষ হলে কী রিপ্লাই দেবে লিখুন",
    type: "input",
    group: "পলিসি ও গাইডলাইন",
    placeholder: "যেমন: দুঃখিত, পণ্যটি বর্তমানে স্টকে নেই",
    full: true,
  },

  // ----- যোগাযোগ -----
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

// প্রতিটি group-এর আইকন
const GROUP_ICONS: Record<string, React.ReactNode> = {
  "ব্যবসার তথ্য": <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />,
  "AI কনফিগারেশন": (
    <path d="M12 8V4M8 2h8M3 11h18M5 11v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9M9 16h.01M15 16h.01" />
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
const DEFAULT_ICON = (
  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" />
);

type FormValues = Record<string, string>;

function cleanLabel(label: string): string {
  const noStar = label.replace(/\s*\*$/, "");
  const dashIdx = noStar.indexOf(" - ");
  return dashIdx >= 0 ? noStar.slice(dashIdx + 3) : noStar;
}

function buildSchema(fields: FieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    shape[f.id] = f.required
      ? z.string().min(1, `${cleanLabel(f.label)} আবশ্যক`)
      : z.string().optional().or(z.literal(""));
  }
  return z.object(shape);
}

function buildDefaults(fields: FieldConfig[], companyId?: string): FormValues {
  const out: FormValues = {};
  for (const f of fields) out[f.id] = f.default ?? "";
  if (companyId) out.companyId = companyId;
  return out;
}

const inputBase =
  "w-full rounded-xl border bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:ring-4";
const okRing =
  "border-slate-200 focus:border-emerald-500 focus:ring-emerald-100";
const errRing = "border-rose-300 focus:border-rose-400 focus:ring-rose-100";

export default function SOPForm({ companyId }: SOPFormProps) {
  const { status, isFetching, errorMessage, submitSOP, updateSOP, fetchSOP } =
    useSopStore();

  const activeFields = useMemo(
    () => FIELD_CONFIG.filter((f) => !(f.onlyWhenNew && companyId)),
    [companyId],
  );

  const schema = useMemo(() => buildSchema(activeFields), [activeFields]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setFocus,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: buildDefaults(activeFields, companyId),
  });

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isExisting, setIsExisting] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"input" | "textarea">("input");

  const [missingFields, setMissingFields] = useState<string[]>([]);

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successAction, setSuccessAction] = useState<"submit" | "update">(
    "submit",
  );

  const addCustomField = () => {
    const label = newLabel.trim();
    if (!label) return;
    setCustomFields((prev) => [
      ...prev,
      {
        id: `cf_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        label,
        type: newType,
        value: "",
      },
    ]);
    setNewLabel("");
    setNewType("input");
  };

  const removeCustomField = (id: string) =>
    setCustomFields((prev) => prev.filter((c) => c.id !== id));

  const updateCustomValue = (id: string, value: string) =>
    setCustomFields((prev) =>
      prev.map((c) => (c.id === id ? { ...c, value } : c)),
    );

  useEffect(() => {
    async function loadExistingData() {
      if (companyId) {
        const existingData = await fetchSOP(companyId);
        if (existingData) {
          const data: any = (existingData as any).answers ?? existingData;
          const { customFields: savedCustom, ...rest } = data || {};
          reset({ ...buildDefaults(activeFields, companyId), ...rest });
          setCustomFields(
            Array.isArray(savedCustom)
              ? savedCustom.map((c: any) => ({ ...c, value: c.value ?? "" }))
              : [],
          );
          setIsExisting(true);
        } else {
          setValue("companyId", companyId, { shouldValidate: true });
          setIsExisting(false);
        }
      }
    }
    loadExistingData();
  }, [companyId]);

  const values = watch();

  // অর্ডার ফিল্ড ম্যানেজারের জন্য কার্যকর companyId — prop থাকলে সেটি,
  // নাহলে নতুন ফর্মে ব্যবহারকারীর টাইপ করা companyId।
  const effectiveCompanyId = companyId || values.companyId || "";

  const isVisible = (f: FieldConfig) =>
    !f.showIf || values[f.showIf.field] === f.showIf.equals;

  const completion = useMemo(() => {
    const fields = activeFields.filter(isVisible);
    const total = fields.length;
    const filled = fields.filter(
      (f) => (values[f.id] ?? "").toString().trim() !== "",
    ).length;
    const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
    return { filled, total, pct };
  }, [activeFields, values]);

  const onSubmit = async (data: FormValues) => {
    const nullIfEmpty = (v: string) => {
      const t = (v ?? "").trim();
      return t === "" ? null : t;
    };

    const payload: Record<string, any> = {};
    for (const f of activeFields) {
      if (isVisible(f)) payload[f.id] = nullIfEmpty(data[f.id]);
    }
    if (companyId) payload.companyId = companyId;

    payload.customFields = customFields.map((c) => ({
      ...c,
      value: nullIfEmpty(c.value),
    }));

    const wasExisting = isExisting;

    console.log(
      wasExisting ? "Calling Update API..." : "Calling Submit API...",
    );

    const isSuccess = await (wasExisting
      ? updateSOP(payload as any)
      : submitSOP(payload as any));

    if (isSuccess) {
      setSuccessAction(wasExisting ? "update" : "submit");
      setShowSuccessPopup(true);

      if (!wasExisting) {
        setIsExisting(true);
      }
    }
  };

  const onInvalid = (formErrors: Record<string, any>) => {
    const visibleRequired = activeFields.filter(
      (f) => f.required && isVisible(f),
    );

    const missing = visibleRequired
      .filter((f) => formErrors[f.id])
      .map((f) => cleanLabel(f.label));

    setMissingFields(missing);

    const firstMissing = visibleRequired.find((f) => formErrors[f.id]);
    if (firstMissing) {
      const el = document.getElementById(`field-${firstMissing.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        try {
          setFocus(firstMissing.id);
        } catch {
          /* ignore */
        }
      }, 350);
    }
  };

  const groups = useMemo(() => {
    const order: string[] = [];
    const map: Record<string, FieldConfig[]> = {};
    for (const f of activeFields) {
      if (!map[f.group]) {
        map[f.group] = [];
        order.push(f.group);
      }
      map[f.group].push(f);
    }
    return order.map((title) => ({ title, fields: map[title] }));
  }, [activeFields]);

  const renderField = (f: FieldConfig) => {
    if (!isVisible(f)) return null;

    const hasError = !!errors[f.id];
    const cls = `${inputBase} ${hasError ? errRing : okRing}`;

    return (
      <div
        key={f.id}
        id={`field-${f.id}`}
        className={`space-y-1.5 scroll-mt-24 ${f.full ? "md:col-span-2" : ""}`}
      >
        <label className="block text-xs font-semibold text-slate-600">
          {f.label}
        </label>

        {f.type === "textarea" ? (
          <textarea
            {...register(f.id)}
            rows={3}
            placeholder={f.placeholder}
            className={`${cls} resize-y`}
          />
        ) : f.type === "select" ? (
          <div className="relative">
            <select
              {...register(f.id)}
              className={`${cls} cursor-pointer appearance-none pr-9`}
            >
              <option value="" disabled hidden>
                {f.placeholder}
              </option>
              {(f.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        ) : (
          <input
            type="text"
            {...register(f.id)}
            placeholder={f.placeholder}
            className={cls}
          />
        )}

        {hasError && (
          <p className="flex items-center gap-1 text-xs text-rose-500">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {errors[f.id]?.message as string}
          </p>
        )}
      </div>
    );
  };

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-slate-500">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-sm">লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header with gradient wash + progress strip */}
      <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-emerald-50/80 via-white to-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              {isExisting
                ? "আপনার ব্যবসার তথ্য আপডেট করুন"
                : "আপনার ব্যবসার তথ্য দিন"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              AI অ্যাসিস্ট্যান্ট কীভাবে গ্রাহকদের সাথে কথা বলবে তা নির্ধারণ
              করুন।
            </p>
          </div>

          <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-emerald-100/70 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:flex">
            {completion.filled}/{completion.total} পূরণ
          </span>
        </div>

        {/* slim completion bar */}
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${completion.pct}%` }}
            />
          </div>
        </div>
      </div>

      {status === "error" && (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <span className="mt-0.5">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="px-6 py-6"
        noValidate
      >
        <div className="space-y-6">
          {groups.map((group) => {
            const visible = group.fields.filter(isVisible);
            const isOrderGroup = group.title === "অর্ডার ও প্রাইসিং";
            // অর্ডার গ্রুপে static ফিল্ড না থাকলেও OrderFieldsManager দেখাতে হবে
            if (visible.length === 0 && !isOrderGroup) return null;

            return (
              <section
                key={group.title}
                className="rounded-2xl border border-slate-100 bg-white/60 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
              >
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {GROUP_ICONS[group.title] ?? DEFAULT_ICON}
                    </svg>
                  </span>
                  <h3 className="text-sm font-bold tracking-tight text-slate-800">
                    {group.title}
                  </h3>
                  <span className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                </div>

                {visible.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {group.fields.map(renderField)}
                  </div>
                )}

                {/* schema-based Order Definition System (former "Order Process") */}
                {isOrderGroup && (
                  <OrderFieldsManager companyId={effectiveCompanyId} />
                )}
              </section>
            );
          })}

          {/* ---------- কাস্টম ফিল্ড (Add Field) ---------- */}
          <section className="rounded-2xl border border-slate-100 bg-white/60 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <h3 className="text-sm font-bold tracking-tight text-slate-800">
                কাস্টম ফিল্ড
              </h3>
              <span className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
            </div>

            {customFields.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {customFields.map((cf) => (
                  <div
                    key={cf.id}
                    className={`space-y-1.5 ${cf.type === "textarea" ? "md:col-span-2" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-600">
                        {cf.label}
                      </label>
                      <button
                        type="button"
                        onClick={() => removeCustomField(cf.id)}
                        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                        aria-label="ফিল্ড সরান"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                        সরান
                      </button>
                    </div>
                    {cf.type === "textarea" ? (
                      <textarea
                        value={cf.value}
                        onChange={(e) =>
                          updateCustomValue(cf.id, e.target.value)
                        }
                        rows={3}
                        className={`${inputBase} ${okRing} resize-y`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={cf.value}
                        onChange={(e) =>
                          updateCustomValue(cf.id, e.target.value)
                        }
                        className={`${inputBase} ${okRing}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Field composer */}
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  নতুন ফিল্ডের নাম
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomField();
                    }
                  }}
                  placeholder="যেমন: Facebook Page Link"
                  className={`${inputBase} ${okRing}`}
                />
              </div>

              <button
                type="button"
                onClick={addCustomField}
                disabled={!newLabel.trim()}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-slate-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                ফিল্ড যোগ করুন
              </button>
            </div>
            <p className="mt-4 hidden text-xs text-slate-400 sm:block">
              Note: আপনি যত বেশি কাস্টম ফিল্ড যোগ করবেন, তত বেশি AI প্রসেসিং খরচ
              বৃদ্ধি পাবে।
            </p>
          </section>
        </div>

        {/* Sticky action bar — always-visible CTA on a long form */}
        <div className="sticky bottom-0 z-10 mt-8 -mx-6 flex items-center justify-between gap-4 border-t border-slate-100 bg-white/85 px-6 py-4 backdrop-blur-md">
          <span className="hidden text-xs text-slate-400 sm:block">
            {completion.pct === 100
              ? "সব তথ্য পূরণ হয়েছে"
              : `${completion.pct}% সম্পন্ন`}
          </span>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all duration-150 hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:active:scale-100 sm:w-auto"
          >
            {status === "submitting" ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                সংরক্ষণ হচ্ছে...
              </>
            ) : isExisting ? (
              "আপডেট করুন"
            ) : (
              "সাবমিট করুন"
            )}
          </button>
        </div>
      </form>

      {/* ---------- Missing required-fields popup ---------- */}
      {missingFields.length > 0 && (
        <div
          onClick={() => setMissingFields([])}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start gap-3 px-6 pt-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <path d="M12 9v4M12 17h.01" />
                </svg>
              </span>
              <div className="min-w-0">
                <h4 className="text-base font-bold text-slate-900">
                  কিছু আবশ্যক তথ্য বাকি আছে
                </h4>
                <p className="mt-0.5 text-sm text-slate-500">
                  সাবমিট করার আগে নিচের ফিল্ডগুলো পূরণ করুন:
                </p>
              </div>
            </div>

            <ul className="mx-6 mt-4 max-h-60 space-y-1.5 overflow-y-auto rounded-xl bg-slate-50 p-3">
              {missingFields.map((label) => (
                <li
                  key={label}
                  className="flex items-start gap-2 text-sm text-slate-700"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  {label}
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => setMissingFields([])}
                className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99] motion-reduce:active:scale-100"
              >
                বুঝেছি, পূরণ করছি
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Success popup (সাবমিট/আপডেট সফল হলে) ---------- */}
      {showSuccessPopup && (
        <div
          onClick={() => setShowSuccessPopup(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex flex-col items-center gap-3 px-6 pb-2 pt-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  তথ্য সংরক্ষণ করা হয়েছে!
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  {successAction === "update"
                    ? "আপনার ব্যবসার তথ্য সফলভাবে আপডেট করা হয়েছে।"
                    : "আপনার ব্যবসার তথ্য সফলভাবে সাবমিট করা হয়েছে।"}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => setShowSuccessPopup(false)}
                className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99] motion-reduce:active:scale-100"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
