import { create } from "zustand";
import type { RawCost } from "../lib/tokenCost";

/* ----------------------------- types ----------------------------- */

export interface Message {
  id?: string;
  sender: "user" | "bot";
  text: string;
  timestamp?: string;
  images?: string[];
  cost?: RawCost;
}

interface ChatState {
  messages: Message[];
  sessionId: string | null;
  isFetching: boolean;
  isSending: boolean;
  isDeleting: boolean;
  errorMessage: string | null;
  initSession: () => string;
  fetchHistory: (companyId: string) => Promise<void>;
  sendMessage: (
    companyId: string,
    text: string,
    attachments?: string[],
  ) => Promise<void>;
  clearChats: (companyId: string) => Promise<void>;
}

/* --------------------------- constants --------------------------- */

const API = {
  GET: "https://server.presswayy.com/webhook/api/v1/get-data-chatbot",
  POST: "https://server.presswayy.com/webhook/api/v1/post-data-chatbot",
  DELETE: "https://server.presswayy.com/webhook/api/v1/delete-data-chatbot",
} as const;

const SESSION_KEY = "presswayy_chat_session_id";
const BOT_FALLBACK = "দুঃখিত, আমি এটি বুঝতে পারিনি।";
const IMAGE_PLACEHOLDER = "(একটি ছবি পাঠানো হয়েছে)";

/* ----------------------------- utils ----------------------------- */

const newId = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadSessionId(): string | null {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = newId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/* ------------------------- response parsing ---------------------- */

// যেকোনো shape থেকে rows[] বের করা
function extractRows(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, any>;
    if (Array.isArray(o.data)) return o.data;
    if (o.message_text) return [o];
  }
  return [];
}

// nested reply payload (output / reply / response / data) খুলে আনা
function unwrapReply(data: any): any {
  let payload = data;
  if (Array.isArray(payload) && payload[0]?.output != null) {
    payload = payload[0].output;
  } else if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload)
  ) {
    const unwrapped =
      payload.output ?? payload.reply ?? payload.response ?? payload.data;
    if (unwrapped !== undefined) payload = unwrapped;
  }
  return payload;
}

function toBotText(data: any): string {
  const payload = unwrapReply(data);
  if (payload == null) return BOT_FALLBACK;
  if (typeof payload === "string") return payload.trim() || BOT_FALLBACK;
  if (typeof payload === "object") {
    try {
      return JSON.stringify(payload);
    } catch {
      return BOT_FALLBACK;
    }
  }
  return String(payload);
}

// response থেকে cost বের করা (top-level { cost: { bdt, usd } })
function extractCost(data: any): RawCost | undefined {
  const obj = Array.isArray(data) ? data[0] : data;
  const c = obj?.cost;
  if (!c || typeof c !== "object") return undefined;
  return {
    bdt: Number(c.bdt) || 0,
    usd: Number(c.usd) || 0,
    tokens: Number(c.tokens) || 0,
  };
}

// user message_text (plain বা JSON-array) → text + image URLs
function parseUserContent(raw: string): { text: string; images?: string[] } {
  const t = (raw || "").trim();
  if (!t.startsWith("[") && !t.startsWith("{")) return { text: raw };

  const parsed = safeJsonParse<any>(t, null);
  if (parsed == null) return { text: raw };

  const arr = Array.isArray(parsed) ? parsed : [parsed];
  let text = "";
  const images: string[] = [];
  for (const item of arr) {
    if (item?.message && !text) text = item.message;
    if (Array.isArray(item?.images)) {
      for (const im of item.images)
        if (im?.image_url) images.push(im.image_url);
    }
  }
  return { text, images: images.length ? images : undefined };
}

/* ------------------------- message builders ---------------------- */

// outgoing content: plain text, নয়তো JSON-array (text + images)
function buildSaveText(text: string, attachments: string[]): string {
  if (!attachments.length) return text;
  const arr: any[] = [];
  if (text) arr.push({ reply_type: "text", message: text });
  arr.push({
    reply_type: "image",
    images: attachments.map((u) => ({ image_url: u })),
  });
  return JSON.stringify(arr);
}

// DB row → Message (user হলে ছবি parse, bot হলে raw + cost from tokens_used)
function mapRowToMessage(row: any): Message {
  const sender: Message["sender"] = row.sender === "bot" ? "bot" : "user";
  const rawText = row.message_text || row.text || "";
  const base: Message = {
    id: row.id ? String(row.id) : newId(),
    sender,
    text: rawText,
    timestamp: row.created_at,
  };

  if (sender === "user") {
    const { text, images } = parseUserContent(rawText);
    return { ...base, text, images };
  }
  return { ...base, cost: { bdt: Number(row.tokens_used) || 0 } };
}

/* ----------------------------- api ------------------------------- */

async function apiFetchHistory(
  companyId: string,
  sessionId: string,
): Promise<unknown> {
  const url = new URL(API.GET);
  url.searchParams.set("companyId", companyId);
  url.searchParams.set("sessionId", sessionId);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) throw new Error(`History load failed: ${res.status}`);
  return safeJsonParse<unknown>(await res.text(), []);
}

async function apiSendMessage(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(API.POST, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("মেসেজ পাঠানো যায়নি");
  return safeJsonParse<unknown>(await res.text(), null);
}

// এই session/company-র সব চ্যাট সার্ভার থেকে স্থায়ীভাবে মুছে ফেলা
async function apiDeleteHistory(
  companyId: string,
  sessionId: string,
): Promise<void> {
  const res = await fetch(API.DELETE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId, sessionId }),
  });
  if (!res.ok) throw new Error(`চ্যাট মুছে ফেলা যায়নি: ${res.status}`);
}

/* ----------------------------- store ----------------------------- */

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: null,
  isFetching: false,
  isSending: false,
  isDeleting: false,
  errorMessage: null,

  initSession: () => {
    let id = get().sessionId;
    if (!id) {
      id = loadSessionId();
      if (id) set({ sessionId: id });
    }
    return id || "";
  },

  fetchHistory: async (companyId) => {
    const sId = get().initSession();
    if (!sId || !companyId) return;

    set({ isFetching: true, errorMessage: null });
    try {
      const data = await apiFetchHistory(companyId, sId);
      const messages = extractRows(data)
        .filter((row) => row && (row.message_text ?? row.text))
        .map(mapRowToMessage);
      set({ messages });
    } catch (error) {
      console.error("Fetch Error:", error);
      set({ messages: [] });
    } finally {
      set({ isFetching: false });
    }
  },

  sendMessage: async (companyId, text, attachments = []) => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    const sId = get().initSession();

    const userMessage: Message = {
      id: newId(),
      sender: "user",
      text: trimmed,
      images: attachments.length ? attachments : undefined,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isSending: true,
      errorMessage: null,
    }));

    try {
      const resData = await apiSendMessage({
        companyId,
        sessionId: sId,
        message: trimmed || IMAGE_PLACEHOLDER, // খালি না রাখতে placeholder
        saveText: buildSaveText(trimmed, attachments),
        attachments,
      });

      const botReply: Message = {
        id: newId(),
        sender: "bot",
        text: toBotText(resData),
        cost: extractCost(resData),
        timestamp: new Date().toISOString(),
      };

      set((state) => ({ messages: [...state.messages, botReply] }));
    } catch (error) {
      set({
        errorMessage:
          error instanceof Error ? error.message : "মেসেজ পাঠানো ব্যর্থ হয়েছে",
      });
    } finally {
      set({ isSending: false });
    }
  },

  clearChats: async (companyId) => {
    const sId = get().initSession();
    if (!sId || !companyId) return;
    if (get().isDeleting) return; // ডাবল-ক্লিক প্রতিরোধ

    set({ isDeleting: true, errorMessage: null });
    try {
      await apiDeleteHistory(companyId, sId);
      // সার্ভারে মুছে যাওয়ার পর local state-ও খালি করা
      set({ messages: [] });
    } catch (error) {
      console.error("Delete Error:", error);
      set({
        errorMessage:
          error instanceof Error
            ? error.message
            : "চ্যাট মুছে ফেলা ব্যর্থ হয়েছে",
      });
    } finally {
      set({ isDeleting: false });
    }
  },
}));
