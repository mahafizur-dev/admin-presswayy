"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useChatStore } from "../store/useChatStore";

interface ChatbotInterfaceProps {
  companyId: string;
}

interface ReplyItem {
  reply_type?: string;
  message?: string;
  images?: { image_url?: string }[];
}

interface Attachment {
  id: string;
  preview: string;
  url?: string;
  status: "uploading" | "done" | "error";
  name: string;
}

const MAX_ATTACHMENTS = 4;
const MAX_FILE_MB = 10;

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

/* ---------- helpers ---------- */

function formatTime(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function parseBotContent(text: string): ReplyItem[] | string {
  if (typeof text !== "string") return String(text ?? "");
  const t = text.trim();
  if (!t.startsWith("[") && !t.startsWith("{")) return text;
  try {
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed)) return parsed as ReplyItem[];
    if (parsed && typeof parsed === "object") return [parsed as ReplyItem];
    return text;
  } catch {
    return text;
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET)
    throw new Error("Cloudinary config missing");
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form },
  );
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const data = await res.json();
  return data.secure_url as string;
}

/* ---------- atoms (compact) ---------- */

function BotAvatar() {
  return (
    <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-sm">
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="8" width="18" height="12" rx="3" />
        <path d="M12 8V4M8 2h8" />
        <circle cx="9" cy="14" r="1" fill="currentColor" />
        <circle cx="15" cy="14" r="1" fill="currentColor" />
      </svg>
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="h-6 w-6 shrink-0 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 shadow-sm">
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
}

function SentTicks() {
  return (
    <svg
      viewBox="0 0 18 12"
      className="h-2.5 w-3.5 text-indigo-200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 6.5 4 9.5 9.5 3" />
      <path d="M7.5 9 8 9.5 13.5 3" />
    </svg>
  );
}

function ChatImage({
  src,
  onOpen,
}: {
  src: string;
  onOpen: (src: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="relative overflow-hidden rounded-lg">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-slate-200" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="content"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        onClick={() => onOpen(src)}
        className={`max-h-44 w-full cursor-zoom-in object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        style={{ minHeight: loaded ? undefined : 96 }}
      />
    </div>
  );
}

/* ---------- main ---------- */

export default function ChatbotInterface({ companyId }: ChatbotInterfaceProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);

  const {
    messages,
    sessionId,
    isFetching,
    isSending,
    errorMessage,
    initSession,
    fetchHistory,
    sendMessage,
  } = useChatStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nearBottomRef = useRef(true);

  useEffect(() => {
    if (companyId) {
      initSession();
      fetchHistory(companyId);
    }
  }, [companyId, initSession, fetchHistory]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
    setShowJump(false);
  }, []);

  useEffect(() => {
    if (nearBottomRef.current) {
      scrollToBottom(messages.length <= 1 ? "auto" : "smooth");
    } else {
      setShowJump(true);
    }
  }, [messages, isSending, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottomRef.current = distance < 120;
    if (nearBottomRef.current) setShowJump(false);
  };

  const processedMessages = useMemo(
    () =>
      messages.map((msg) => ({
        ...msg,
        content: msg.sender === "bot" ? parseBotContent(msg.text) : msg.text,
      })),
    [messages],
  );

  /* ----- attachment handlers ----- */

  const updateAttachment = (id: string, patch: Partial<Attachment>) =>
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const slots = MAX_ATTACHMENTS - attachments.length;
    const picked = Array.from(files).slice(0, Math.max(0, slots));

    for (const file of picked) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_FILE_MB * 1024 * 1024) continue;

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      let preview = "";
      try {
        preview = await readFileAsDataURL(file);
      } catch {
        /* ignore */
      }

      setAttachments((prev) => [
        ...prev,
        { id, preview, status: "uploading", name: file.name },
      ]);

      uploadToCloudinary(file)
        .then((url) => updateAttachment(id, { url, status: "done" }))
        .catch((err) => {
          console.error("Upload error:", err);
          updateAttachment(id, { status: "error" });
        });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const uploading = attachments.some((a) => a.status === "uploading");
  const readyUrls = attachments
    .filter((a) => a.status === "done" && a.url)
    .map((a) => a.url as string);

  const canSend =
    (inputMessage.trim().length > 0 || readyUrls.length > 0) &&
    !isSending &&
    !uploading;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    const textToSend = inputMessage;
    const urls = readyUrls;
    setInputMessage("");
    setAttachments([]);
    nearBottomRef.current = true;
    await sendMessage(companyId, textToSend, urls);
  };

  return (
    <div className="flex h-[62vh] max-h-[520px] w-full max-w-md mx-auto flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:h-[520px]">
      {/* Header */}
      <header className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2">
        <BotAvatar />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight text-white">
            AI Assistant
          </h3>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[10px] text-indigo-100">Online</span>
          </div>
        </div>
        {sessionId && (
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-indigo-100">
            #{sessionId.slice(0, 6)}
          </span>
        )}
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto px-2.5 py-3"
        style={{
          backgroundColor: "#ece5dd",
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        {isFetching ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-xs">লোড হচ্ছে...</p>
          </div>
        ) : processedMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 shadow-sm">
              <BotAvatar />
            </div>
            <p className="text-xs text-slate-500">নতুন চ্যাট শুরু করুন 👋</p>
          </div>
        ) : (
          <div className="space-y-2">
            {processedMessages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-1.5 ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {isUser ? <UserAvatar /> : <BotAvatar />}

                  <div
                    className={`group relative max-w-[80%] rounded-2xl px-2.5 py-1.5 text-[13px] shadow-sm ${
                      isUser
                        ? "rounded-br-sm bg-indigo-600 text-white"
                        : "rounded-bl-sm bg-white text-slate-800"
                    }`}
                  >
                    {isUser && msg.images && msg.images.length > 0 && (
                      <div className="mb-1 grid grid-cols-2 gap-1">
                        {msg.images.map((src, i) => (
                          <ChatImage key={i} src={src} onOpen={setLightbox} />
                        ))}
                      </div>
                    )}

                    {isUser ? (
                      msg.text ? (
                        <p className="whitespace-pre-wrap break-words leading-snug">
                          {msg.text}
                        </p>
                      ) : null
                    ) : Array.isArray(msg.content) ? (
                      <div className="space-y-1.5">
                        {msg.content.map((item, idx) => (
                          <div key={idx} className="space-y-1.5">
                            {item.message && (
                              <p className="whitespace-pre-wrap break-words leading-snug">
                                {item.message}
                              </p>
                            )}
                            {Array.isArray(item.images) &&
                              item.images.map(
                                (img, i) =>
                                  img?.image_url && (
                                    <ChatImage
                                      key={i}
                                      src={img.image_url}
                                      onOpen={setLightbox}
                                    />
                                  ),
                              )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words leading-snug">
                        {msg.content}
                      </p>
                    )}

                    <div
                      className={`mt-0.5 flex items-center justify-end gap-1 ${
                        isUser ? "text-indigo-200" : "text-slate-400"
                      }`}
                    >
                      <span className="text-[9px]">
                        {formatTime(msg.timestamp)}
                      </span>
                      {isUser && <SentTicks />}
                    </div>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-end gap-1.5">
                <BotAvatar />
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3 py-2 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {showJump && (
          <button
            onClick={() => scrollToBottom()}
            className="sticky bottom-2 left-full ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white text-indigo-600 shadow-lg ring-1 ring-slate-200 transition hover:bg-indigo-50"
            aria-label="নতুন মেসেজে যান"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="bg-red-50 px-3 py-1.5 text-center text-[11px] text-red-600">
          {errorMessage}
        </div>
      )}

      {/* attachment preview row */}
      {attachments.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-slate-100 bg-slate-50 px-2.5 py-1.5">
          {attachments.map((a) => (
            <div key={a.id} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.preview || a.url}
                alt={a.name}
                className={`h-12 w-12 rounded-md border border-slate-200 object-cover ${
                  a.status !== "done" ? "opacity-60" : ""
                }`}
              />
              {a.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/30">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
              {a.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-red-500/40 text-[9px] font-bold text-white">
                  ত্রুটি
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-white shadow hover:bg-slate-900"
                aria-label="সরান"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-2.5 w-2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-1.5 border-t border-slate-200 bg-white p-2"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={attachments.length >= MAX_ATTACHMENTS}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="ছবি যোগ করুন"
          title="ছবি যোগ করুন"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={uploading ? "আপলোড হচ্ছে..." : "মেসেজ লিখুন..."}
          className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-[13px] outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />

        <button
          type="submit"
          disabled={!canSend}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="পাঠান"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </form>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="বন্ধ করুন"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="preview"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
