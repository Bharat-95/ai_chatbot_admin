"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "../../../../lib/supabaseBrowser";
import { showToast } from "../../../../hooks/useToast";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewBotPage() {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [prompt, setPrompt] = useState("");
  const [kbList, setKbList] = useState([]);
  const [loadingKb, setLoadingKb] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [useAll, setUseAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadUserAndKb = async () => {
      setLoadingKb(true);
      setError(null);

      try {
        // get currently authenticated user
        let uid = null;
        try {
          if (supabaseBrowser.auth?.getUser) {
            const { data, error } = await supabaseBrowser.auth.getUser();
            if (!error && data?.user) uid = data.user.id;
          } else if (supabaseBrowser.auth?.user) {
            const u = supabaseBrowser.auth.user();
            uid = u?.id ?? null;
          }
        } catch (e) {
          console.warn("getUser error:", e);
        }

        if (!mounted) return;
        setUserId(uid);

        // If no user, set empty list and return
        if (!uid) {
          setKbList([]);
          setLoadingKb(false);
          return;
        }

        // fetch only this user's knowledge_base rows
        const { data, error: fetchErr } = await supabaseBrowser
          .from("knowledge_base")
          .select("folder,folder_id,docs,user_id")
          .eq("user_id", uid)
          .order("updated_at", { ascending: false });

        if (fetchErr) {
          console.error("fetch kb error:", fetchErr);
          setError("Unable to fetch knowledge base folders");
          setKbList([]);
        } else {
          setKbList(data || []);
          // if useAll was checked (unlikely on first load) keep selected in sync
          if (useAll && Array.isArray(data)) {
            setSelected(data.slice());
          }
        }
      } catch (e) {
        console.error(e);
        setError("Unexpected error loading knowledge base");
        setKbList([]);
      } finally {
        if (mounted) setLoadingKb(false);
      }
    };

    loadUserAndKb();
    return () => {
      mounted = false;
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When useAll toggles or kbList changes while useAll=true, update selected list
  useEffect(() => {
    if (useAll) {
      setSelected(kbList.slice());
    } else {
      // keep previously selected items that still exist in user's kbList
      setSelected((prev) =>
        prev.filter((s) => kbList.some((k) => k.folder_id === s.folder_id))
      );
    }
  }, [useAll, kbList]);

  const foldersToShow = useMemo(() => {
    if (!search) return kbList;
    const s = search.toLowerCase();
    return kbList.filter((f) => (f.folder || "").toLowerCase().includes(s));
  }, [kbList, search]);

  const isSelected = (folder_id) =>
    selected.some((s) => s.folder_id === folder_id);

  const toggleSelect = (folder) => {
    // if useAll is on, and user clicks a specific folder -> turn off useAll
    if (useAll) setUseAll(false);

    if (isSelected(folder.folder_id)) {
      setSelected((prev) =>
        prev.filter((p) => p.folder_id !== folder.folder_id)
      );
    } else {
      setSelected((prev) => [...prev, folder]);
    }
  };

  const removeSelected = (folder_id) => {
    setSelected((prev) => prev.filter((p) => p.folder_id !== folder_id));
    // if user removes while useAll true, also uncheck useAll
    if (useAll) setUseAll(false);
  };

  const selectedDocsCount = useMemo(() => {
    return selected.reduce((acc, s) => acc + (s.docs || 0), 0);
  }, [selected]);

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Bot name is required");
      return;
    }
    if (!prompt.trim()) {
      setError("Bot prompt is required");
      return;
    }
    setSaving(true);

    // Inform the user creation started
    showToast({
      type: "info",
      title: "Creating bot",
      description: "Bot creation in progress...",
    });

    try {
      // ensure we have user id
      let uid = userId;
      if (!uid) {
        try {
          if (supabaseBrowser.auth?.getUser) {
            const r = await supabaseBrowser.auth.getUser();
            uid = r?.data?.user?.id ?? null;
          } else if (supabaseBrowser.auth?.user) {
            const u = supabaseBrowser.auth.user();
            uid = u?.id ?? null;
          }
        } catch (e) {
          console.warn("getUser on save failed", e);
        }
      }

      const kb_folder_ids = useAll ? null : selected.map((s) => s.folder_id);
      const folder_count = useAll
        ? kbList?.length || 0
        : kb_folder_ids?.length || 0;

      const insertPayload = {
        name: name.trim(),
        description: desc || null,
        prompt: prompt.trim(),
        created_by: uid || null,
        use_all_kb: !!useAll,
        kb_folder_ids: kb_folder_ids,
        folder_count: folder_count,
        metadata: null,
        active: true,
      };

      // Insert into bots table
      const { data: botData, error: botError } = await supabaseBrowser
        .from("bots")
        .insert([insertPayload])
        .select()
        .single();

      if (botError) {
        console.error("insert bot error:", botError);
        showToast({
          type: "error",
          title: "Error creating bot",
          description:
            "Failed to create bot: " +
            (botError.message || JSON.stringify(botError)),
        });
        setError(
          "Failed to create bot: " +
            (botError.message || JSON.stringify(botError))
        );
        setSaving(false);
        return;
      }

      // At this point bot is created in Supabase. Send details to webhook as well.
      try {
        const webhookBody = {
          payload: insertPayload,
          bot: botData,
          sent_at: new Date().toISOString(),
        };

        const resp = await fetch(
          "https://n8n.srv1028016.hstgr.cloud/webhook/AI-Chatbot-Setup",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(webhookBody),
          }
        );

        if (!resp.ok) {
          const text = await resp.text().catch(() => null);
          console.error("Webhook responded with error:", resp.status, text);
          showToast({
            type: "error",
            title: "Webhook error",
            description:
              "Bot created but webhook failed (status " +
              resp.status +
              "). Check logs.",
          });
        } else {
          // Optionally read response (not required)
          // const webhookResult = await resp.json().catch(()=>null);
        }
      } catch (webhookErr) {
        console.error("Webhook call failed:", webhookErr);
        showToast({
          type: "error",
          title: "Webhook error",
          description: "Bot created but failed to notify webhook.",
        });
      }

      // Success: notify user and clear form
      showToast({
        type: "success",
        title: "Success",
        description: "Bot created successfully.",
      });
      setName("");
      setDesc("");
      setPrompt("");
      setSelected([]);
      setUseAll(false);
    } catch (e) {
      console.error("create bot unexpected error:", e);
      showToast({
        type: "error",
        title: "Error creating bot",
        description: "Unexpected error creating bot. Check console.",
      });
      setError("Unexpected error creating bot");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white  px-10">
      <div className="max-w-5xl mx-auto">
        <Link href={`/dashboard/bots`} className="p-2 rounded-full  transition">
          <ArrowLeft size={20} className="text-gray-700" />
        </Link>
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-1">General</h2>
          <p className="text-gray-500 mb-6">Your bot's basic settings.</p>

          {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

          <label className="block mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">
                Bot Name <span className="text-red-500">*</span>
              </span>
            </div>
            <div className="text-gray-500 mb-2">
              Give your bot a name to identify it on this platform.
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Give this bot a name"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:ring-blue-700"
              style={{ boxShadow: "none", borderColor: "#e6e9ee" }}
            />
          </label>

          <label className="block mb-6">
            <div className="mb-2">
              <span className="font-medium text-gray-900">Bot Description</span>
            </div>
            <div className="text-gray-500 mb-2">
              Leave empty to auto-generate an apt description.
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder=""
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:ring-blue-700"
              style={{ borderColor: "#e6e9ee" }}
            />
          </label>

          <label className="block mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">
                Bot Prompt <span className="text-red-500">*</span>
              </span>
            </div>
            <div className="text-gray-500 mb-2">Give your bot a prompt</div>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: You are an assistant that..."
              className="w-full rounded-lg border border-gray-200 px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9966cc]"
              style={{ boxShadow: "none", borderColor: "#e6e9ee" }}
            />
          </label>
        </section>

        {/* Knowledge base selector */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Knowledge Base</h3>
          <p className="text-sm text-gray-500 mb-4">
            Select the folders the bot can use as its knowledge base.
          </p>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useAll}
                    onChange={(e) => {
                      const checked = !!e.target.checked;
                      setUseAll(checked);
                      if (checked) {
                        // set selected to all user's KB folders
                        setSelected(kbList.slice());
                      } else {
                        setSelected([]);
                      }
                    }}
                  />
                  <span className="ml-1">Use everything in knowledge base</span>
                </label>
              </div>

              <div className="text-sm text-gray-600">
                {useAll
                  ? `${kbList.length || 0} folders • ${kbList.reduce(
                      (a, b) => a + (b.docs || 0),
                      0
                    )} documents`
                  : `${selected.length} folders • ${selectedDocsCount} documents`}
              </div>
            </div>

            <div className="flex gap-4">
              {/* Left: folder list */}
              <div
                style={{ width: "55%" }}
                className="p-4 border-r border-gray-200"
              >
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for folders"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 mb-3"
                />

                <div className="space-y-2 max-h-72 overflow-auto">
                  {loadingKb && (
                    <div className="text-sm text-gray-500">Loading...</div>
                  )}
                  {!loadingKb && foldersToShow.length === 0 && (
                    <div className="text-sm text-gray-500">
                      No folders found.
                    </div>
                  )}

                  {foldersToShow.map((f) => (
                    <div
                      key={f.folder_id}
                      className="flex items-center justify-between border border-gray-200 rounded-md p-3"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSelect(f)}
                          className={`w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center ${
                            isSelected(f.folder_id)
                              ? "bg-blue-700 text-white border-blue-700"
                              : "text-blue-700 border-gray-200"
                          }`}
                          aria-label={
                            isSelected(f.folder_id) ? "remove" : "add"
                          }
                        >
                          {isSelected(f.folder_id) ? "✓" : "+"}
                        </button>
                        <div>
                          <div className="font-medium">
                            {f.folder || "(untitled)"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {f.docs || 0} documents
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-gray-400">
                        {/* optional icons */}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: selected folders summary */}
              <div style={{ width: "45%" }} className="p-4">
                <div className="mb-3">
                  <div className="font-medium">Selected Folders</div>
                  <div className="text-sm text-gray-500">
                    {selected.length} folders • {selectedDocsCount} documents
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-auto">
                  {selected.length === 0 && (
                    <div className="text-sm text-gray-500">
                      No folders selected.
                    </div>
                  )}
                  {selected.map((s) => (
                    <div
                      key={s.folder_id}
                      className="flex items-center justify-between border border-gray-200 rounded-md p-3"
                    >
                      <div>
                        <div className="font-medium">{s.folder}</div>
                        <div className="text-xs text-gray-500">
                          {s.docs || 0} documents
                        </div>
                      </div>
                      <div>
                        <button
                          onClick={() => removeSelected(s.folder_id)}
                          className="text-sm text-red-600 px-2 py-1 rounded"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              // Cancel -> reset
              setName("");
              setDesc("");
              setPrompt("");
              setSelected([]);
              setUseAll(false);
              setError(null);
            }}
            className="px-4 py-2 border rounded text-sm"
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-4 py-2 rounded bg-blue-700 text-white disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
