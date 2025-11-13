"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../../../lib/supabaseBrowser";
import { showToast } from "../../../../../hooks/useToast";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EditBotPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params?.botId || params?.bot_id || null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [prompt, setPrompt] = useState("");
  const [useAll, setUseAll] = useState(false);
  const [kbList, setKbList] = useState([]);
  const [selected, setSelected] = useState([]);
  const [userId, setUserId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        let uid = null;
        try {
          if (supabaseBrowser.auth?.getUser) {
            const r = await supabaseBrowser.auth.getUser();
            uid = r?.data?.user?.id ?? null;
          } else if (supabaseBrowser.auth?.user) {
            const u = supabaseBrowser.auth.user();
            uid = u?.id ?? null;
          }
        } catch (e) {}

        if (!mounted) return;
        setUserId(uid);

        if (!botId) {
          setError("Missing bot id");
          setLoading(false);
          return;
        }

        const { data: botData, error: botErr } = await supabaseBrowser
          .from("bots")
          .select("*")
          .eq("bot_id", botId)
          .single();

        if (botErr || !botData) {
          setError("Failed to load bot");
          setLoading(false);
          return;
        }

        setName(botData.name ?? "");
        setDesc(botData.description ?? "");
        setPrompt(botData.prompt ?? "");
        setUseAll(!!botData.use_all_kb);

        if (uid) {
          const { data: kbData, error: kbErr } = await supabaseBrowser
            .from("knowledge_base")
            .select("folder,folder_id,docs,user_id")
            .eq("user_id", uid)
            .order("updated_at", { ascending: false });

          if (!kbErr && Array.isArray(kbData)) {
            setKbList(kbData);
            if (Array.isArray(botData.kb_folder_ids) && botData.kb_folder_ids.length > 0) {
              const preselected = kbData.filter((k) => (botData.kb_folder_ids || []).includes(k.folder_id));
              setSelected(preselected);
            } else if (botData.use_all_kb) {
              setSelected(kbData.slice());
            } else {
              setSelected([]);
            }
          } else {
            setKbList([]);
            setSelected([]);
          }
        } else {
          setKbList([]);
          setSelected([]);
        }
      } catch (e) {
        setError("Unexpected error");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => (mounted = false);
  }, [botId]);

  useEffect(() => {
    if (useAll) {
      setSelected(kbList.slice());
    } else {
      setSelected((prev) => prev.filter((s) => kbList.some((k) => k.folder_id === s.folder_id)));
    }
  }, [useAll, kbList]);

  const foldersToShow = useMemo(() => {
    if (!search) return kbList;
    const s = search.toLowerCase();
    return kbList.filter((f) => (f.folder || "").toLowerCase().includes(s));
  }, [kbList, search]);

  const isSelected = (folder_id) => selected.some((s) => s.folder_id === folder_id);

  const toggleSelect = (folder) => {
    if (useAll) setUseAll(false);
    if (isSelected(folder.folder_id)) {
      setSelected((prev) => prev.filter((p) => p.folder_id !== folder.folder_id));
    } else {
      setSelected((prev) => [...prev, folder]);
    }
  };

  const removeSelected = (folder_id) => {
    setSelected((prev) => prev.filter((p) => p.folder_id !== folder_id));
    if (useAll) setUseAll(false);
  };

  const selectedDocsCount = useMemo(() => selected.reduce((acc, s) => acc + (s.docs || 0), 0), [selected]);

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Bot name required");
      return;
    }
    if (!prompt.trim()) {
      setError("Prompt required");
      return;
    }
    setSaving(true);

    try {
      const kb_folder_ids = useAll ? null : selected.map((s) => s.folder_id);
      const folder_count = useAll ? kbList.length : (kb_folder_ids?.length || 0);

      const payload = {
        name: name.trim(),
        description: desc || null,
        prompt: prompt.trim(),
        use_all_kb: !!useAll,
        kb_folder_ids: kb_folder_ids,
        folder_count: folder_count,
      };

      const { data, error: updErr } = await supabaseBrowser
        .from("bots")
        .update(payload)
        .eq("bot_id", botId)
        .select()
        .single();

      if (updErr) {
        setError("Failed to update bot");
        setSaving(false);
        return;
      }

      showToast({ type: "success", title: "Saved", description: "Bot updated" });
      router.push("/dashboard/bots");
    } catch (e) {
      setError("Unexpected error while saving");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-10 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="w-12 h-12 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="w-full h-8 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="w-full h-6 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="w-full h-40 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-10">
      <div className="max-w-5xl mx-auto">
        <Link href={`/dashboard/bots`} className="p-2 rounded-full transition">
          <ArrowLeft size={20} className="text-gray-700" />
        </Link>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-1">General</h2>
          <p className="text-gray-500 mb-6">Your bot's basic settings.</p>

          <label className="block mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Bot Name <span className="text-red-500">*</span></span>
            </div>
            <div className="text-gray-500 mb-2">Give your bot a name to identify it on this platform.</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Give this bot a name" className="w-full rounded-lg border border-gray-200 px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:ring-blue-700" style={{ boxShadow: "none", borderColor: "#e6e9ee" }} />
          </label>

          <label className="block mb-6">
            <div className="mb-2"><span className="font-medium text-gray-900">Bot Description</span></div>
            <div className="text-gray-500 mb-2">Leave empty to auto-generate an apt description.</div>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} className="w-full rounded-lg border border-gray-200 px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:ring-blue-700" style={{ borderColor: "#e6e9ee" }} />
          </label>

          <label className="block mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Bot Prompt <span className="text-red-500">*</span></span>
            </div>
            <div className="text-gray-500 mb-2">Give your bot a prompt</div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Example: You are an assistant that..." className="w-full rounded-lg border border-gray-200 px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9966cc]" style={{ boxShadow: "none", borderColor: "#e6e9ee" }} />
          </label>
        </section>

        <section className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Knowledge Base</h3>
          <p className="text-sm text-gray-500 mb-4">Select the folders the bot can use as its knowledge base.</p>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={useAll} onChange={(e) => { const checked = !!e.target.checked; setUseAll(checked); if (checked) setSelected(kbList.slice()); else setSelected([]); }} />
                  <span className="ml-1">Use everything in knowledge base</span>
                </label>
              </div>

              <div className="text-sm text-gray-600">
                {useAll ? `${kbList.length || 0} folders • ${kbList.reduce((a, b) => a + (b.docs || 0), 0)} documents` : `${selected.length} folders • ${selectedDocsCount} documents`}
              </div>
            </div>

            <div className="flex gap-4">
              <div style={{ width: "55%" }} className="p-4 border-r border-gray-200">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search for folders" className="w-full rounded-md border border-gray-200 px-3 py-2 mb-3" />

                <div className="space-y-2 max-h-72 overflow-auto">
                  {kbList.length === 0 && <div className="text-sm text-gray-500">No folders found.</div>}
                  {foldersToShow.map((f) => (
                    <div key={f.folder_id} className="flex items-center justify-between border border-gray-200 rounded-md p-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleSelect(f)} className={`w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center ${isSelected(f.folder_id) ? "bg-blue-700 text-white border-blue-700" : "text-blue-700 border-gray-200"}`}>{isSelected(f.folder_id) ? "✓" : "+"}</button>
                        <div>
                          <div className="font-medium">{f.folder || "(untitled)"}</div>
                          <div className="text-xs text-gray-500">{f.docs || 0} documents</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ width: "45%" }} className="p-4">
                <div className="mb-3">
                  <div className="font-medium">Selected Folders</div>
                  <div className="text-sm text-gray-500">{selected.length} folders • {selectedDocsCount} documents</div>
                </div>

                <div className="space-y-2 max-h-72 overflow-auto">
                  {selected.length === 0 && <div className="text-sm text-gray-500">No folders selected.</div>}
                  {selected.map((s) => (
                    <div key={s.folder_id} className="flex items-center justify-between border border-gray-200 rounded-md p-3">
                      <div>
                        <div className="font-medium">{s.folder}</div>
                        <div className="text-xs text-gray-500">{s.docs || 0} documents</div>
                      </div>
                      <div>
                        <button onClick={() => removeSelected(s.folder_id)} className="text-sm text-red-600 px-2 py-1 rounded">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/bots")} className="px-4 py-2 border border-gray-200 rounded text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded bg-blue-700 text-white disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}
