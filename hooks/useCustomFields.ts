import { useState } from "react";
import type { CustomField } from "../lib/sopTypes";

const localId = () => `cf_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export function useCustomFields(initial: CustomField[] = []) {
  const [customFields, setCustomFields] = useState<CustomField[]>(initial);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"input" | "textarea">("input");

  const add = () => {
    const label = newLabel.trim();
    if (!label) return;
    setCustomFields((prev) => [
      ...prev,
      { id: localId(), label, type: newType, value: "" },
    ]);
    setNewLabel("");
    setNewType("input");
  };

  const remove = (id: string) =>
    setCustomFields((prev) => prev.filter((c) => c.id !== id));

  const updateValue = (id: string, value: string) =>
    setCustomFields((prev) =>
      prev.map((c) => (c.id === id ? { ...c, value } : c)),
    );

  const reset = (fields: CustomField[]) => setCustomFields(fields);

  return {
    customFields,
    newLabel,
    setNewLabel,
    newType,
    setNewType,
    add,
    remove,
    updateValue,
    reset,
  };
}
