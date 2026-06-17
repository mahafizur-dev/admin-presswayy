import { create } from "zustand";
import type { RawCost } from "../lib/tokenCost";
import { MessengerAttachment, MessengerPayload } from "../type/types";

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
  DELETE: "/api/chat/delete",
} as const;

const SESSION_KEY = "presswayy_chat_session_id";

// Polling config: check every 1.5s, give up after 20s
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 13;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------- image helpers ------------------------- */

function extractImageUrl(item: any): string | null {
  if (!item) return null;

  if (typeof item === "string") return item;

  return (
    item.image_url ||
    item.url ||
    item.preview ||
    item.payload?.url ||
    item.payload?.image_url ||
    null
  );
}

function extractImagesFromArray(arr: any[]): string[] {
  return arr.map(extractImageUrl).filter(Boolean) as string[];
}

function extractImagesFromAttachments(rawAttachments: any): string[] {
  if (!rawAttachments) return [];

  const atts =
    typeof rawAttachments === "string"
      ? safeJsonParse<any>(rawAttachments, null)
      : rawAttachments;

  if (!atts) return [];

  // New DB format:
  // { image_urls: [{ image_url: "https://..." }] }
  if (Array.isArray(atts.image_urls)) {
    return extractImagesFromArray(atts.image_urls);
  }

  // Legacy / incoming format:
  // { attachments: [{ url: "https://..." }] }
  if (Array.isArray(atts.attachments)) {
    return extractImagesFromArray(atts.attachments);
  }

  // Alternative format:
  // { images: [{ image_url: "https://..." }] }
  if (Array.isArray(atts.images)) {
    return extractImagesFromArray(atts.images);
  }

  // Direct array format:
  // [{ image_url: "https://..." }]
  if (Array.isArray(atts)) {
    return extractImagesFromArray(atts);
  }

  return [];
}

/* ------------------------- response parsing ---------------------- */

function extractRows(data: unknown): any[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    // Unwrap single-element wrapper objects like [{ data: [...] }]
    if (data.length === 1 && data[0] && typeof data[0] === "object") {
      const inner =
        data[0].output ??
        data[0].data ??
        data[0].rows ??
        data[0].results ??
        data[0].history ??
        data[0].messages;

      if (Array.isArray(inner)) return inner;
    }

    return data;
  }

  if (typeof data === "object") {
    const o = data as Record<string, any>;

    for (const key of [
      "data",
      "output",
      "rows",
      "results",
      "history",
      "messages",
    ]) {
      if (Array.isArray(o[key])) return o[key];
    }

    // Single object that looks like a message row
    if (o.message_text || o.text || o.message || o.content || o.msg) {
      return [o];
    }
  }

  return [];
}

function parseUserContent(raw: string): { text: string; images?: string[] } {
  const t = (raw || "").trim();

  if (!t.startsWith("[") && !t.startsWith("{")) {
    return { text: raw };
  }

  const parsed = safeJsonParse<any>(t, null);

  if (parsed == null) {
    return { text: raw };
  }

  const arr = Array.isArray(parsed) ? parsed : [parsed];

  let text = "";
  const images: string[] = [];

  for (const item of arr) {
    if (item?.message && !text) {
      text = item.message;
    }

    if (Array.isArray(item?.images)) {
      images.push(...extractImagesFromArray(item.images));
    }
  }

  return {
    text,
    images: images.length ? images : undefined,
  };
}

function mapRowToMessage(row: any): Message {
  const incomingSender = String(
    row.sender || row.sender_type || row.role || row.senderType || "",
  ).toLowerCase();

  const isBot =
    incomingSender === "bot" ||
    incomingSender === "ai" ||
    incomingSender === "assistant";

  const sender: Message["sender"] = isBot ? "bot" : "user";

  let rawText =
    row.message_text || row.text || row.message || row.content || row.msg || "";

  let images: string[] = [];

  // 1. Dedicated images column
  if (Array.isArray(row.images)) {
    images = extractImagesFromArray(row.images);
  }

  // 2. JSON / JSONB attachments column
  if (images.length === 0 && row.attachments) {
    images = extractImagesFromAttachments(row.attachments);
  }

  // 3. User image fallback
  if (sender === "user") {
    const isImageMsg = String(row.message_type || "").toLowerCase() === "image";

    if (isImageMsg && rawText && images.length === 0) {
      // text column holds the image URL directly
      images = [rawText];
      rawText = "";
    } else {
      // Legacy JSON format fallback
      const { text: parsedText, images: parsedImages } =
        parseUserContent(rawText);

      if (parsedImages && parsedImages.length > 0) {
        images = parsedImages;
        rawText = parsedText;
      }
    }
  }

  return {
    id: row.id ? String(row.id) : newId(),
    sender,
    text: rawText,
    timestamp: row.created_at || row.timestamp,
    images: images.length ? images : undefined,
    ...(isBot
      ? { cost: { bdt: Number(row.client_cost || row.tokens_used || 0) } }
      : {}),
  };
}

/* ------------------------- message builders ---------------------- */

function buildSaveText(text: string, attachments: string[]): string {
  if (!attachments.length) return text;

  const arr: any[] = [];

  if (text) {
    arr.push({
      reply_type: "text",
      message: text,
    });
  }

  arr.push({
    reply_type: "image",
    images: attachments.map((url) => ({ image_url: url })),
  });

  return JSON.stringify(arr);
}

/* ----------------------------- api ------------------------------- */

async function apiFetchHistory(
  companyId: string,
  sessionId: string,
): Promise<unknown> {
  const url = new URL(API.GET);

  url.searchParams.set("companyId", companyId);
  url.searchParams.set("sessionId", sessionId);
  url.searchParams.set("company_id", companyId);
  url.searchParams.set("session_id", sessionId);

  console.log(`[ChatStore] GET ${url.toString()}`);

  const res = await fetch(url.toString(), { method: "GET" });

  if (!res.ok) {
    throw new Error(`History load failed: ${res.status} ${res.statusText}`);
  }

  return safeJsonParse<unknown>(await res.text(), []);
}

async function apiSendMessage(payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(API.POST, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`মেসেজ পাঠানো যায়নি: ${res.status}`);
  }
}

async function apiDeleteHistory(
  companyId: string,
  sessionId: string,
): Promise<void> {
  const res = await fetch(API.DELETE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId, sessionId }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `চ্যাট মুছে ফেলা যায়নি: ${res.status}`);
  }
}

/* ----------------------- polling helper -------------------------- */

function filterAndMapRows(data: unknown): Message[] {
  return extractRows(data)
    .filter(
      (row) =>
        row &&
        (row.message_text ||
          row.text ||
          row.message ||
          row.content ||
          row.msg ||
          row.message_type ||
          row.images ||
          row.attachments),
    )
    .map(mapRowToMessage);
}

/**
 * Polls until the DB has more bot messages than `botCountBefore`.
 * Uses message count — NOT timestamps — to avoid client/server
 * timezone mismatches that cause the typing indicator to get stuck.
 */
async function pollForBotReply(
  companyId: string,
  sessionId: string,
  botCountBefore: number,
  onUpdate: (messages: Message[], botFound: boolean) => void,
): Promise<void> {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    try {
      const data = await apiFetchHistory(companyId, sessionId);
      const messages = filterAndMapRows(data);

      const botCountNow = messages.filter((m) => m.sender === "bot").length;
      const botFound = botCountNow > botCountBefore;

      onUpdate(messages, botFound);

      if (botFound) {
        console.log(
          `[ChatStore] Bot reply found on attempt ${
            attempt + 1
          } (${botCountBefore} → ${botCountNow})`,
        );
        return;
      }

      console.log(
        `[ChatStore] Poll ${
          attempt + 1
        }/${POLL_MAX_ATTEMPTS} — bot count still ${botCountNow}`,
      );
    } catch (err) {
      console.warn("[ChatStore] Poll attempt failed:", err);
    }
  }

  console.warn("[ChatStore] Polling exhausted — bot reply never arrived");
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

    if (!sId || !companyId) {
      console.warn("[ChatStore] Halted: missing companyId or sessionId");
      set({ errorMessage: "Missing companyId or sessionId." });
      return;
    }

    set({ isFetching: true, errorMessage: null });

    try {
      const data = await apiFetchHistory(companyId, sId);
      const rawRows = extractRows(data);

      console.log("[ChatStore] Fetched row count:", rawRows.length);

      const messages = rawRows
        .filter(
          (row) =>
            row &&
            (row.message_text ||
              row.text ||
              row.message ||
              row.content ||
              row.msg ||
              row.message_type ||
              row.images ||
              row.attachments),
        )
        .map(mapRowToMessage);

      set({ messages });
    } catch (error) {
      console.error("[ChatStore] fetchHistory error:", error);

      set({
        errorMessage:
          error instanceof Error
            ? error.message
            : "ডাটা ফেচ করতে সমস্যা হয়েছে",
      });
    } finally {
      set({ isFetching: false });
    }
  },

  sendMessage: async (companyId, text, attachments = []) => {
    const trimmed = text.trim();

    if (!trimmed && attachments.length === 0) return;

    const sId = get().initSession();

    if (!sId) return;

    const sentAt = new Date().toISOString();
    const generatedMessageId = `m_${newId().replace(/-/g, "")}`;

    // 1. Optimistically add the user message immediately
    const userMessage: Message = {
      id: newId(),
      sender: "user",
      text: trimmed,
      images: attachments.length ? attachments : undefined,
      timestamp: sentAt,
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isSending: true,
      errorMessage: null,
    }));

    try {
      // 2. Build the Messenger-shaped payload n8n expects
      const messengerAttachments: MessengerAttachment[] | undefined =
        attachments.length > 0
          ? attachments.map((url) => ({
              type: "image",
              payload: { url },
            }))
          : undefined;

      const messengerPayload: MessengerPayload = {
        object: "page",
        entry: [
          {
            id: companyId,
            time: Date.now(),
            messaging: [
              {
                sender: { id: sId },
                recipient: { id: companyId },
                timestamp: Date.now(),
                message: {
                  mid: generatedMessageId,
                  ...(trimmed ? { text: trimmed } : {}),
                  ...(messengerAttachments
                    ? { attachments: messengerAttachments }
                    : {}),
                },
              },
            ],
          },
        ],
        legacy_context: {
          saveText: buildSaveText(trimmed, attachments),
        },
      };

      // 3. Snapshot bot count BEFORE the POST so polling can detect the new reply
      const botCountBefore = get().messages.filter(
        (m) => m.sender === "bot",
      ).length;

      // 4. Fire the POST — n8n processes async, response body is not useful
      await apiSendMessage(
        messengerPayload as unknown as Record<string, unknown>,
      );

      // 5. Poll the DB until a new bot message appears
      await pollForBotReply(
        companyId,
        sId,
        botCountBefore,
        (messages, botFound) => {
          if (botFound) {
            set({ messages, isSending: false });
          } else {
            set({ messages });
          }
        },
      );
    } catch (error) {
      console.error("[ChatStore] sendMessage error:", error);

      set({
        errorMessage:
          error instanceof Error ? error.message : "মেসেজ পাঠানো ব্যর্থ হয়েছে",
      });

      // On error, do a single fetch to sync state with DB
      await get().fetchHistory(companyId);
    } finally {
      // Always ensure isSending is cleared
      set({ isSending: false });
    }
  },

  clearChats: async (companyId) => {
    const sId = get().initSession();

    if (!sId || !companyId || get().isDeleting) return;

    set({ isDeleting: true, errorMessage: null });

    try {
      await apiDeleteHistory(companyId, sId);
      set({ messages: [] });
    } catch (error) {
      console.error("[ChatStore] clearChats error:", error);

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
