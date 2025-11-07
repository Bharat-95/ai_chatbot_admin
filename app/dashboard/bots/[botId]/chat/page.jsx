"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
  const messagesRef = useRef(null);


  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabaseBrowser.auth.getUser();
        const uid = data?.user?.id ?? null;
        if (!mounted) return;
        setUserId(uid);
      } catch (e) {
        console.warn("getUser failed", e);
        if (mounted) setUserId(null);
      }
    })();
    return () => (mounted = false);
  }, []);

 
  useEffect(() => {
    let mounted = true;
    const loadBots = async () => {
      setLoadingBots(true);
      try {
        if (!userId) return;
        const { data, error } = await supabaseBrowser
          .from("bots")
          .select("bot_id,name,description,prompt,created_at")
          .eq("created_by", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("loadBots error", error);
          if (mounted) setBots([]);
        } else {
          if (mounted) setBots(data || []);
        }
      } catch (e) {
        console.error("loadBots exception", e);
        if (mounted) setBots([]);
      } finally {
        if (mounted) setLoadingBots(false);
      }
    };
    loadBots();
    return () => (mounted = false);
  }, [userId]);

 
  useEffect(() => {
    let mounted = true;
    const loadChats = async () => {
      setLoadingConvos(true);
      try {
        if (!userId) return;
        const { data, error } = await supabaseBrowser
          .from("chats")
          .select("id,bot_id,user_id,title,last_message_at,updated_at,created_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(200);

        if (error) {
          console.warn("loadChats error", error);
          if (mounted) setConversations([]);
        } else {
          if (mounted) setConversations(data || []);
        }
      } catch (e) {
        console.error("loadChats exception", e);
        if (mounted) setConversations([]);
      } finally {
        if (mounted) setLoadingConvos(false);
      }
    };
    loadChats();
    return () => (mounted = false);
  }, [userId]);

 
  useEffect(() => {
    if (!bots || !botId) {
      setCurrentBot(null);
      return;
    }
    const found = bots.find((b) => b.bot_id === botId) || null;
    setCurrentBot(found);
  }, [bots, botId]);


  useEffect(() => {
    let mounted = true;

    const ensureChat = async () => {
    
      if (!userId || !botId) {
        if (mounted) {
          setChatId(null);
          setChatRow(null);
          setMessages([]);
        }
        return;
      }

      try {

        const { data: existing, error: exErr } = await supabaseBrowser
          .from("chats")
          .select("*")
          .eq("user_id", userId)
          .eq("bot_id", botId)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (exErr) {
          console.warn("find chat error", exErr);
        }

        if (existing && existing.length > 0) {
          const row = existing[0];
          if (mounted) {
            setChatId(row.id);
            setChatRow(row);
            setMessages(row.messages || []);
          }
          return;
        }

 
        const title = `Conversation with ${currentBot?.name ?? botId}`;
        const payload = {
          bot_id: botId,
          user_id: userId,
          title,
          messages: [], 
        };

        const { data: inserted, error: insertErr } = await supabaseBrowser
          .from("chats")
          .insert([payload])
          .select()
          .single();

        if (insertErr) {
          console.error("create chat error", insertErr);
          showToast({
            type: "error",
            title: "Chat creation failed",
            description:
              insertErr.message || "Unable to create chat. Check RLS/permissions.",
          });
        } else {
          if (mounted) {
            setChatId(inserted.id);
            setChatRow(inserted);
            setMessages(inserted.messages || []);
          }
        }
      } catch (e) {
        console.error("ensureChat exception", e);
        showToast({ type: "error", title: "Error", description: "Error ensuring chat." });
      }
    };

    ensureChat();
    return () => (mounted = false);
 
  }, [userId, botId, currentBot]);

 
  useEffect(() => {
    let subscription = null;
    if (!chatId) return () => {};

    try {
      subscription = supabaseBrowser
        .channel(`public:chats:id=eq.${chatId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "chats", filter: `id=eq.${chatId}` },
          (payload) => {
         
            const row = payload?.record;
            if (!row) return;
            setChatRow(row);
            setMessages(row.messages || []);
          }
        )
        .subscribe();
    } catch (e) {
      console.warn("realtime subscribe failed", e);
    }

    return () => {
      if (subscription) supabaseBrowser.removeChannel(subscription);
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
    return conversations.filter((c) => (c.title || "").toLowerCase().includes(q));
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

   
    setMessages((prev) => [...prev, optimisticUser]);

    try {
    
      const { data: currentRows, error: fetchErr } = await supabaseBrowser
        .from("chats")
        .select("messages")
        .eq("id", chatId)
        .single();

      if (fetchErr) {
        console.warn("fetch current chat messages err", fetchErr);
      }

      const currentMessages = (currentRows?.messages && Array.isArray(currentRows.messages))
        ? currentRows.messages
        : chatRow?.messages || [];

      
      const newUserMessage = {
        id: crypto?.randomUUID?.() ?? `msg-${Date.now()}`,
        role: "user",
        content: userContent,
        created_at: new Date().toISOString(),
      };
      const afterUser = [...currentMessages, newUserMessage];

    
      const { error: updateUserErr } = await supabaseBrowser
        .from("chats")
        .update({
          messages: afterUser,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
         
          title: newUserMessage.content?.slice(0, 120) ?? null,
        })
        .eq("id", chatId);

      if (updateUserErr) {
        console.error("update chat with user message failed", updateUserErr);
        showToast({ type: "error", title: "Save failed", description: "Couldn't save your message to chat." });
      } else {
       
        setChatRow((prev) => prev ? { ...prev, messages: afterUser, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() } : prev);
        setMessages(afterUser);
      }

    
      let replyText = null;
      try {
        const webhookResp = await fetch("https://n8n.srv1028016.hstgr.cloud/webhook/AI-Chatbot-Message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            bot_id: botId,
            user_id: userId,
            message: userContent,
          
          }),
        });

        if (!webhookResp.ok) {
          console.warn("webhook non-ok", webhookResp.status);
        } else {
          const json = await webhookResp.json();
    
          replyText = json?.reply ?? json?.message ?? json?.response ?? null;
        }
      } catch (webErr) {
        console.error("webhook error", webErr);
      }

      if (!replyText) {
        replyText = "Assistant did not respond (webhook failed).";
      }

     
      const assistantMessage = {
        id: crypto?.randomUUID?.() ?? `assistant-${Date.now()}`,
        role: "assistant",
        content: replyText,
        created_at: new Date().toISOString(),
      };
      const afterAssistant = [...(Array.isArray(afterUser) ? afterUser : []), assistantMessage];

      const { error: updateAssistantErr } = await supabaseBrowser
        .from("chats")
        .update({
          messages: afterAssistant,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", chatId);

      if (updateAssistantErr) {
        console.error("update chat with assistant failed", updateAssistantErr);
    
        setMessages((prev) => [...prev, assistantMessage]);
        showToast({ type: "error", title: "Partial", description: "Assistant replied but saving failed." });
      } else {
        setChatRow((prev) => prev ? { ...prev, messages: afterAssistant, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() } : prev);
        setMessages(afterAssistant);
      }
    } catch (err) {
      console.error("sendMessage error", err);
      showToast({ type: "error", title: "Error", description: "Failed to send message." });
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


  return (
    <div className="flex bg-white min-h-[90vh]">
      {/* Sidebar */}
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
          {loadingConvos &&
            Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="px-4 py-4">
                <div className="animate-pulse h-4 w-3/4 bg-gray-200 rounded mb-2" />
                <div className="animate-pulse h-3 w-1/2 bg-gray-200 rounded" />
              </li>
            ))}
          {!loadingConvos &&
            filteredConversations.map((c) => (
              <li
                key={c.id}
                className={`px-4 py-4 hover:bg-gray-50 cursor-pointer ${c.id === chatId ? "bg-gray-50" : ""}`}
                onClick={() => {
                  setChatId(c.id);
                  // load this chat row immediately
                  (async () => {
                    try {
                      const { data, error } = await supabaseBrowser
                        .from("chats")
                        .select("*")
                        .eq("id", c.id)
                        .single();
                      if (!error && data) {
                        setChatRow(data);
                        setMessages(data.messages || []);
                      }
                    } catch (e) {
                      console.warn("load single chat failed", e);
                    }
                  })();
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-lg">🤖</div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{c.title || "Conversation"}</div>
                      <div className="text-xs text-gray-500">{c.bot_id}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {c.updated_at ? new Date(c.updated_at).toLocaleString() : ""}
                  </div>
                </div>
              </li>
            ))}
        </ul>
      </aside>

      {/* Chat Window */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 p-6 overflow-auto" ref={messagesRef}>
          <div className="max-w-3xl mx-auto">
            <div className="mb-6 text-center">
              <div className="text-lg font-semibold">{currentBot ? currentBot.name : "Select a bot to start"}</div>
              <div className="text-sm text-gray-500 mt-1">{currentBot ? currentBot.description : ""}</div>
            </div>

            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="py-20 text-center text-gray-400">No messages yet. Start the conversation below.</div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-lg max-w-3xl ${m.role === "user" ? "bg-[#eef2ff] self-end ml-auto text-right" : "bg-[#f3f4f6] text-left"}`}
                >
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{m.content}</div>
                  <div className="text-xs text-gray-400 mt-2">{m.created_at ? new Date(m.created_at).toLocaleString() : ""}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Input Area */}
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
                className={`p-3 rounded-md flex items-center justify-center transition ${sending || !input.trim() || !currentBot || !chatId ? "bg-gray-300 text-white cursor-not-allowed" : "bg-blue-700 text-white hover:bg-blue-700/80"}`}
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
