import { create } from "zustand";

export interface Message {
  id?: string;
  sender: "user" | "bot";
  text: string;
  timestamp?: string;
}

interface ChatState {
  messages: Message[];
  sessionId: string | null;
  isFetching: boolean;
  isSending: boolean;
  errorMessage: string | null;
  initSession: () => string;
  fetchHistory: (companyId: string) => Promise<void>;
  sendMessage: (companyId: string, text: string) => Promise<void>;
}

const GET_URL = "https://server.presswayy.com/webhook/api/v1/get-data-chatbot";
const POST_URL =
  "https://server.presswayy.com/webhook/api/v1/post-data-chatbot";
const BOT_FALLBACK = "দুঃখিত, আমি এটি বুঝতে পারিনি।";

// নিরাপদে যেকোনো shape থেকে rows[] বের করা
function extractRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (data && typeof data === "object" && data.message_text) return [data];
  return [];
}

// POST রেসপন্স থেকে আসল bot reply বের করা (wrapper unwrap)
function extractReplyPayload(data: any): any {
  let payload = data;

  // n8n কখনো array আকারে item পাঠায়: [{ output: ... }]
  if (Array.isArray(payload) && payload.length && payload[0]?.output != null) {
    payload = payload[0].output;
  }
  // object wrapper: { output | reply | response | data }
  else if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const unwrapped =
      payload.output ?? payload.reply ?? payload.response ?? payload.data;
    if (unwrapped !== undefined) payload = unwrapped;
  }

  return payload;
}

// reply কে UI-এর উপযোগী text-এ রূপান্তর
// array/object হলে JSON string (UI সেটা parse করে text/image render করে)
function toBotText(data: any): string {
  const payload = extractReplyPayload(data);

  if (payload == null) return BOT_FALLBACK;

  if (typeof payload === "string") {
    return payload.trim() || BOT_FALLBACK;
  }

  if (Array.isArray(payload) || typeof payload === "object") {
    try {
      return JSON.stringify(payload);
    } catch {
      return BOT_FALLBACK;
    }
  }

  return String(payload);
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

      // history fail করলে UI crash করানো উচিত নয় → শুধু খালি দেখাও, throw নয়
      if (!response.ok) {
        console.warn("History load failed, status:", response.status);
        set({ messages: [] });
        return;
      }

      // খালি / non-JSON রেসপন্সেও যাতে ক্র্যাশ না করে
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
        .map((msg) => ({
          id: msg.id ? String(msg.id) : newId(),
          sender: msg.sender === "bot" ? "bot" : "user",
          text: msg.message_text || msg.text || "",
          timestamp: msg.created_at,
        }));

      set({ messages: formattedMessages });
    } catch (error: any) {
      // নেটওয়ার্ক error হলেও page চালু থাকবে, শুধু history খালি
      console.error("Fetch Error:", error);
      set({ messages: [] });
    } finally {
      set({ isFetching: false });
    }
  },

  sendMessage: async (companyId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const sId = get().initSession();

    const userMessage: Message = {
      id: newId(),
      sender: "user",
      text: trimmed,
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
        body: JSON.stringify({ companyId, sessionId: sId, message: trimmed }),
      });

      if (!response.ok) throw new Error("মেসেজ পাঠানো যায়নি");

      const raw = await response.text();
      let data: any = null;
      if (raw && raw.trim()) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw; // plain text reply
        }
      }

      const botReply: Message = {
        id: newId(),
        sender: "bot",
        text: toBotText(data),
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
