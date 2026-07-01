import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSopStore } from "../store/useSopStore";
import { FIELD_CONFIG } from "../lib/sopConfig";
import {
  buildSchema,
  buildDefaults,
  cleanLabel,
  fieldVisible,
} from "../lib/sopSchema";
import type { FieldConfig, CustomField, FormValues } from "../lib/sopTypes";

export function useSOPForm(companyId?: string) {
  const { status, isFetching, errorMessage, submitSOP, updateSOP, fetchSOP } =
    useSopStore();

  const activeFields = useMemo(
    () => FIELD_CONFIG.filter((f) => !(f.onlyWhenNew && companyId)),
    [companyId],
  );

  // Visibility depends on live values (businessType, allowNegotiation...),
  // so we build the schema at validation time and only enforce `required`
  // on fields that are currently visible.
  const resolver = useMemo(
    () => (vals: FormValues, ctx: any, opts: any) =>
      zodResolver(buildSchema(activeFields, (f) => fieldVisible(f, vals)))(
        vals,
        ctx,
        opts,
      ),
    [activeFields],
  );

  const form = useForm<FormValues>({
    resolver: resolver as any,
    defaultValues: buildDefaults(activeFields, companyId),
  });

  const { reset, watch, setValue, setFocus } = form;
  const values = watch();

  const [isExisting, setIsExisting] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successAction, setSuccessAction] = useState<"submit" | "update">(
    "submit",
  );

  // Load existing SOP data on mount
  useEffect(() => {
    async function loadExistingData() {
      if (companyId) {
        const existingData = await fetchSOP(companyId);
        if (existingData) {
          const data: any = (existingData as any).answers ?? existingData;
          const { customFields: savedCustom, ...rest } = data || {};
          reset({ ...buildDefaults(activeFields, companyId), ...rest });
          setIsExisting(true);
          return Array.isArray(savedCustom)
            ? savedCustom.map((c: any) => ({ ...c, value: c.value ?? "" }))
            : [];
        } else {
          setValue("companyId", companyId, { shouldValidate: true });
          setIsExisting(false);
        }
      }
      return [];
    }
    loadExistingData().then((savedCustom) => {
      if (savedCustom.length > 0) {
        // Signal to parent via callback — caller provides onLoadCustomFields
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // showIf + hideIf উভয় হ্যান্ডল করে (render + validation একই লজিক)
  const isVisible = (f: FieldConfig) => fieldVisible(f, values);

  const completion = useMemo(() => {
    const fields = activeFields.filter(isVisible);
    const total = fields.length;
    const filled = fields.filter(
      (f) => (values[f.id] ?? "").toString().trim() !== "",
    ).length;
    const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
    return { filled, total, pct };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFields, values]);

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

  const buildPayload = (data: FormValues, customFields: CustomField[]) => {
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
    return payload;
  };

  const onSubmit = async (data: FormValues, customFields: CustomField[]) => {
    const payload = buildPayload(data, customFields);
    const wasExisting = isExisting;
    const isSuccess = await (wasExisting
      ? updateSOP(payload as any)
      : submitSOP(payload as any));

    if (isSuccess) {
      setSuccessAction(wasExisting ? "update" : "submit");
      setShowSuccessPopup(true);
      if (!wasExisting) setIsExisting(true);
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

  return {
    form,
    values,
    isExisting,
    isVisible,
    completion,
    groups,
    activeFields,
    missingFields,
    setMissingFields,
    showSuccessPopup,
    setShowSuccessPopup,
    successAction,
    onSubmit,
    onInvalid,
    status,
    isFetching,
    errorMessage,
  };
}
