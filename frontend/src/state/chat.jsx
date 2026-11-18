import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ChatContext = createContext(null);

/** Lets any page open Cinebot, optionally with a ready-made question. */
export function ChatProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(null);
  const openChat = useCallback((prompt) => {
    setSeed(prompt ? { text: prompt, n: Date.now() } : null);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ open, setOpen, seed, openChat }), [open, seed, openChat]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => useContext(ChatContext);
