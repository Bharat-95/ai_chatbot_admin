"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { supabaseBrowser } from "../../../lib/supabaseBrowser";
import { useRouter } from "next/navigation";
import { showToast } from "@/hooks/useToast";

/**
 * Chat listing page
 * - shows chats (for current user) and bots (for current user)
 * - clicking a bot reuses recent chat for that bot or creates a new chat and navigates
 *
 * Expects `chats` table with fields: id, bot_id, user_id, title, messages (json/array), created_at, updated_at
 * and `bots` table with at least: bot_id, name, description, created_by
 */

export default function Page() {
  const router = useRouter();
  const [convQuery, setConvQuery] = useState("");
  const [botQuery, setBotQuery] = useState("");
  const [conversations, setConversations] = useState([]);
  const [bots, setBots] = useState([]);
  const [loadingBots, setLoadingBots] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);

  // Load bots (created by current user)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingBots(true);
      try {
        const { data: userData } = await supabaseBrowser.auth.getUser();
        const uid = userData?.user?.id ?? null;
        if (!uid) {
          if (mounted) setBots([]);
          return;
        }
        const { data, error } = await supabaseBrowser
          .from("bots")
          .select("bot_id,name,description,created_at")
          .eq("created_by", uid)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("fetch bots error", error);
          if (mounted) setBots([]);
        } else {
          if (mounted) setBots(data || []);
        }
      } catch (e) {
        console.error("load bots failed", e);
        if (mounted) setBots([]);
      } finally {
        if (mounted) setLoadingBots(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load chats (for current user)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingConvs(true);
      try {
        const { data: userData } = await supabaseBrowser.auth.getUser();
        const uid = userData?.user?.id ?? null;
        if (!uid) {
          if (mounted) setConversations([]);
          return;
        }

        // select chats and join bot name (requires relationship or foreign key in schema)
        const { data, error } = await supabaseBrowser
          .from("chats")
          .select("id, title, bot_id, messages, updated_at, created_at, bots(name)")
          .eq("user_id", uid)
          .order("updated_at", { ascending: false })
          .limit(200);

        if (error) {
          console.error("fetch chats error", error);
          if (mounted) setConversations([]);
        } else {
          const convs = (data || []).map((r) => ({
            id: r.id,
            title: r.title || deriveTitleFromMessages(r.messages),
            bot_id: r.bot_id,
            bot_name: r.bots?.name || r.bot_id || "Bot",
            messages: r.messages || [],
            updated_at: r.updated_at,
            created_at: r.created_at,
          }));
          if (mounted) setConversations(convs);
        }
      } catch (e) {
        console.error("load chats failed", e);
        if (mounted) setConversations([]);
      } finally {
        if (mounted) setLoadingConvs(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const deriveTitleFromMessages = (messages) => {
    try {
      if (!Array.isArray(messages) || messages.length === 0) return "Untitled conversation";
      const firstUser = messages.find((m) => m.role === "user");
      const sample = firstUser ? firstUser.text : messages[0]?.text || "Conversation";
      return (sample || "Conversation").slice(0, 60);
    } catch {
      return "Conversation";
    }
  };

  const handleStartConversation = async (bot) => {
    try {
      const { data: userData } = await supabaseBrowser.auth.getUser();
      const uid = userData?.user?.id ?? null;
      if (!uid) {
        showToast({ type: "error", title: "Not signed in", description: "Please sign in to start a conversation." });
        return;
      }

      // Check for an existing chat with this bot for this user
      const { data: existing, error: exErr } = await supabaseBrowser
        .from("chats")
        .select("id")
        .eq("user_id", uid)
        .eq("bot_id", bot.bot_id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (exErr) {
        console.warn("check existing chat error", exErr);
      }

      if (existing && existing.length > 0) {
        // reuse existing chat
        router.push(`/dashboard/bots/${bot.bot_id}/chat?chat_id=${existing[0].id}`);
        return;
      }

      // create a new chat row
      const insertPayload = {
        bot_id: bot.bot_id,
        user_id: uid,
        title: `Conversation with ${bot.name || bot.bot_id}`,
        messages: [],
      };

      const { data: inserted, error } = await supabaseBrowser
        .from("chats")
        .insert([insertPayload])
        .select()
        .single();

      if (error) {
        console.error("create chat error", error);
        showToast({ type: "error", title: "Error", description: "Unable to create conversation." });
        router.push(`/dashboard/bots/${bot.bot_id}/chat`);
        return;
      }

      router.push(`/dashboard/bots/${bot.bot_id}/chat?chat_id=${inserted.id}`);
    } catch (err) {
      console.error("start conversation error", err);
      showToast({ type: "error", title: "Error", description: "Unable to start conversation." });
      router.push(`/dashboard/bots/${bot.bot_id}/chat`);
    }
  };

  const filteredConversations = useMemo(() => {
    const q = convQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        (c.title || "").toLowerCase().includes(q) ||
        (c.bot_name || "").toLowerCase().includes(q)
    );
  }, [convQuery, conversations]);

  const filteredBots = useMemo(() => {
    const q = botQuery.trim().toLowerCase();
    if (!q) return bots;
    return bots.filter(
      (b) =>
        (b.name || "").toLowerCase().includes(q) ||
        (b.description || "").toLowerCase().includes(q)
    );
  }, [botQuery, bots]);

  return (
    <div className="min-h-screen bg-white flex">
      <aside className="w-96 border-r border-gray-100 h-screen overflow-auto">
        <div className="p-4 flex items-center">
          <div />
          <Link href="/chat/new" className="inline-flex items-center gap-2 bg-blue-700 text-white px-3 py-1.5 rounded-md shadow">
            <Plus size={14} />
            <span className="text-sm">New Conversation</span>
          </Link>
        </div>

        <div className="p-4 border-t border-b border-gray-100">
          <div className="relative">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
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
          {loadingConvs ? (
            <li className="px-4 py-6 text-gray-500">Loading conversations…</li>
          ) : filteredConversations.length === 0 ? (
            <li className="px-4 py-6 text-gray-500">No conversations yet</li>
          ) : (
            filteredConversations.map((c) => (
              <li
                key={c.id}
                className="px-4 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/dashboard/bots/${c.bot_id}/chat?chat_id=${c.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-lg">🤖</div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{c.title}</div>
                      <div className="text-xs text-gray-500">{c.bot_name}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{new Date(c.updated_at || c.created_at).toLocaleString()}</div>
                </div>
              </li>
            ))
          )}
        </ul>
      </aside>

      <main className="flex-1 p-5 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold mb-2 text-center">Choose a bot for a new conversation</h2>

          <div className="mt-6">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={18} />
              </span>
              <input
                value={botQuery}
                onChange={(e) => setBotQuery(e.target.value)}
                placeholder="Search bots..."
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 outline-none focus:ring-0 focus:border-gray-300"
              />
            </div>

            <div className="mt-6 border-t border-gray-200">
              {loadingBots && <div className="py-6 text-gray-500">Loading bots…</div>}

              {!loadingBots && filteredBots.length === 0 && <div className="py-6 text-center text-gray-500">No bots found.</div>}

              {!loadingBots && filteredBots.map((b) => (
                <div
                  key={b.bot_id}
                  onClick={() => handleStartConversation(b)}
                  className="py-6 border-b border-gray-100 flex items-start gap-4 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-md bg-[#fff3cd] flex items-center justify-center text-xl">🤖</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-800">{b.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{b.description}</div>
                  </div>
                </div>
              ))}

              <div className="py-6">
                <Link href="/dashboard/bots/create" className="inline-flex items-center gap-2 text-gray-800">
                  <span className="text-2xl">＋</span>
                  <span className="font-medium">Create Another Bot</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
