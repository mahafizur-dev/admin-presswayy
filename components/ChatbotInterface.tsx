"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useChatStore, Message } from "../store/useChatStore";

interface ChatbotInterfaceProps {
  companyId: string;
}

export default function ChatbotInterface({ companyId }: ChatbotInterfaceProps) {
  const [inputMessage, setInputMessage] = useState("");
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (companyId) {
      initSession();
      fetchHistory(companyId);
    }
  }, [companyId, initSession, fetchHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // মেসেজ পার্সিং লজিক আলাদা করে নেওয়া হলো (Performance Optimization)
  const processedMessages = useMemo(() => {
    return messages.map((msg) => {
      if (msg.sender === "user") return msg;

      let parsed = msg.text;
      if (typeof msg.text === "string") {
        try {
          parsed = JSON.parse(msg.text);
        } catch {
          parsed = msg.text;
        }
      }
      return { ...msg, parsed };
    });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const textToSend = inputMessage;
    setInputMessage("");
    await sendMessage(companyId, textToSend);
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
      <header className="bg-indigo-600 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 bg-emerald-400 rounded-full animate-pulse" />
          <h3 className="text-white font-bold text-lg">AI Assistant</h3>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] text-indigo-200 font-mono">
            ID: {companyId.slice(0, 6)}
          </span>
          {sessionId && (
            <span className="text-[10px] text-emerald-300 font-mono">
              SESS: {sessionId.slice(0, 6)}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
        {isFetching ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
            <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">লোড হচ্ছে...</p>
          </div>
        ) : processedMessages.length === 0 ? (
          <div className="text-center text-slate-400 mt-10 text-sm">
            নতুন চ্যাট শুরু করুন।
          </div>
        ) : (
          processedMessages.map((msg: any, index) => {
            const isUser = msg.sender === "user";
            return (
              <div
                key={index}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${isUser ? "bg-indigo-600 text-white rounded-br-none" : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"}`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div className="space-y-3">
                      {Array.isArray(msg.parsed) ? (
                        msg.parsed.map((item: any, idx: number) => (
                          <div key={idx}>
                            {item.reply_type === "text" && (
                              <p>{item.message}</p>
                            )}
                            {item.reply_type === "image" &&
                              item.images?.map(
                                (img: any, i: number) =>
                                  img?.image_url && (
                                    <img
                                      key={i}
                                      src={img.image_url}
                                      className="rounded-lg mt-2 max-w-full"
                                      alt="content"
                                    />
                                  ),
                              )}
                          </div>
                        ))
                      ) : (
                        <p className="whitespace-pre-wrap">
                          {typeof msg.parsed === "object"
                            ? JSON.stringify(msg.parsed)
                            : msg.parsed}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {isSending && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border flex gap-1">
              <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" />
              <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-white border-t flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="আপনার মেসেজ লিখুন..."
          className="flex-1 px-4 py-2 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <button
          type="submit"
          disabled={isSending || !inputMessage.trim()}
          className="bg-indigo-600 text-white px-6 rounded-xl font-bold"
        >
          Send
        </button>
      </form>
    </div>
  );
}
