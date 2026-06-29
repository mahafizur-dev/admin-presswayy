export function formatTime(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function unescapeNewlines(text: string): string {
  return text.replace(/\\n/g, "\n");
}

export interface ReplyItem {
  reply_type?: string;
  message_text?: string;
  text?: string;
  message?: string;
  content?: string;
  msg?: string;
  output?: string;
  images?: Array<{ image_url?: string; url?: string } | string>;
}

export function parseBotContent(text: string): ReplyItem[] | string {
  if (typeof text !== "string") return String(text ?? "");
  const safe = unescapeNewlines(text);
  const t = safe.trim();
  if (!t.startsWith("[") && !t.startsWith("{")) return safe;
  try {
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed)) return parsed as ReplyItem[];
    if (parsed && typeof parsed === "object") return [parsed as ReplyItem];
    return text;
  } catch {
    return text;
  }
}

export function extractReplyItemText(item: ReplyItem): string {
  return (
    item.message_text ||
    item.text ||
    item.message ||
    item.content ||
    item.msg ||
    item.output ||
    ""
  );
}

export function extractReplyItemImages(item: ReplyItem): string[] {
  if (!Array.isArray(item.images)) return [];
  return item.images
    .map((img) => (typeof img === "string" ? img : img?.image_url || img?.url))
    .filter((src): src is string => Boolean(src));
}
