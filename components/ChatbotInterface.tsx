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
  message_text?: string;
  text?: string;
  message?: string;
  content?: string;
  msg?: string;
  output?: string;
  images?: Array<{ image_url?: string; url?: string } | string>;
}

interface Attachment {
  id: string;
  preview: string;
  url?: string;
  status: "uploading" | "done" | "error";
  name: string;
}

interface LightboxState {
  all: string[];
  index: number;
}

type ProcessedMessage = Message & {
  content: ReplyItem[] | string;
  sender: "user" | "bot";
  timestamp: string;
  images: string[];
};

/* --------------------------- constants --------------------------- */

const MAX_ATTACHMENTS = 4;
const MAX_FILE_MB = 10;
const GRID_MAX = 4;
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

function unescapeNewlines(text: string): string {
  return text.replace(/\\n/g, "\n");
}

function parseBotContent(text: string): ReplyItem[] | string {
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

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary config missing");
  }
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form },
  );
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const data = await res.json();
  // force a web-safe delivery format — fixes iPhone HEIC photos not rendering
  return (data.secure_url as string).replace(
    "/upload/",
    "/upload/f_auto,q_auto/",
  );
}

function normalizeImageList(images?: string[]): string[] {
  if (!Array.isArray(images)) return [];
  return images.filter((src) => typeof src === "string" && src.trim());
}

function looksLikeImageUrl(value: string): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  // Must be a clean, single-token URL — no stray whitespace inside, which is
  // the tell-tale sign of a split artifact that would 404 at <img> load time.
  if (!/^https?:\/\/\S+$/.test(v)) return false;
  return (
    /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(v) ||
    v.includes("cloudinary.com") ||
    v.includes("res.cloudinary")
  );
}

// Strips separator junk left on a URL after splitting on protocol boundaries:
// trailing commas, semicolons, and surrounding whitespace.
function stripUrlSeparators(value: string): string {
  return value
    .trim()
    .replace(/[,;\s]+$/, "")
    .trim();
}

// Splits a text field that may contain one or more image URLs.
// Splits on protocol boundaries (https://) rather than commas so that
// Cloudinary transform params like f_auto,q_auto are never broken apart,
// then trims any separator characters left clinging to each fragment.
function extractImageUrlsFromText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const protocolCount = (trimmed.match(/https?:\/\//g) || []).length;
  if (protocolCount === 0) return [];

  if (protocolCount === 1) {
    const clean = stripUrlSeparators(trimmed);
    return looksLikeImageUrl(clean) ? [clean] : [];
  }

  return trimmed
    .split(/(?=https?:\/\/)/)
    .map(stripUrlSeparators)
    .filter(looksLikeImageUrl);
}

/* ------------------------------ hooks ---------------------------- */

function useAttachments() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = useCallback((id: string, patch: Partial<Attachment>) => {
    setAttachments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setAttachments([]), []);

  const addFiles = useCallback(
    async (files: FileList | null) => {
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
          /* ignore preview error */
        }

        setAttachments((prev) => [
          ...prev,
          { id, preview, status: "uploading", name: file.name },
        ]);

        uploadToCloudinary(file)
          .then((url) => update(id, { url, status: "done" }))
          .catch(() => update(id, { status: "error" }));
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [attachments.length, update],
  );

  const uploading = attachments.some((item) => item.status === "uploading");

  const readyUrls = useMemo(
    () =>
      attachments
        .filter((item) => item.status === "done" && item.url)
        .map((item) => item.url as string),
    [attachments],
  );

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

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottomRef.current = distance < 120;
    if (nearBottomRef.current) setShowJump(false);
  }, []);

  useEffect(() => {
    if (nearBottomRef.current) {
      const timer = setTimeout(
        () => scrollToBottom(trigger <= 1 ? "auto" : "smooth"),
        50,
      );
      return () => clearTimeout(timer);
    }
    setShowJump(true);
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

const Avatar = React.memo(({ sender }: { sender: "user" | "bot" }) =>
  sender === "bot" ? <BotAvatar /> : <UserAvatar />,
);
Avatar.displayName = "Avatar";

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

function TrashIcon({
  className = "h-[18px] w-[18px]",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
    </svg>
  );
}

function TokenCostBadge({ cost }: { cost?: RawCost }) {
  const display = computeDisplayCost(cost);
  if (!display?.visible) return null;
  const rawAmount = Number(String(display.formatted).replace(/[^\d.]/g, ""));
  const roundedAmount = Number.isFinite(rawAmount)
    ? `৳${rawAmount.toFixed(2)}`
    : display.formatted;
  return (
    <span
      className="rounded-full bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] font-medium text-emerald-700"
      title="এই reply-এর আনুমানিক খরচ"
    >
      {roundedAmount}
    </span>
  );
}

/* ----------------------- image grid system ----------------------- */

function ChatImage({
  src,
  onOpen,
  dimmed = false,
}: {
  src: string;
  onOpen: () => void;
  dimmed?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reset per-src state so a stale failed/loaded never bleeds into a new src
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  if (!src) return null;

  return (
    <div
      className="group relative h-full w-full overflow-hidden"
      onClick={!failed ? onOpen : undefined}
      style={{ cursor: failed ? "default" : "zoom-in" }}
    >
      {!loaded && !failed && (
        <div className="absolute inset-0 animate-pulse bg-slate-200" />
      )}

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-[10px] text-slate-400">
          ছবি লোড হয়নি
        </div>
      )}

      <img
        src={src}
        alt="content"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          dimmed ? "brightness-[0.4]" : ""
        } ${loaded && !failed ? "opacity-100" : "opacity-0"}`}
      />

      {loaded && !failed && !dimmed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-150 group-hover:bg-black/25">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
          </svg>
        </div>
      )}
    </div>
  );
}

function gridTemplateColumns(count: number): string {
  if (count === 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-[2fr_1fr]";
  return "grid-cols-2";
}

function slotHeight(count: number, index: number): string {
  if (count === 1) return "h-40";
  if (count === 2) return "h-28";
  // count === 3: left slot spans 2 rows — grid row heights (set by right slots) control it
  if (count === 3) return index === 0 ? "" : "h-20";
  return "h-28";
}

function slotRowSpan(count: number, index: number): string {
  return count === 3 && index === 0 ? "row-span-2" : "";
}

function MessageImageGrid({
  images,
  onOpenImage,
  className = "",
}: {
  images?: string[];
  onOpenImage: (all: string[], index: number) => void;
  className?: string;
}) {
  const clean = normalizeImageList(images);
  if (clean.length === 0) return null;

  const shown = clean.slice(0, GRID_MAX);
  const overflow = clean.length - GRID_MAX;

  return (
    <div
      className={`${className} grid gap-[3px] overflow-hidden rounded-xl ${gridTemplateColumns(shown.length)}`}
    >
      {shown.map((src, i) => {
        const isOverflowSlot = i === GRID_MAX - 1 && overflow > 0;

        return (
          <div
            key={`${src}-${i}`}
            className={`relative overflow-hidden ${slotHeight(shown.length, i)} ${slotRowSpan(shown.length, i)}`}
          >
            {isOverflowSlot ? (
              <div className="relative h-full w-full">
                {/* dimmed thumbnail with shared error handling */}
                <ChatImage
                  src={src}
                  onOpen={() => onOpenImage(clean, i)}
                  dimmed
                />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-xl font-medium leading-none text-white">
                    +{overflow}
                  </span>
                  <span className="text-[11px] text-white/80">more</span>
                </div>
              </div>
            ) : (
              <ChatImage src={src} onOpen={() => onOpenImage(clean, i)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------- lightbox --------------------------- */

function Lightbox({
  all,
  index,
  onClose,
}: {
  all: string[];
  index: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);
  const hasPrev = current > 0;
  const hasNext = current < all.length - 1;

  // Bind key handler once; use functional updates + bounds inside so the
  // listener never goes stale as `current` changes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrent((c) => (c > 0 ? c - 1 : c));
      if (e.key === "ArrowRight")
        setCurrent((c) => (c < all.length - 1 ? c + 1 : c));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [all.length, onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="বন্ধ করুন"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {hasPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrent((c) => c - 1);
          }}
          className="absolute left-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          aria-label="আগের ছবি"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}

      <img
        src={all[current]}
        alt="preview"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
      />

      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrent((c) => c + 1);
          }}
          className="absolute right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          aria-label="পরের ছবি"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}

      {all.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white">
          {current + 1} / {all.length}
        </div>
      )}
    </div>
  );
}

/* --------------------------- message ----------------------------- */

function extractReplyItemImages(item: ReplyItem): string[] {
  if (!Array.isArray(item.images)) return [];
  return item.images
    .map((img) => (typeof img === "string" ? img : img?.image_url || img?.url))
    .filter((src): src is string => Boolean(src));
}

function extractReplyItemText(item: ReplyItem): string {
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

function MessageBody({
  msg,
  onOpenImage,
}: {
  msg: ProcessedMessage;
  onOpenImage: (all: string[], index: number) => void;
}) {
  // User messages and bot messages without parsed content fall back to plain text.
  if (msg.sender === "user" || !msg.content) {
    return msg.text ? (
      <p className="whitespace-pre-wrap break-words leading-snug">{msg.text}</p>
    ) : null;
  }

  if (Array.isArray(msg.content)) {
    return (
      <div className="space-y-1.5">
        {msg.content.map((item, index) => {
          const botText = extractReplyItemText(item);
          const itemImages = extractReplyItemImages(item);

          return (
            <div key={index} className="space-y-1.5">
              {botText && (
                <p className="whitespace-pre-wrap break-words leading-snug">
                  {unescapeNewlines(botText)}
                </p>
              )}
              <MessageImageGrid images={itemImages} onOpenImage={onOpenImage} />
            </div>
          );
        })}
      </div>
    );
  }

  const plainText =
    typeof msg.content === "string" ? unescapeNewlines(msg.content) : "";
  return (
    <p className="whitespace-pre-wrap break-words leading-snug">{plainText}</p>
  );
}

const MessageBubble = React.memo(function MessageBubble({
  msg,
  onOpenImage,
}: {
  msg: ProcessedMessage;
  onOpenImage: (all: string[], index: number) => void;
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
        {isUser && (
          <MessageImageGrid
            images={msg.images}
            onOpenImage={onOpenImage}
            className="mb-1.5"
          />
        )}

        <MessageBody msg={msg} onOpenImage={onOpenImage} />

        {!isUser && (
          <MessageImageGrid
            images={msg.images}
            onOpenImage={onOpenImage}
            className="mt-2"
          />
        )}

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
});

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

/* ----------------------- confirm dialog -------------------------- */

function ConfirmDialog({
  open,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      onClick={busy ? undefined : onCancel}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex flex-col items-center gap-3 px-5 pt-5 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
            <TrashIcon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-800">
              সব চ্যাট মুছে ফেলবেন?
            </h4>
            <p className="text-xs leading-relaxed text-slate-500">
              এই সেশনের সব মেসেজ ও কথোপকথন স্থায়ীভাবে মুছে যাবে। এটি ফেরানো
              যাবে না।
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2 border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {busy ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                মুছছি...
              </>
            ) : (
              "মুছে ফেলুন"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

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
      {items.map((item) => (
        <div key={item.id} className="relative shrink-0">
          <img
            src={item.preview || item.url}
            alt={item.name}
            className={`h-12 w-12 rounded-lg border border-slate-200 object-cover ${
              item.status !== "done" ? "opacity-60" : ""
            }`}
          />
          {item.status === "uploading" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
          {item.status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-500/40 text-[9px] font-bold text-white">
              ত্রুটি
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
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
  setInputMessage: (value: string) => void;
  uploading: boolean;
  canSend: boolean;
  attachmentCount: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPickFiles: (files: FileList | null) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSubmit(e as unknown as React.FormEvent);
    }
  };

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
        onKeyDown={handleKeyDown}
        placeholder={uploading ? "আপলোড হচ্ছে..." : "মেসেজ লিখুন..."}
        disabled={uploading}
        className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed"
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

/* ---------------------- message processing ----------------------- */

function processMessage(msg: any): ProcessedMessage {
  const sender =
    (msg.sender || msg.sender_type || "bot").toLowerCase() === "user"
      ? "user"
      : "bot";

  const timestamp = msg.timestamp || msg.created_at || "";
  let text = msg.text || "";
  let images = normalizeImageList(msg.images);

  // Fallback: if the store didn't populate images, extract them from the text
  // field. Protocol-boundary splitting keeps Cloudinary transform commas intact;
  // separator stripping prevents broken (404-ing) URLs from reaching the grid.
  if (sender === "user" && images.length === 0 && text) {
    const extracted = extractImageUrlsFromText(text);
    if (extracted.length > 0) {
      images = extracted;
      text = "";
    }
  }

  return {
    ...msg,
    sender,
    timestamp,
    text,
    images,
    content: sender === "bot" ? parseBotContent(text) : text,
  };
}

/* ----------------------------- main ------------------------------ */

export default function ChatbotInterface({ companyId }: ChatbotInterfaceProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    messages,
    isFetching,
    isSending,
    isDeleting,
    errorMessage,
    fetchHistory,
    sendMessage,
    clearChats,
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
    if (companyId) fetchHistory(companyId);
  }, [companyId, fetchHistory]);

  const processedMessages = useMemo<ProcessedMessage[]>(
    () => messages.map(processMessage),
    [messages],
  );

  const canSend =
    (inputMessage.trim().length > 0 || readyUrls.length > 0) &&
    !isSending &&
    !uploading;

  const handleOpenImage = useCallback((all: string[], index: number) => {
    setLightbox({ all, index });
  }, []);

  const handleSend = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!canSend) return;
      const textToSend = inputMessage;
      const urls = readyUrls;
      setInputMessage("");
      clear();
      nearBottomRef.current = true;
      await sendMessage(companyId, textToSend, urls);
    },
    [
      canSend,
      inputMessage,
      readyUrls,
      clear,
      nearBottomRef,
      sendMessage,
      companyId,
    ],
  );

  const handleConfirmDelete = useCallback(async () => {
    await clearChats(companyId);
    setConfirmOpen(false);
  }, [clearChats, companyId]);

  return (
    <div className="relative mx-auto flex h-[62vh] max-h-[540px] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:h-[540px]">
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

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={
            messages.length === 0 || isDeleting || isSending || isFetching
          }
          className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Clear chat
        </button>
      </header>

      {/* Message list */}
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
            {processedMessages.map((msg, index) => (
              <MessageBubble
                key={msg.id ?? `${msg.timestamp}-${index}`}
                msg={msg}
                onOpenImage={handleOpenImage}
              />
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

      {/* Error banner */}
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

      <ConfirmDialog
        open={confirmOpen}
        busy={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      {lightbox && (
        <Lightbox
          all={lightbox.all}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
