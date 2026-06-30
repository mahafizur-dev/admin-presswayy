"use client";

import React, { useState } from "react";
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
import { useOrderFields, DEFAULT_FIELD_KEYS } from "@/hooks/useOrderFields";
import type { OrderField } from "../../lib/sopTypes";

interface OrderFieldsManagerProps {
  companyId?: string;
}

export function OrderFieldsManager({ companyId }: OrderFieldsManagerProps) {
  const {
    fields,
    loading,
    fetchLoading,
    error,
    success,
    clearMessages,
    saveField,
    deleteField,
    fieldCount,
  } = useOrderFields(companyId);

  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const resetForm = () => {
    setFormData({
      ...emptyForm,
      company_id: companyId || "",
      display_order: fieldCount + 1,
    });
    clearMessages();
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
    clearMessages();
    setIsModalOpen(true);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await saveField(formData);
    if (ok) {
      setIsModalOpen(false);
      resetForm();
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
                          className={`inline-block h-2 w-2 rounded-full ${field.is_active ? "bg-emerald-500" : "bg-rose-400"}`}
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
                          onClick={() => deleteField(field.id!)}
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

      {/* Modal */}
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
