export type FieldType = "input" | "select" | "textarea";

export interface FieldConfig {
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

export interface CustomField {
  id: string;
  label: string;
  type: "input" | "textarea";
  value: string;
}

export interface OrderField {
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

export type FormValues = Record<string, string>;
