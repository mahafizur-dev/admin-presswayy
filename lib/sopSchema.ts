import { z } from "zod";
import type { FieldConfig, FormValues } from "./sopTypes";

// =============================================================================
// Visibility — showIf/hideIf উভয় হ্যান্ডল করে (render + validation একই লজিক)
// =============================================================================
export function fieldVisible(f: FieldConfig, values: FormValues): boolean {
  // hideIf আগে: শর্ত মিললে ফিল্ড লুকানো
  if (f.hideIf) {
    const hv = values[f.hideIf.field];
    const shouldHide = f.hideIf.in
      ? f.hideIf.in.includes(hv)
      : hv === f.hideIf.equals;
    if (shouldHide) return false;
  }
  if (!f.showIf) return true;
  const current = values[f.showIf.field];
  if (f.showIf.in) return f.showIf.in.includes(current);
  return current === f.showIf.equals;
}

// =============================================================================
// Generic form helpers
// =============================================================================
export function cleanLabel(label: string): string {
  const noStar = label.replace(/\s*\*$/, "");
  const dashIdx = noStar.indexOf(" - ");
  return dashIdx >= 0 ? noStar.slice(dashIdx + 3) : noStar;
}

// required শুধু তখনই enforce হয় যখন ফিল্ডটি দৃশ্যমান —
// তাই service-এ লুকানো required ফিল্ড সাবমিট আটকায় না।
export function buildSchema(
  fields: FieldConfig[],
  isVisible: (f: FieldConfig) => boolean = () => true,
) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    shape[f.id] =
      f.required && isVisible(f)
        ? z.string().min(1, `${cleanLabel(f.label)} আবশ্যক`)
        : z.string().optional().or(z.literal(""));
  }
  return z.object(shape);
}

export function buildDefaults(
  fields: FieldConfig[],
  companyId?: string,
): FormValues {
  const out: FormValues = {};
  for (const f of fields) out[f.id] = f.default ?? "";
  if (companyId) out.companyId = companyId;
  return out;
}

// =============================================================================
// DB transforms — camelCase (form) <-> snake_case (SQL)
// =============================================================================
export type SOPFormData = FormValues;

const toCharge = (v?: string): number => {
  const n = Number((v ?? "").trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const transformSOPDataToSQL = (data: SOPFormData) => {
  return {
    company_id: data.companyId,
    business_name: data.businessName,
    business_type: data.businessType,
    business_overview: data.businessOverview,
    required_ai_behavior: data.requiredAiBehavior,
    ai_name: data.aiName,
    reply_language: data.replyLanguage,
    use_emoji: data.useEmoji === "Yes",
    addressing_style: data.addressingStyle,
    greeting_style: data.greetingStyle,
    response_length: data.responseLength,
    payment_method: data.paymentMethod,
    image_guidelines: data.imageGuidelines,
    image_recognition: data.imageRecognition,
    allow_negotiation: data.allowNegotiation === "Yes",
    negotiation_policy: data.negotiationPolicy,
    pricing_format: data.pricingFormat,
    return_policy: data.returnPolicy,
    refund_policy: data.refundPolicy,
    support_phone: data.supportPhone,
    website_link: data.websiteLink,
    contact_details: data.contactDetails,
    out_of_stock_reply: data.outOfStockReply,
    faq_list: data.faqList,
    escalation_policy: data.escalationPolicy,
    delivery_time_inside_dhaka: data.deliveryTimeInsideDhaka,
    delivery_time_outside_dhaka: data.deliveryTimeOutsideDhaka,
    delivery_charge_inside_dhaka: toCharge(data.deliveryChargeInsideDhaka),
    delivery_charge_outside_dhaka: toCharge(data.deliveryChargeOutsideDhaka),
  };
};

export const transformSQLToSOPData = (dbData: any): SOPFormData => {
  return {
    companyId: dbData.company_id || "",
    businessName: dbData.business_name || "",
    businessType: dbData.business_type || "",
    businessOverview: dbData.business_overview || "",
    requiredAiBehavior: dbData.required_ai_behavior || "Friendly",
    aiName: dbData.ai_name || "",
    replyLanguage: dbData.reply_language || "",
    useEmoji: dbData.use_emoji ? "Yes" : "No",
    addressingStyle: dbData.addressing_style || "",
    greetingStyle: dbData.greeting_style || "",
    responseLength: dbData.response_length || "",
    paymentMethod: dbData.payment_method || "",
    imageGuidelines: dbData.image_guidelines || "",
    imageRecognition: dbData.image_recognition || "",
    allowNegotiation: dbData.allow_negotiation ? "Yes" : "No",
    negotiationPolicy: dbData.negotiation_policy || "No",
    pricingFormat: dbData.pricing_format || "",
    returnPolicy: dbData.return_policy || "",
    refundPolicy: dbData.refund_policy || "",
    supportPhone: dbData.support_phone || "",
    websiteLink: dbData.website_link || "",
    contactDetails: dbData.contact_details || "",
    outOfStockReply: dbData.out_of_stock_reply || "",
    faqList: dbData.faq_list || "",
    escalationPolicy: dbData.escalation_policy || "",
    deliveryTimeInsideDhaka: dbData.delivery_time_inside_dhaka || "",
    deliveryTimeOutsideDhaka: dbData.delivery_time_outside_dhaka || "",
    deliveryChargeInsideDhaka:
      dbData.delivery_charge_inside_dhaka?.toString() || "",
    deliveryChargeOutsideDhaka:
      dbData.delivery_charge_outside_dhaka?.toString() || "",
  };
};
