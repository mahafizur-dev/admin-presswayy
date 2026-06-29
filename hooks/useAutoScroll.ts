import { useRef, useState, useCallback, useEffect } from "react";

export function useAutoScroll(trigger: number, isSending: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    // Scroll only the chat container — prevents the surrounding page from
    // jumping when a new bot reply arrives (important for sticky side-by-side layouts).
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior });
    }
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
