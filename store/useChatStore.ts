import { create } from "zustand";

export interface Message {
  id?: string;
  sender: "user" | "bot";
  text: string;
  timestamp?: string;
  images?: string[]; // user-এর পাঠানো attachment URL
}

interface ChatState {
  messages: Message[];
  sessionId: string | null;
  isFetching: boolean;
  isSending: boolean;
  errorMessage: string | null;
  initSession: () => string;
  fetchHistory: (companyId: string) => Promise<void>;
  sendMessage: (
    companyId: string,
    text: string,
    attachments?: string[],
  ) => Promise<void>;
}

const GET_URL = "https://server.presswayy.com/webhook/api/v1/get-data-chatbot";
const POST_URL =
  "https://server.presswayy.com/webhook/api/v1/post-data-chatbot";
const BOT_FALLBACK = "দুঃখিত, আমি এটি বুঝতে পারিনি।";
const IMAGE_PLACEHOLDER = "(একটি ছবি পাঠানো হয়েছে)";

// নিরাপদে যেকোনো shape থেকে rows[] বের করা
function extractRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (data && typeof data === "object" && data.message_text) return [data];
  return [];
}

// POST রেসপন্স থেকে আসল bot reply বের করা
function extractReplyPayload(data: any): any {
  let payload = data;
  if (Array.isArray(payload) && payload.length && payload[0]?.output != null) {
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
  const payload = extractReplyPayload(data);
  if (payload == null) return BOT_FALLBACK;
  if (typeof payload === "string") return payload.trim() || BOT_FALLBACK;
  if (Array.isArray(payload) || typeof payload === "object") {
    try {
      return JSON.stringify(payload);
    } catch {
      return BOT_FALLBACK;
    }
  }
  return String(payload);
}

// user message_text (plain বা JSON-array) থেকে text + image URL বের করা
function parseUserContent(raw: string): { text: string; images?: string[] } {
  const t = (raw || "").trim();
  if (!t.startsWith("[") && !t.startsWith("{")) return { text: raw };
  try {
    const parsed = JSON.parse(t);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    let text = "";
    const images: string[] = [];
    for (const item of arr) {
      // reply_type যা-ই হোক — message থাকলে text, images থাকলে ছবি
      if (item?.message && !text) text = item.message;
      if (Array.isArray(item?.images)) {
        for (const im of item.images)
          if (im?.image_url) images.push(im.image_url);
      }
    }
    return { text, images: images.length ? images : undefined };
  } catch {
    return { text: raw };
  }
}

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: null,
  isFetching: false,
  isSending: false,
  errorMessage: null,

  initSession: () => {
    let currentSessionId = get().sessionId;
    if (!currentSessionId && typeof window !== "undefined") {
      currentSessionId = localStorage.getItem("presswayy_chat_session_id");
      if (!currentSessionId) {
        currentSessionId = crypto.randomUUID();
        localStorage.setItem("presswayy_chat_session_id", currentSessionId);
      }
      set({ sessionId: currentSessionId });
    }
    return currentSessionId || "";
  },

  fetchHistory: async (companyId) => {
    const sId = get().initSession();
    if (!sId || !companyId) return;

    set({ isFetching: true, errorMessage: null });

    try {
      const url = new URL(GET_URL);
      url.searchParams.append("companyId", companyId);
      url.searchParams.append("sessionId", sId);

      const response = await fetch(url.toString(), { method: "GET" });

      if (!response.ok) {
        console.warn("History load failed, status:", response.status);
        set({ messages: [] });
        return;
      }

      const raw = await response.text();
      let data: any = [];
      if (raw && raw.trim()) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = [];
        }
      }

      const formattedMessages: Message[] = extractRows(data)
        .filter((msg) => msg && (msg.message_text ?? msg.text))
        .map((msg) => {
          const sender = msg.sender === "bot" ? "bot" : "user";
          const rawText = msg.message_text || msg.text || "";
          const base = {
            id: msg.id ? String(msg.id) : newId(),
            sender: sender as "user" | "bot",
            timestamp: msg.created_at,
          };
          // user message হলে JSON parse করে ছবি ফিরিয়ে আনি; bot হলে raw রাখি (UI parse করে)
          if (sender === "user") {
            const parsed = parseUserContent(rawText);
            return { ...base, text: parsed.text, images: parsed.images };
          }
          return { ...base, text: rawText };
        });

      set({ messages: formattedMessages });
    } catch (error: any) {
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

    // DB/display-এর জন্য content: plain text, নয়তো JSON-array (text + images)
    let saveText = trimmed;
    if (attachments.length) {
      const arr: any[] = [];
      if (trimmed) arr.push({ reply_type: "text", message: trimmed });
      arr.push({
        reply_type: "image",
        images: attachments.map((u) => ({ image_url: u })),
      });
      saveText = JSON.stringify(arr);
    }

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
      const response = await fetch(POST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          sessionId: sId,
          // AI prompt: খালি না রাখতে placeholder
          message: trimmed || IMAGE_PLACEHOLDER,
          // DB-তে যা সেভ হবে (ছবিসহ) — workflow এটাই সেভ করবে
          saveText,
          // hosted image URL array (Cloudinary)
          attachments,
        }),
      });

      if (!response.ok) throw new Error("মেসেজ পাঠানো যায়নি");

      const rawRes = await response.text();
      let resData: any = null;
      if (rawRes && rawRes.trim()) {
        try {
          resData = JSON.parse(rawRes);
        } catch {
          resData = rawRes;
        }
      }

      const botReply: Message = {
        id: newId(),
        sender: "bot",
        text: toBotText(resData),
        timestamp: new Date().toISOString(),
      };

      set((state) => ({ messages: [...state.messages, botReply] }));
    } catch (error: any) {
      set({ errorMessage: error.message || "মেসেজ পাঠানো ব্যর্থ হয়েছে" });
    } finally {
      set({ isSending: false });
    }
  },
}));
