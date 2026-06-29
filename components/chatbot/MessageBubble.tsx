"use client";

import React from "react";
import type { Message } from "../../store/useChatStore";
import type { RawCost } from "../../lib/tokenCost";
import { computeDisplayCost } from "../../lib/tokenCost";
import { MessageImageGrid } from "./ImageGrid";
import {
  formatTime,
  unescapeNewlines,
  parseBotContent,
  extractReplyItemText,
  extractReplyItemImages,
  type ReplyItem,
} from "../../lib/messageUtils";
import {
  normalizeImageList,
  extractImageUrlsFromText,
} from "../../lib/imageUtils";

export type ProcessedMessage = Message & {
  content: ReplyItem[] | string;
  sender: "user" | "bot";
  timestamp: string;
  images: string[];
};

export function processMessage(msg: any): ProcessedMessage {
  const sender =
    (msg.sender || msg.sender_type || "bot").toLowerCase() === "user"
      ? "user"
      : "bot";
  const timestamp = msg.timestamp || msg.created_at || "";
  let text = msg.text || "";
  let images = normalizeImageList(msg.images);

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

// ── Avatars ──────────────────────────────────────────────────────────────────

export function BotAvatar() {
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

// ── Decorative atoms ─────────────────────────────────────────────────────────

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

// ── Message body ─────────────────────────────────────────────────────────────

function MessageBody({
  msg,
  onOpenImage,
}: {
  msg: ProcessedMessage;
  onOpenImage: (all: string[], index: number) => void;
}) {
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

// ── MessageBubble (exported) ─────────────────────────────────────────────────

export const MessageBubble = React.memo(function MessageBubble({
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
          className={`mt-1 flex items-center justify-end gap-1.5 ${isUser ? "text-emerald-100" : "text-slate-400"}`}
        >
          {!isUser && <TokenCostBadge cost={msg.cost} />}
          <span className="text-[9px]">{formatTime(msg.timestamp)}</span>
          {isUser && <SentTicks />}
        </div>
      </div>
    </div>
  );
});

// ── Typing indicator ─────────────────────────────────────────────────────────

export function TypingIndicator() {
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
