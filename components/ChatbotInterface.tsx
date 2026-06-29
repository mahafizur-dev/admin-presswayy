"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAttachments } from "../hooks/useAttachments";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { looksLikeImageUrl } from "../lib/imageUtils";
import {
  MessageBubble,
  TypingIndicator,
  BotAvatar,
  processMessage,
} from "./chatbot/MessageBubble";
import { Lightbox } from "./chatbot/Lightbox";
import { Composer, AttachmentPreview, ConfirmDialog } from "./chatbot/Composer";

interface ChatbotInterfaceProps {
  companyId: string;
}

interface LightboxState {
  all: string[];
  index: number;
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

export default function ChatbotInterface({ companyId }: ChatbotInterfaceProps) {
  const [mounted, setMounted] = useState(false);
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
    addFileArray,
    addImageUrl,
    remove,
    clear,
    uploading,
    readyUrls,
    MAX_ATTACHMENTS,
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
    setMounted(true);
  }, []);
  useEffect(() => {
    if (mounted && companyId) fetchHistory(companyId);
  }, [mounted, companyId, fetchHistory]);

  const processedMessages = useMemo(
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

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const dt = e.clipboardData;
      if (!dt) return;

      const imageFiles: File[] = [];
      if (dt.files?.length) {
        for (const f of Array.from(dt.files)) {
          if (f.type.startsWith("image/")) imageFiles.push(f);
        }
      }
      if (imageFiles.length === 0 && dt.items) {
        for (const item of Array.from(dt.items)) {
          if (item.kind === "file" && item.type.startsWith("image/")) {
            const f = item.getAsFile();
            if (f) imageFiles.push(f);
          }
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        void addFileArray(imageFiles);
        return;
      }

      const pastedText = dt.getData("text")?.trim();
      if (pastedText && looksLikeImageUrl(pastedText)) {
        const added = addImageUrl(pastedText);
        if (added) e.preventDefault();
      }
    },
    [addFileArray, addImageUrl],
  );

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

  if (!mounted) {
    return (
      <div className="relative mx-auto flex h-[62vh] max-h-[540px] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:h-[540px]">
        <LoadingState />
      </div>
    );
  }

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
          disabled={Boolean(
            messages.length === 0 || isDeleting || isSending || isFetching,
          )}
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
        maxAttachments={MAX_ATTACHMENTS}
        fileInputRef={fileInputRef}
        onPickFiles={addFiles}
        onPaste={handlePaste}
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
