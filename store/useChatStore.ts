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

/* ------------------------- image/text helpers -------------------- */

function isImageUrl(value: string): boolean {
  if (!value || typeof value !== "string") return false;

  return (
    /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(value) ||
    value.includes("cloudinary.com") ||
    value.includes("res.cloudinary")
  );
}

// একটি text field-এ এক বা একাধিক image URL থাকতে পারে (কমা/whitespace-সেপারেটেড)।
// Cloudinary transform কমা (f_auto,q_auto) যাতে না ভাঙে তাই protocol boundary (https://)-তে
// split করি, তারপর প্রতিটি fragment থেকে trailing কমা/সেমিকোলন/space ছেঁটে validate করি।
// একটিমাত্র URL থাকলেও এটি কাজ করে, আবার "url1, url2" কে দুটি আলাদা URL-এ ভাঙে —
// যাতে যৌথ string কখনো single <img src> হিসেবে ঢুকে 404 না করে।
function splitImageUrls(value: string): string[] {
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  const protocolCount = (trimmed.match(/https?:\/\//g) || []).length;
  if (protocolCount === 0) return [];

  const fragments =
    protocolCount === 1 ? [trimmed] : trimmed.split(/(?=https?:\/\/)/);

  return fragments
    .map((f) =>
      f
        .trim()
        .replace(/[,;\s]+$/, "")
        .trim(),
    )
    .filter(isImageUrl);
}

function cleanMessageText(value: unknown): string {
  if (typeof value !== "string") return "";

  const text = value.trim();

  if (!text) return "";
  if (text === "Attachment") return "";
  if (isImageUrl(text)) return "";
  // multi-URL string হলে এটা টেক্সট নয় — খালি ফেরাই, যাতে bubble-এ URL টেক্সট না দেখায়
  if (splitImageUrls(text).length > 0) return "";

  return text;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .filter((value) => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function extractImageUrl(item: any): string | null {
  if (!item) return null;

  if (typeof item === "string") {
    return isImageUrl(item) ? item : null;
  }

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
  return uniqueStrings(
    arr.map(extractImageUrl).filter((url): url is string => Boolean(url)),
  );
}

function extractImagesFromAttachments(rawAttachments: any): string[] {
  if (!rawAttachments) return [];

  let atts = rawAttachments;

  if (typeof atts === "string") {
    const parsed = safeJsonParse<any>(atts, null);

    if (parsed) {
      atts = parsed;
    } else {
      // string হলে এটি এক বা একাধিক URL হতে পারে — protocol boundary-তে split করি
      return splitImageUrls(atts);
    }
  }

  if (!atts) return [];

  if (Array.isArray(atts.image_urls)) {
    return extractImagesFromArray(atts.image_urls);
  }

  if (Array.isArray(atts.attachments)) {
    return extractImagesFromArray(atts.attachments);
  }

  if (Array.isArray(atts.images)) {
    return extractImagesFromArray(atts.images);
  }

  if (Array.isArray(atts)) {
    return extractImagesFromArray(atts);
  }

  const singleUrl = extractImageUrl(atts);
  return singleUrl ? [singleUrl] : [];
}

/* ------------------------- response parsing ---------------------- */

function extractRows(data: unknown): any[] {
  if (!data) return [];

  if (Array.isArray(data)) {
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

    if (
      o.message_text ||
      o.text ||
      o.message ||
      o.content ||
      o.msg ||
      o.metadata ||
      o.attachments
    ) {
      return [o];
    }
  }

  return [];
}

function parseUserContent(raw: unknown): { text: string; images?: string[] } {
  const value = typeof raw === "string" ? raw.trim() : "";

  if (!value) {
    return { text: "" };
  }

  if (!value.startsWith("[") && !value.startsWith("{")) {
    // plain string: এক বা একাধিক image URL হতে পারে (কমা-সেপারেটেড সহ)
    const urls = splitImageUrls(value);
    return {
      text: urls.length ? "" : cleanMessageText(value),
      images: urls.length ? urls : undefined,
    };
  }

  const parsed = safeJsonParse<any>(value, null);

  if (parsed == null) {
    const urls = splitImageUrls(value);
    return {
      text: urls.length ? "" : cleanMessageText(value),
      images: urls.length ? urls : undefined,
    };
  }

  const arr = Array.isArray(parsed) ? parsed : [parsed];

  let text = "";
  const images: string[] = [];

  for (const item of arr) {
    const replyType = String(item?.reply_type || "").toLowerCase();

    const possibleText =
      item?.message ||
      item?.message_text ||
      item?.text ||
      item?.content ||
      item?.msg ||
      "";

    const cleanText = cleanMessageText(possibleText);

    if (cleanText && replyType !== "image" && !text) {
      text = cleanText;
    }

    if (Array.isArray(item?.images)) {
      images.push(...extractImagesFromArray(item.images));
    }

    const singleImage = extractImageUrl(item);

    if (singleImage) {
      images.push(singleImage);
    }
  }

  return {
    text,
    images: images.length ? uniqueStrings(images) : undefined,
  };
}

function rowHasRenderableContent(row: any): boolean {
  return Boolean(
    row &&
    (row.message_text ||
      row.text ||
      row.message ||
      row.content ||
      row.msg ||
      row.message_type ||
      row.images ||
      row.attachments ||
      row.metadata?.legacy_context?.saveText ||
      row.metadata?.entry?.[0]?.messaging?.[0]?.message?.text ||
      row.metadata?.entry?.[0]?.messaging?.[0]?.message?.attachments),
  );
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

  if (Array.isArray(row.images)) {
    images = extractImagesFromArray(row.images);
  }

  if (row.attachments) {
    images = uniqueStrings([
      ...images,
      ...extractImagesFromAttachments(row.attachments),
    ]);
  }

  if (sender === "user") {
    const messengerMessage =
      row.metadata?.entry?.[0]?.messaging?.[0]?.message || {};

    const legacySaveText =
      row.metadata?.legacy_context?.saveText ||
      row.metadata?.legacy_context?.save_text ||
      row.legacy_context?.saveText ||
      row.saveText ||
      "";

    const parsedRawText = parseUserContent(rawText);
    const parsedLegacy = parseUserContent(legacySaveText);

    const messengerText = cleanMessageText(messengerMessage.text || "");

    const messengerImages = Array.isArray(messengerMessage.attachments)
      ? messengerMessage.attachments
          .map((att: any) => att?.payload?.url || att?.url || att?.image_url)
          .filter(Boolean)
      : [];

    images = uniqueStrings([
      ...images,
      ...(parsedRawText.images || []),
      ...(parsedLegacy.images || []),
      ...messengerImages,
    ]);

    rawText =
      messengerText ||
      parsedLegacy.text ||
      parsedRawText.text ||
      cleanMessageText(rawText) ||
      "";
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
  return extractRows(data).filter(rowHasRenderableContent).map(mapRowToMessage);
}

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
        .filter(rowHasRenderableContent)
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
      const messengerAttachments: MessengerAttachment[] | undefined =
        attachments.length > 0
          ? attachments.map((url) => ({
              type: "image",
              payload: { url },
            }))
          : undefined;

      const messengerPayload: MessengerPayload = {
        object: "chatbot",
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

      const botCountBefore = get().messages.filter(
        (m) => m.sender === "bot",
      ).length;

      await apiSendMessage(
        messengerPayload as unknown as Record<string, unknown>,
      );

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

      await get().fetchHistory(companyId);
    } finally {
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
