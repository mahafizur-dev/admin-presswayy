"use client";

import React, { useState, useEffect } from "react";
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

// টাইপ ডেফিনিশন (TypeScript)
interface OrderField {
  id?: string;
  company_id: string;
  field_key: string;
  field_label: string;
  question_text: string;
  field_type: string;
  field_options: string | null; // JSON string
  is_required: boolean;
  display_order: number;
  is_active: boolean;
}

interface Company {
  id: string;
  name: string;
}

// ডিফল্ট ফিল্ড কী এর তালিকা
const DEFAULT_FIELD_KEYS = [
  "product_name",
  "status",
  "customer_name",
  "phone",
  "address",
  "total_amount",
  "attributes",
];

// n8n Webhook URLs
const GET_COMPANIES_WEBHOOK =
  "https://server.presswayy.com/webhook/get-companie-webhook";
const MANAGE_FIELDS_WEBHOOK =
  "https://server.presswayy.com/webhook/manage-order-fields";
const GET_FIELDS_WEBHOOK =
  "https://server.presswayy.com/webhook/get-order-fields";

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [fields, setFields] = useState<OrderField[]>([]);

  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // কাস্টম ফিল্ড কী স্টেট
  const [customKeys, setCustomKeys] = useState<string[]>([]);
  const [isAddingCustomKey, setIsAddingCustomKey] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState("");

  // ফর্ম স্টেট
  const [formData, setFormData] = useState<OrderField>({
    company_id: "",
    field_key: "",
    field_label: "",
    question_text: "",
    field_type: "text",
    field_options: "",
    is_required: true,
    display_order: 0,
    is_active: true,
  });

  // ১. পেজ লোড হওয়ার সাথে সাথে কোম্পানিগুলো ফেচ করা
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch(GET_COMPANIES_WEBHOOK);
        if (!response.ok) throw new Error("Failed to fetch companies");

        const text = await response.text();
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : [];
        } catch (e) {
          console.warn("Companies API returned non-JSON response:", text);
          data = [];
        }

        if (Array.isArray(data)) {
          setCompanies(data);
        } else if (data && typeof data === "object") {
          setCompanies([data as unknown as Company]);
        }
      } catch (err) {
        console.error(err);
        setError("কোম্পানির তালিকা লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন!");
      }
    };

    fetchCompanies();
  }, []);

  // ২. ফিল্ডগুলো ফেচ করার ফাংশনকে আলাদা করা হলো
  const fetchCompanyFields = async (companyId: string) => {
    setFetchLoading(true);
    try {
      const response = await fetch(
        `${GET_FIELDS_WEBHOOK}?company_id=${companyId}`,
      );

      if (response.ok) {
        const text = await response.text();
        let data: any = [];

        if (text) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.warn("Fields API returned non-JSON response:", text);
          }
        }

        setFields(Array.isArray(data) ? data : []);
      } else {
        setFields([]);
      }
    } catch (err) {
      console.error("Fields fetch error:", err);
      setFields([]);
    } finally {
      setFetchLoading(false);
    }
  };

  // ৩. কোম্পানি সিলেক্ট হলে ফিল্ডগুলো ফেচ করা
  useEffect(() => {
    if (!selectedCompanyId) {
      setFields([]);
      setFetchLoading(false);
      return;
    }

    fetchCompanyFields(selectedCompanyId);
  }, [selectedCompanyId]);

  // ইনপুট চেঞ্জ হ্যান্ডলার
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

  // ফর্ম রিসেট
  const resetForm = () => {
    setFormData({
      company_id: selectedCompanyId,
      field_key: "",
      field_label: "",
      question_text: "",
      field_type: "text",
      field_options: "",
      is_required: true,
      display_order: fields.length + 1,
      is_active: true,
    });
    setError(null);
    setIsAddingCustomKey(false);
    setCustomKeyInput("");
  };

  // অ্যাড/এডিট মোড ওপেন করা
  const openModal = (field?: OrderField) => {
    if (field) {
      const optionsStr =
        field.field_options && typeof field.field_options === "object"
          ? JSON.stringify(field.field_options)
          : field.field_options || "";

      setFormData({ ...field, field_options: optionsStr as string });

      // এডিট করার সময় যদি key ডিফল্ট লিস্টে না থাকে, তবে কাস্টম লিস্টে যোগ করে দেওয়া
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
    setIsModalOpen(true);
  };

  // নতুন কাস্টম কী যোগ করার হ্যান্ডলার
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

  // ফর্ম সাবমিট (CREATE & UPDATE)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

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
          company_id: selectedCompanyId,
          field_options: formData.field_options
            ? JSON.parse(formData.field_options)
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

      if (formData.id) {
        setSuccess("ফিল্ড সফলভাবে আপডেট হয়েছে!");
      } else {
        setSuccess("নতুন ফিল্ড সফলভাবে যোগ করা হয়েছে!");
      }

      await fetchCompanyFields(selectedCompanyId);

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError("ডেটা সেভ করতে সমস্যা হয়েছে। দয়া করে JSON ফরমেট চেক করুন।");
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // ডিলিট রিকোয়েস্ট (DELETE)
  const handleDelete = async (id: string) => {
    if (!window.confirm("আপনি কি নিশ্চিত যে এটি মুছে ফেলতে চান?")) return;

    setLoading(true);

    try {
      const payload = {
        action: "DELETE",
        data: { id, company_id: selectedCompanyId },
      };

      const response = await fetch(MANAGE_FIELDS_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Delete request failed");

      setFields(fields.filter((f) => f.id !== id));
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-6xl mx-auto mt-12 md:mt-24">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-100 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Order Fields Management
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              কোম্পানি অনুযায়ী কাস্টমারদের তথ্য সংগ্রহের ফিল্ড নির্ধারণ করুন।
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:w-64">
              <select
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium bg-slate-50 text-slate-700"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
              >
                <option value="">-- কোম্পানি নির্বাচন করুন --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => openModal()}
              disabled={!selectedCompanyId}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              <Plus size={18} /> নতুন ফিল্ড
            </button>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={18} /> {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {!selectedCompanyId ? (
            <div className="text-center p-16 text-slate-500 flex flex-col items-center">
              <div className="bg-indigo-50 p-4 rounded-full mb-3 text-indigo-500">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">
                কোনো কোম্পানি নির্বাচন করা হয়নি
              </h3>
              <p className="text-sm">
                ফিল্ড ম্যানেজ করতে উপরের ড্রপডাউন থেকে আপনার কোম্পানি বা পেজ
                নির্বাচন করুন।
              </p>
            </div>
          ) : fetchLoading ? (
            <div className="flex justify-center items-center p-12 text-slate-400">
              <Loader2 className="animate-spin mr-2" size={24} /> ডেটা লোড
              হচ্ছে...
            </div>
          ) : fields.length === 0 ? (
            <div className="text-center p-12 text-slate-500">
              কোনো ফিল্ড পাওয়া যায়নি। নতুন ফিল্ড যোগ করুন।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="p-4">Order</th>
                    <th className="p-4">Key</th>
                    <th className="p-4">Label & Question</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-center">Required</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((field) => (
                      <tr
                        key={field.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-4 font-medium text-slate-900">
                          {field.display_order}
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono">
                            {field.field_key}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-900">
                            {field.field_label}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {field.question_text}
                          </div>
                        </td>
                        <td className="p-4 capitalize">{field.field_type}</td>
                        <td className="p-4 text-center">
                          {field.is_required ? (
                            <span className="text-emerald-600 font-medium text-xs bg-emerald-50 px-2 py-1 rounded-full">
                              Yes
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium text-xs bg-slate-50 px-2 py-1 rounded-full">
                              No
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div
                            className={`inline-block w-2 h-2 rounded-full ${field.is_active ? "bg-emerald-500" : "bg-red-400"}`}
                          ></div>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => openModal(field)}
                            className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(field.id!)}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal / Form Overlay */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-8">
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                <h2 className="text-xl font-bold text-slate-800">
                  {formData.id ? "ফিল্ড এডিট করুন" : "নতুন ফিল্ড যোগ করুন"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Updated Field Key Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
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
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm bg-white"
                        required
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
                          className="text-indigo-600 font-bold"
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
                          className="w-full border border-indigo-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomKey}
                          disabled={!customKeyInput.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCustomKey(false);
                            setCustomKeyInput("");
                          }}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      ইউনিক আইডেন্টিফায়ার (স্পেস ছাড়া)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Field Label *
                    </label>
                    <input
                      type="text"
                      name="field_label"
                      value={formData.field_label}
                      onChange={handleChange}
                      placeholder="e.g., order field label"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Question Text (Chatbot Prompt) *
                  </label>
                  <input
                    type="text"
                    name="question_text"
                    value={formData.question_text}
                    onChange={handleChange}
                    placeholder="e.g., AI asked this question"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Field Type
                    </label>
                    <select
                      name="field_type"
                      value={formData.field_type}
                      onChange={handleChange}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm bg-white"
                    >
                      <option value="text">Text (Standard Input)</option>
                      <option value="number">Number</option>
                      <option value="dropdown">Dropdown / Options</option>
                      <option value="checkbox">Checkbox (True/False)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      name="display_order"
                      value={formData.display_order}
                      onChange={handleChange}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {formData.field_type === "dropdown" && (
                  <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                    <label className="block text-sm font-medium text-indigo-900 mb-1">
                      Field Options (JSON Array)
                    </label>
                    <textarea
                      name="field_options"
                      value={formData.field_options || ""}
                      onChange={handleChange}
                      placeholder='["Dhaka", "Chattogram", "Sylhet"]'
                      className="w-full border border-indigo-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-mono h-24"
                    />
                    <p className="text-xs text-indigo-500 mt-1">
                      Valid JSON Array ফরমেটে অপশনগুলো দিন।
                    </p>
                  </div>
                )}

                <div className="flex gap-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_required"
                      checked={formData.is_required}
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Required Field
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Active
                    </span>
                  </label>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    বাতিল করুন
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-70"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Save size={18} />
                    )}
                    {loading ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
