"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  MessageSquare,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { supabaseBrowser } from "../../../lib/supabaseBrowser";

export default function Page() {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const menuRef = useRef(null);
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
        setConfirmDeleteId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        let uid = null;
        if (supabaseBrowser.auth?.getUser) {
          const r = await supabaseBrowser.auth.getUser();
          uid = r?.data?.user?.id ?? null;
        } else if (supabaseBrowser.auth?.user) {
          const u = supabaseBrowser.auth.user();
          uid = u?.id ?? null;
        }
        if (!mounted) return;
        setUserId(uid);
        if (!uid) {
          setBots([]);
          setLoading(false);
          return;
        }
        const { data } = await supabaseBrowser
          .from("bots")
          .select("bot_id,created_at,name,description,prompt")
          .eq("created_by", uid)
          .order("created_at", { ascending: false });
        if (!mounted) return;
        setBots(data || []);
      } catch (e) {
        setBots([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleMenu = (id) => {
    setOpenMenuId(openMenuId === id ? null : id);
    setConfirmDeleteId(null);
  };

  const handleDelete = async (botId) => {
    try {
      const { error } = await supabaseBrowser
        .from("bots")
        .delete()
        .eq("bot_id", botId);
      if (error) {
        alert("Failed to delete bot");
        setConfirmDeleteId(null);
        return;
      }
      setBots((prev) => prev.filter((b) => b.bot_id !== botId));
      setConfirmDeleteId(null);
      setOpenMenuId(null);
    } catch (e) {
      alert("Failed to delete bot");
      setConfirmDeleteId(null);
    }
  };

  const filtered = bots.filter((b) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (b.name || "").toLowerCase().includes(q) ||
      (b.description || "").toLowerCase().includes(q) ||
      (b.prompt || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold"></h1>

          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <Search size={16} />
              </span>
              <input
                placeholder="Search bots..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-[380px] rounded-md border border-gray-200"
              />
            </div>

            <Link
              href="/dashboard/bots/create"
              className="inline-flex items-center gap-2 rounded-md bg-blue-700 hover:bg-blue-700/70 text-white px-4 py-2 shadow"
            >
              <Plus size={16} />
              <span className="font-medium">New Bot</span>
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-100 rounded-lg shadow-sm min-h-screen">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3 w-[20%]">
                  NAME
                </th>
                <th scope="col" className="px-6 py-3 w-[30%]">
                  DESCRIPTION
                </th>
                <th scope="col" className="px-6 py-3 w-[20%]">
                  Prompt
                </th>
                <th scope="col" className="px-6 py-3 w-[20%]">
                  Created At
                </th>
                <th scope="col" className="px-6 py-3 w-[10%]">
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-gray-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-[#f1f5f9] animate-pulse" />
                        <div className="w-48 h-4 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-8 bg-gray-200 rounded animate-pulse" />
                        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-gray-500">
                    No bots found.
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((b) => (
                  <tr
                    key={b.bot_id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-all relative"
                  >
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-[#f1f5f9] flex items-center justify-center text-xl">
                        🤖
                      </div>
                      <span className="font-medium text-gray-900">
                        {b.name}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {b.description}
                    </td>

                    <td className="px-6 py-4">{b.prompt}</td>

                    <td className="px-6 py-4 text-gray-600">
                      {b.created_at
                        ? new Date(b.created_at).toLocaleString()
                        : ""}
                    </td>

                    <td className="px-6 py-4 text-right relative">
                      <div className="flex items-center justify-end gap-2">
                       

                        <button
                          onClick={() => toggleMenu(b.bot_id)}
                          className="p-2 rounded-md hover:bg-gray-100"
                          title="More"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openMenuId === b.bot_id && (
                          <div
                            ref={menuRef}
                            className="absolute right-3 top-14 z-50 w-44 bg-white rounded-xl shadow-lg border border-gray-100"
                          >
                            <ul className="py-2">
                              <li>
                                <Link
                                  href={`/dashboard/bots/${b.bot_id}/edit`}
                                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  <span className="bg-blue-50 p-2 rounded-md">
                                    <Edit size={16} />
                                  </span>
                                  <span>Edit Bot</span>
                                </Link>
                              </li>
                              <li>
                                <Link
                                  href={`/dashboard/bots/${b.bot_id}/chat`}
                                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  <span className="bg-green-50 p-2 rounded-md">
                                    <MessageSquare size={16} />
                                  </span>
                                  <span>Chat</span>
                                </Link>
                              </li>
                              <li>
                                <button
                                  className={`w-full text-left flex items-center gap-3 px-4 py-2 text-sm rounded-md transition ${
                                    confirmDeleteId === b.bot_id
                                      ? "text-red-600 font-semibold hover:bg-red-50"
                                      : "text-red-600 hover:bg-gray-50"
                                  }`}
                                  onClick={() => {
                                    if (confirmDeleteId === b.bot_id) {
                                      handleDelete(b.bot_id);
                                    } else {
                                      setConfirmDeleteId(b.bot_id);
                                    }
                                  }}
                                >
                                  <span
                                    className={`p-2 rounded-md ${
                                      confirmDeleteId === b.bot_id
                                        ? "bg-red-100"
                                        : "bg-red-50"
                                    }`}
                                  >
                                    <Trash2 size={16} />
                                  </span>
                                  <span>
                                    {confirmDeleteId === b.bot_id
                                      ? "Sure?"
                                      : "Delete"}
                                  </span>
                                </button>
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="h-24" />
      </div>
    </div>
  );
}

