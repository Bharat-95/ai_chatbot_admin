"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Search, Send } from "lucide-react";
import { supabaseBrowser } from "../../../../../lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";

export default function Page() {
  const params = useParams();
  const botId = params?.botId || null;

  const [userId, setUserId] = useState(null);
  const [bots, setBots] = useState([]);
  const [currentBot, setCurrentBot] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [loadingBots, setLoadingBots] = useState(false);
  const [convQuery, setConvQuery] = useState("");
  const [chatId, setChatId] = useState(null);
  const [chatRow, setChatRow] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseBrowser.auth.getUser();
        setUserId(data?.user?.id ?? null);
      } catch {
        setUserId(null);
      }
    })();
  }, []);

  useEffect(() => {
    const loadBots = async () => {
      setLoadingBots(true);
      try {
        if (!userId) return;
        const { data } = await supabaseBrowser
          .from("bots")
          .select("bot_id,name,description,prompt,created_at")
          .eq("created_by", userId)
          .order("created_at", { ascending: false });
        setBots(data || []);
      } catch {
        setBots([]);
      } finally {
        setLoadingBots(false);
      }
    };
    loadBots();
  }, [userId]);

  useEffect(() => {
    const loadChats = async () => {
      setLoadingConvos(true);
      try {
        if (!userId) return;
        const { data } = await supabaseBrowser
          .from("chats")
          .select("id,bot_id,user_id,title,last_message_at,updated_at,created_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(200);
        setConversations(data || []);
      } catch {
        setConversations([]);
      } finally {
        setLoadingConvos(false);
      }
    };
    loadChats();
  }, [userId]);

  useEffect(() => {
    if (!bots || !botId) {
      setCurrentBot(null);
      return;
    }
    setCurrentBot(bots.find((b) => b.bot_id === botId) || null);
  }, [bots, botId]);

  useEffect(() => {
    const ensureChat = async () => {
      if (!userId || !botId) {
        setChatId(null);
        setChatRow(null);
        setMessages([]);
        return;
      }
      try {
        const { data: existing } = await supabaseBrowser
          .from("chats")
          .select("*")
          .eq("user_id", userId)
          .eq("bot_id", botId)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (existing && existing.length > 0) {
          const row = existing[0];
          setChatId(row.id);
          setChatRow(row);
          setMessages(Array.isArray(row.messages) ? row.messages : []);
          return;
        }

        const title = `Conversation with ${currentBot?.name ?? botId}`;
        const { data: inserted } = await supabaseBrowser
          .from("chats")
          .insert([{ bot_id: botId, user_id: userId, title, messages: [] }])
          .select()
          .single();

        if (inserted) {
          setChatId(inserted.id);
          setChatRow(inserted);
          setMessages(Array.isArray(inserted.messages) ? inserted.messages : []);
        }
      } catch {
        showToast({
          type: "error",
          title: "Error",
          description: "Error ensuring chat.",
        });
      }
    };
    ensureChat();
  }, [userId, botId, currentBot]);

  useEffect(() => {
    if (!chatId) return;
    let subscription = null;
    let pollInterval = null;
    let mounted = true;

    const normalizeMessages = (maybe) => (Array.isArray(maybe) ? maybe : []);

    const handleChatUpdate = (row) => {
      if (!mounted || !row) return;
      const newMessages = normalizeMessages(row.messages);
      setChatRow(row);
      setMessages(newMessages);
      const last = newMessages[newMessages.length - 1];
      if (last?.role === "assistant") setIsTyping(false);
    };

    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const { data } = await supabaseBrowser
            .from("chats")
            .select("messages,updated_at")
            .eq("id", chatId)
            .single();
          if (data) handleChatUpdate(data);
        } catch {}
      }, 4000);
    };

    try {
      subscription = supabaseBrowser
        .channel(`chats:realtime:${chatId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chats", filter: `id=eq.${chatId}` },
          (payload) => handleChatUpdate(payload.record)
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") startPolling();
        });
    } catch {
      startPolling();
    }

    return () => {
      mounted = false;
      if (subscription) supabaseBrowser.removeChannel(subscription);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [chatId]);

  useEffect(() => {
    if (!messagesRef.current) return;
    setTimeout(() => {
      try {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      } catch {}
    }, 50);
  }, [messages]);

  const filteredConversations = useMemo(() => {
    const q = convQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      (c.title || "").toLowerCase().includes(q)
    );
  }, [convQuery, conversations]);

  const sendMessage = async () => {
    if (!input.trim() || !userId || !botId || !chatId) return;
    setSending(true);
    const userContent = input.trim();
    setInput("");
    const optimisticUser = {
      id: `local-${Date.now()}`,
      role: "user",
      content: userContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...(Array.isArray(prev) ? prev : []), optimisticUser]);

    try {
      const { data: currentRows } = await supabaseBrowser
        .from("chats")
        .select("messages")
        .eq("id", chatId)
        .single();

      const currentMessages = Array.isArray(currentRows?.messages)
        ? currentRows.messages
        : Array.isArray(chatRow?.messages)
        ? chatRow.messages
        : [];

      const newUserMessage = {
        id: crypto?.randomUUID?.() ?? `msg-${Date.now()}`,
        role: "user",
        content: userContent,
        created_at: new Date().toISOString(),
      };

      const afterUser = [...currentMessages, newUserMessage];

      await supabaseBrowser
        .from("chats")
        .update({
          messages: afterUser,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          title: newUserMessage.content?.slice(0, 120) ?? null,
        })
        .eq("id", chatId);

      setChatRow((prev) =>
        prev
          ? {
              ...prev,
              messages: afterUser,
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : prev
      );

      setMessages(afterUser);
      setIsTyping(true);

      fetch("https://n8n.srv1028016.hstgr.cloud/webhook/AI-Chatbot-Message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          bot_id: botId,
          user_id: userId,
          message: userContent,
        }),
      }).catch(() => {});
    } catch {
      showToast({
        type: "error",
        title: "Error",
        description: "Failed to send message.",
      });
      setIsTyping(false);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatDate = (val) => {
    if (!val && val !== 0) return "";
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toLocaleString();
      const isoTry = new Date(String(val).replace(" ", "T"));
      if (!isNaN(isoTry.getTime())) return isoTry.toLocaleString();
      return String(val);
    } catch {
      return String(val);
    }
  };

  const safeMessages = Array.isArray(messages) ? messages : [];

  return (
    <div className="flex bg-white min-h-[90vh]">
      <aside className="w-80 border-r border-gray-100 overflow-auto">
        <div className="p-4 border-t border-b border-gray-100">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={14} />
            </span>
            <input
              value={convQuery}
              onChange={(e) => setConvQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-3 py-2 rounded-md border border-gray-200 outline-none focus:ring-0 focus:border-gray-300"
            />
          </div>
        </div>

        <ul className="divide-y divide-gray-100">
          {loadingConvos
            ? Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="px-4 py-4">
                  <div className="animate-pulse h-4 w-3/4 bg-gray-200 rounded mb-2" />
                  <div className="animate-pulse h-3 w-1/2 bg-gray-200 rounded" />
                </li>
              ))
            : filteredConversations.map((c) => (
                <li
                  key={c.id}
                  className={`px-4 py-4 hover:bg-gray-50 cursor-pointer ${
                    c.id === chatId ? "bg-gray-50" : ""
                  }`}
                  onClick={() => {
                    setChatId(c.id);
                    (async () => {
                      try {
                        const { data } = await supabaseBrowser
                          .from("chats")
                          .select("*")
                          .eq("id", c.id)
                          .single();
                        if (data) {
                          setChatRow(data);
                          setMessages(Array.isArray(data.messages) ? data.messages : []);
                        }
                      } catch {}
                    })();
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-lg">🤖</div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          {c.title || "Conversation"}
                        </div>
                        <div className="text-xs text-gray-500">{c.bot_id}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {c.updated_at ? formatDate(c.updated_at) : ""}
                    </div>
                  </div>
                </li>
              ))}
        </ul>
      </aside>

      <main className="flex-1 flex flex-col max-h-[90vh] overflow-y-scroll">
        <div className="flex-1 p-6 overflow-auto" ref={messagesRef}>
          <div className="max-w-3xl mx-auto">
            <div className="mb-6 text-center">
              <div className="text-lg font-semibold">
                {currentBot ? currentBot.name : "Select a bot to start"}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {currentBot ? currentBot.description : ""}
              </div>
            </div>

            <div className="space-y-4">
              {safeMessages.length === 0 && !isTyping && (
                <div className="py-20 text-center text-gray-400">
                  No messages yet. Start the conversation below.
                </div>
              )}
              {safeMessages.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-lg max-w-3xl ${
                    m.role === "user"
                      ? "bg-[#eef2ff] self-end ml-auto text-right"
                      : "bg-[#f3f4f6] text-left"
                  }`}
                >
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">
                    {m.content}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    {m.created_at ? formatDate(m.created_at) : ""}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="p-4 rounded-lg max-w-3xl bg-[#f3f4f6] flex items-center gap-2 w-fit">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                    <span className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.12s" }} />
                    <span className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.24s" }} />
                  </div>
                  <span className="text-gray-500 text-sm ml-2">Assistant is typing...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-lg flex items-center gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentBot ? `Ask ${currentBot.name}` : "Select a bot to chat"}
                rows={1}
                className="flex-1 resize-none px-3 py-2 rounded-md border border-gray-200 min-h-20 outline-none focus:ring-0 focus:border-gray-300"
              />

              <button
                onClick={sendMessage}
                disabled={sending || !input.trim() || !currentBot || !chatId}
                className={`p-3 rounded-md flex items-center justify-center transition ${
                  sending || !input.trim() || !currentBot || !chatId
                    ? "bg-gray-300 text-white cursor-not-allowed"
                    : "bg-blue-700 text-white hover:bg-blue-700/80"
                }`}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
