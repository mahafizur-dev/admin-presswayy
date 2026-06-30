import { z } from "zod";
import type { FieldConfig, FormValues } from "./sopTypes";

export function cleanLabel(label: string): string {
  const noStar = label.replace(/\s*\*$/, "");
  const dashIdx = noStar.indexOf(" - ");
  return dashIdx >= 0 ? noStar.slice(dashIdx + 3) : noStar;
}

export function buildSchema(fields: FieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    shape[f.id] = f.required
      ? z.string().min(1, `${cleanLabel(f.label)} আবশ্যক`)
      : z.string().optional().or(z.literal(""));
  }
  return z.object(shape);
}

export function buildDefaults(fields: FieldConfig[], companyId?: string): FormValues {
  const out: FormValues = {};
  for (const f of fields) out[f.id] = f.default ?? "";
  if (companyId) out.companyId = companyId;
  return out;
}