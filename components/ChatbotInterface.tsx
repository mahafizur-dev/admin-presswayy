"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useChatStore, type Message } from "../store/useChatStore";
import { computeDisplayCost } from "../lib/tokenCost";
import type { RawCost } from "../lib/tokenCost";

/* ----------------------------- types ----------------------------- */

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

type ProcessedMessage = Message & { content: ReplyItem[] | string };

/* --------------------------- constants --------------------------- */

const MAX_ATTACHMENTS = 4;
const MAX_FILE_MB = 10;
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

/* ----------------------------- helpers --------------------------- */

const localId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function formatTime(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

/* ------------------------------ hooks ---------------------------- */

function useAttachments() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (id: string, patch: Partial<Attachment>) =>
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );

  const remove = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const clear = () => setAttachments([]);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const slots = Math.max(0, MAX_ATTACHMENTS - attachments.length);
    const picked = Array.from(files).slice(0, slots);

    for (const file of picked) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_FILE_MB * 1024 * 1024) continue;

      const id = localId();
      let preview = "";
      try {
        preview = await readFileAsDataURL(file);
      } catch {
        /* ignore preview failure */
      }

      setAttachments((prev) => [
        ...prev,
        { id, preview, status: "uploading", name: file.name },
      ]);

      uploadToCloudinary(file)
        .then((url) => update(id, { url, status: "done" }))
        .catch((err) => {
          console.error("Upload error:", err);
          update(id, { status: "error" });
        });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploading = attachments.some((a) => a.status === "uploading");
  const readyUrls = attachments
    .filter((a) => a.status === "done" && a.url)
    .map((a) => a.url as string);

  return {
    attachments,
    fileInputRef,
    addFiles,
    remove,
    clear,
    uploading,
    readyUrls,
  };
}

function useAutoScroll(trigger: number, isSending: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
    setShowJump(false);
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottomRef.current = distance < 120;
    if (nearBottomRef.current) setShowJump(false);
  };

  useEffect(() => {
    if (nearBottomRef.current) scrollToBottom(trigger <= 1 ? "auto" : "smooth");
    else setShowJump(true);
  }, [trigger, isSending, scrollToBottom]);

  return {
    scrollRef,
    bottomRef,
    nearBottomRef,
    showJump,
    scrollToBottom,
    onScroll,
  };
}

/* ---------------------------- atoms ------------------------------ */

function BotAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
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

const Avatar = ({ sender }: { sender: "user" | "bot" }) =>
  sender === "bot" ? <BotAvatar /> : <UserAvatar />;

function SentTicks() {
  return (
    <svg
      viewBox="0 0 18 12"
      className="h-2.5 w-3.5 text-emerald-200"
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

function TokenCostBadge({ cost }: { cost?: RawCost }) {
  const display = computeDisplayCost(cost);
  if (!display?.visible) return null;
  return (
    <span
      className="rounded-full bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] font-medium text-emerald-700"
      title="এই reply-এর আনুমানিক খরচ"
    >
      {display.formatted}
    </span>
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
  if (failed) {
    return (
      <div className="flex h-24 w-full items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400">
        ছবি লোড হয়নি
      </div>
    );
  }
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
        className={`max-h-44 w-full cursor-zoom-in object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{ minHeight: loaded ? undefined : 96 }}
      />
    </div>
  );
}

/* --------------------------- message ----------------------------- */

function MessageBody({
  msg,
  onOpenImage,
}: {
  msg: ProcessedMessage;
  onOpenImage: (s: string) => void;
}) {
  if (msg.sender === "user") {
    return msg.text ? (
      <p className="whitespace-pre-wrap break-words leading-snug">{msg.text}</p>
    ) : null;
  }
  if (Array.isArray(msg.content)) {
    return (
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
                      onOpen={onOpenImage}
                    />
                  ),
              )}
          </div>
        ))}
      </div>
    );
  }
  return (
    <p className="whitespace-pre-wrap break-words leading-snug">
      {msg.content}
    </p>
  );
}

function MessageBubble({
  msg,
  onOpenImage,
}: {
  msg: ProcessedMessage;
  onOpenImage: (s: string) => void;
}) {
  const isUser = msg.sender === "user";
  return (
    <div
      className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <Avatar sender={msg.sender} />
      <div
        className={`relative max-w-[78%] rounded-2xl px-3 py-2 text-[13px] ${
          isUser
            ? "rounded-br-md bg-emerald-600 text-white"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
        }`}
      >
        {isUser && msg.images && msg.images.length > 0 && (
          <div className="mb-1.5 grid grid-cols-2 gap-1">
            {msg.images.map((src, i) => (
              <ChatImage key={i} src={src} onOpen={onOpenImage} />
            ))}
          </div>
        )}

        <MessageBody msg={msg} onOpenImage={onOpenImage} />

        <div
          className={`mt-1 flex items-center justify-end gap-1.5 ${
            isUser ? "text-emerald-100" : "text-slate-400"
          }`}
        >
          {!isUser && <TokenCostBadge cost={msg.cost} />}
          <span className="text-[9px]">{formatTime(msg.timestamp)}</span>
          {isUser && <SentTicks />}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.3s]" />
      </div>
    </div>
  );
}

const LoadingState = () => (
  <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    <p className="text-xs">লোড হচ্ছে...</p>
  </div>
);

const EmptyState = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
      <BotAvatar />
    </div>
    <div className="space-y-0.5">
      <p className="text-sm font-medium text-slate-700">নতুন চ্যাট শুরু করুন</p>
      <p className="text-xs text-slate-400">যেকোনো প্রশ্ন বা ছবি পাঠান 👋</p>
    </div>
  </div>
);

/* ------------------------- attachments --------------------------- */

function AttachmentPreview({
  items,
  onRemove,
}: {
  items: Attachment[];
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto border-t border-slate-100 bg-slate-50 px-3 py-2">
      {items.map((a) => (
        <div key={a.id} className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.preview || a.url}
            alt={a.name}
            className={`h-12 w-12 rounded-lg border border-slate-200 object-cover ${a.status !== "done" ? "opacity-60" : ""}`}
          />
          {a.status === "uploading" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
          {a.status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-500/40 text-[9px] font-bold text-white">
              ত্রুটি
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(a.id)}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-white transition hover:bg-slate-900"
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
  );
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <button
        onClick={onClose}
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
        src={src}
        alt="preview"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
}

/* --------------------------- composer ---------------------------- */

function Composer({
  inputMessage,
  setInputMessage,
  uploading,
  canSend,
  attachmentCount,
  fileInputRef,
  onPickFiles,
  onSubmit,
}: {
  inputMessage: string;
  setInputMessage: (v: string) => void;
  uploading: boolean;
  canSend: boolean;
  attachmentCount: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPickFiles: (files: FileList | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-2 border-t border-slate-100 bg-white p-2.5"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onPickFiles(e.target.files)}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={attachmentCount >= MAX_ATTACHMENTS}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
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
        className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
      />

      <button
        type="submit"
        disabled={!canSend}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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
  );
}

/* ----------------------------- main ------------------------------ */

export default function ChatbotInterface({ companyId }: ChatbotInterfaceProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

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

  const {
    attachments,
    fileInputRef,
    addFiles,
    remove,
    clear,
    uploading,
    readyUrls,
  } = useAttachments();
  const {
    scrollRef,
    bottomRef,
    nearBottomRef,
    showJump,
    scrollToBottom,
    onScroll,
  } = useAutoScroll(messages.length, isSending);

  useEffect(() => {
    if (companyId) {
      initSession();
      fetchHistory(companyId);
    }
  }, [companyId, initSession, fetchHistory]);

  const processedMessages: ProcessedMessage[] = useMemo(
    () =>
      messages.map((msg) => ({
        ...msg,
        content: msg.sender === "bot" ? parseBotContent(msg.text) : msg.text,
      })),
    [messages],
  );

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
    clear();
    nearBottomRef.current = true;
    await sendMessage(companyId, textToSend, urls);
  };

  return (
    <div className="flex h-[62vh] max-h-[540px] w-full max-w-md mx-auto flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:h-[540px]">
      {/* Header */}
      <header className="flex items-center gap-2.5 border-b border-slate-100 bg-white px-3.5 py-3">
        <div className="relative">
          <BotAvatar />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight text-slate-800">
            Presswayy AI
          </h3>
          <span className="text-[11px] text-emerald-600">Online</span>
        </div>
        {sessionId && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[9px] text-slate-400">
            #{sessionId.slice(0, 6)}
          </span>
        )}
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="relative flex-1 overflow-y-auto bg-slate-50 px-3 py-3.5"
      >
        {isFetching ? (
          <LoadingState />
        ) : processedMessages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2.5">
            {processedMessages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onOpenImage={setLightbox} />
            ))}
            {isSending && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}

        {showJump && (
          <button
            onClick={() => scrollToBottom()}
            className="sticky bottom-2 left-full ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700"
            aria-label="নতুন মেসেজে যান"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="border-t border-red-100 bg-red-50 px-3 py-1.5 text-center text-[11px] text-red-600">
          {errorMessage}
        </div>
      )}

      <AttachmentPreview items={attachments} onRemove={remove} />

      <Composer
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        uploading={uploading}
        canSend={canSend}
        attachmentCount={attachments.length}
        fileInputRef={fileInputRef}
        onPickFiles={addFiles}
        onSubmit={handleSend}
      />

      {lightbox && (
        <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
