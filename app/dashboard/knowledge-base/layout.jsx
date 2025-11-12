"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { supabaseBrowser } from "../../../lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";

export default function KnowledgeBaseLayout({ children }) {
  const sidebarRef = useRef(null);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [userId, setUserId] = useState(null);
  const [query, setQuery] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [renameModalFor, setRenameModalFor] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [actionLoadingFor, setActionLoadingFor] = useState(null);
  const [deletePendingFor, setDeletePendingFor] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await supabaseBrowser.auth.getUser();
        if (r?.data?.user) setUserId(r.data.user.id);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabaseBrowser
          .from("knowledge_base")
          .select(
            `
            folder_id,
            folder,
            bots,
            user_id,
            created_at,
            updated_at,
            documents:documents(count)
          `
          )
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });
        setFolders(data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const createFolder = async () => {
    if (!newName.trim() || !userId) return;
    const folderName = newName.trim();

    try {
      // check case-insensitive duplicate for this user
      const { data: existing, error: checkErr } = await supabaseBrowser
        .from("knowledge_base")
        .select("folder_id")
        .ilike("folder", folderName) // case-insensitive match
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (checkErr) {
        console.warn("duplicate-check failed", checkErr);
        showToast({
          title: "Error",
          description: "Unable to verify folder name.",
          type: "error",
        });
        return;
      }

      if (existing) {
        showToast({
          title: "Duplicate folder",
          description: "A folder with this name already exists.",
          type: "error",
        });
        return;
      }

      // proceed to create
      const payload = { user_id: userId, folder: folderName };
      const { data, error } = await supabaseBrowser
        .from("knowledge_base")
        .insert([payload])
        .select()
        .single();

      if (error) {
        // handle unique constraint / conflict gracefully
        const isConflict =
          error?.code === "23505" ||
          error?.status === 409 ||
          (error?.message && error.message.toLowerCase().includes("unique")) ||
          (error?.details && error.details.toLowerCase().includes("unique"));

        if (isConflict) {
          showToast({
            title: "Duplicate folder",
            description: "A folder with this name already exists.",
            type: "error",
          });
          return;
        }

        showToast({
          title: "Error",
          description: error.message || "Failed to create folder.",
          type: "error",
        });
        return;
      }

      if (data) {
        setFolders((prev) => [data, ...prev]);
        setShowCreate(false);
        setNewName("");
        showToast({
          title: "Created",
          description: "Folder created successfully.",
          type: "success",
        });
      }
    } catch (err) {
      console.error("createFolder error", err);
      const status = err?.status || (err?.response && err.response.status);
      if (
        status === 409 ||
        (err?.message && err.message.toLowerCase().includes("conflict"))
      ) {
        showToast({
          title: "Duplicate folder",
          description: "A folder with this name already exists.",
          type: "error",
        });
      } else {
        showToast({
          title: "Error",
          description: "Failed to create folder.",
          type: "error",
        });
      }
    }
  };

  const openMenu = (id) => {
    if (menuOpenFor === id) {
      setMenuOpenFor(null);
      setDeletePendingFor(null);
    } else {
      setMenuOpenFor(id);
      setDeletePendingFor(null);
    }
  };

  const startRename = (folder) => {
    setMenuOpenFor(null);
    setRenameModalFor(folder.folder_id);
    setRenameValue(folder.folder || "");
  };

const submitRename = async () => {
  const id = renameModalFor;
  if (!id || !renameValue.trim()) return;
  setActionLoadingFor(id);

  try {
    const newName = renameValue.trim();

    if (!userId) {
      showToast({ title: "Error", description: "User not authenticated.", type: "error" });
      setActionLoadingFor(null);
      return;
    }

    const { data: existing, error: checkErr } = await supabaseBrowser
      .from("knowledge_base")
      .select("folder_id")
      .ilike("folder", newName)
      .eq("user_id", userId)
      .neq("folder_id", id)
      .limit(1)
      .maybeSingle();

    if (checkErr) {
      console.warn("duplicate-check failed", checkErr);
      showToast({ title: "Error", description: "Unable to verify folder name.", type: "error" });
      setActionLoadingFor(null);
      return;
    }

    if (existing) {
      showToast({ title: "Duplicate folder", description: "A folder with this name already exists.", type: "error" });
      setActionLoadingFor(null);
      return;
    }

    const { data, error } = await supabaseBrowser
      .from("knowledge_base")
      .update({ folder: newName })
      .eq("folder_id", id)
      .select()
      .single();

    if (error) {
      const isConflict =
        error?.code === "23505" ||
        error?.status === 409 ||
        (error?.message && error.message.toLowerCase().includes("unique")) ||
        (error?.details && error.details.toLowerCase().includes("unique"));

      if (isConflict) {
        showToast({ title: "Duplicate folder", description: "A folder with this name already exists.", type: "error" });
        setActionLoadingFor(null);
        return;
      }

      showToast({ title: "Error", description: error.message || "Failed to rename folder.", type: "error" });
      setActionLoadingFor(null);
      return;
    }

    if (data) {
      setFolders((prev) => prev.map((f) => (f.folder_id === id ? data : f)));
      setRenameModalFor(null);
      setRenameValue("");
      showToast({ title: "Updated", description: "Folder renamed.", type: "success" });
    }
  } catch (err) {
    console.error(err);
    const status = err?.status || (err?.response && err.response.status);
    if (status === 409 || (err?.message && err.message.toLowerCase().includes("conflict"))) {
      showToast({ title: "Duplicate folder", description: "A folder with this name already exists.", type: "error" });
    } else {
      showToast({ title: "Error", description: "Rename failed.", type: "error" });
    }
  } finally {
    setActionLoadingFor(null);
  }
};

  const startDeleteInline = (folder) => {
    setDeletePendingFor(folder.folder_id);
  };

  const confirmDelete = async (idArg) => {
    const id = idArg ?? deletePendingFor;
    if (!id) return;
    setActionLoadingFor(id);
    try {
      const { error } = await supabaseBrowser
        .from("knowledge_base")
        .delete()
        .eq("folder_id", id);
      if (error) throw error;
      setFolders((prev) => prev.filter((f) => f.folder_id !== id));
      setMenuOpenFor(null);
      setDeletePendingFor(null);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingFor(null);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      try {
        const fid = e?.detail?.folderId;
        if (!fid) return;
        setFolders((prev) =>
          prev.map((f) =>
            f.folder_id === fid
              ? {
                  ...f,
                  // if your UI uses aggregation: documents: [{ count: N }]
                  documents: [
                    {
                      count: Math.max(0, (f.documents?.[0]?.count ?? 0) + 1),
                    },
                  ],
                  // also update any 'docs' column if you show that
                  docs: (f.docs ?? 0) + 1,
                }
              : f
          )
        );
      } catch (err) {
        console.warn("kb:doc-created handler failed", err);
      }
    };

    window.addEventListener("kb:doc-created", handler);
    return () => window.removeEventListener("kb:doc-created", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      try {
        const fid = e?.detail?.folderId;
        const deletedDocId = e?.detail?.docId;
        if (!fid) return;

        setFolders((prev) =>
          prev.map((f) => {
            if (f.folder_id !== fid) return f;
            const currentCount = (f.documents?.[0]?.count ?? f.docs ?? 0) || 0;
            const newCount = Math.max(0, currentCount - 1);
            return {
              ...f,
              documents: [{ count: newCount }],
              docs: newCount,
            };
          })
        );
      } catch (err) {
        console.warn("kb:doc-deleted handler failed", err);
      }
    };

    window.addEventListener("kb:doc-deleted", handler);
    return () => window.removeEventListener("kb:doc-deleted", handler);
  }, []);

  const filtered = folders.filter((f) =>
    (f.folder || "").toLowerCase().includes(query.toLowerCase())
  );

  const expandedHandleLeft = 320;
  const handleSize = 36;

  return (
    <div className="relative flex max-h-screen bg-white text-gray-900">
      <div
        ref={sidebarRef}
        className={`relative flex flex-col transition-all duration-200 ease-in-out overflow-hidden ${
          isCollapsed ? "w-20" : "w-80"
        } border-r border-gray-200`}
        aria-hidden={false}
      >
        <div
          className={`transition-opacity duration-150 flex flex-col min-h-0`}
        >
          <div className="p-4">
            {!isCollapsed ? (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full bg-blue-700 text-white font-medium py-2.5 rounded-lg hover:bg-gray-800 transition flex items-center justify-center"
              >
                <Plus size={16} className="mr-2" />
                New Folder
              </button>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="w-12 h-12 bg-blue-700 rounded-md flex items-center justify-center mx-auto"
              >
                <Plus size={18} className="text-white" />
              </button>
            )}
          </div>

          {!isCollapsed && (
            <div className="px-4 mb-3">
              <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
                <Search size={18} className="text-gray-500 mr-2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="text"
                  placeholder="Search folders..."
                  className="bg-transparent outline-none text-sm w-full"
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto flex-1 min-h-screen">
            {loading ? (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`skel-${i}`}
                    className="flex items-start justify-between px-4 py-3 border-b border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="ml-3">
                      <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                  </div>
                ))}
              </>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No folders found
              </div>
            ) : isCollapsed ? (
              filtered.map((folder) => {
                const initial =
                  (folder.folder || "").trim().charAt(0).toUpperCase() || "?";
                return (
                  <div
                    key={folder.folder_id}
                    className="px-2 py-3 flex justify-center"
                  >
                    <Link
                      href={`/dashboard/knowledge-base/${folder.folder_id}`}
                      className="w-10 h-10 rounded-md bg-blue-700 flex items-center justify-center text-white text-sm font-semibold"
                    >
                      {initial}
                    </Link>
                  </div>
                );
              })
            ) : (
              filtered.map((folder) => (
                <div
                  key={folder.folder_id}
                  className="flex items-start justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-100"
                >
                  <Link
                    href={`/dashboard/knowledge-base/${folder.folder_id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="text-gray-900 font-medium truncate">
                      {folder.folder}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {(folder.documents?.[0]?.count ?? 0) +
                        " document" +
                        ((folder.documents?.[0]?.count ?? 0) === 1
                          ? ""
                          : "s")}{" "}
                      •{" "}
                      {(folder.bots ?? 0) +
                        " bot" +
                        ((folder.bots ?? 0) === 1 ? "" : "s")}
                    </p>
                  </Link>

                  <div className="relative ml-3">
                    <button
                      onClick={() => openMenu(folder.folder_id)}
                      className="p-2 rounded-md border border-gray-100 hover:bg-gray-50 flex items-center justify-center cursor-pointer"
                      aria-haspopup="true"
                      aria-expanded={menuOpenFor === folder.folder_id}
                      title="Options"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {menuOpenFor === folder.folder_id && (
                      <div
                        className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-40 overflow-hidden"
                        role="menu"
                      >
                        <button
                          onClick={() => startRename(folder)}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50"
                        >
                          <Pencil size={15} />
                          <span className="font-medium text-[14px] text-gray-800">
                            Rename
                          </span>
                        </button>

                        <div className="border-t border-gray-100" />

                        <button
                          onClick={() => {
                            if (deletePendingFor === folder.folder_id) {
                              confirmDelete(folder.folder_id);
                            } else {
                              startDeleteInline(folder);
                            }
                          }}
                          className={`w-full text-left px-4 py-3 flex items-center gap-3 ${
                            deletePendingFor === folder.folder_id
                              ? "bg-red-50"
                              : "hover:bg-gray-50"
                          }`}
                          disabled={actionLoadingFor === folder.folder_id}
                        >
                          <Trash size={15} />
                          {actionLoadingFor === folder.folder_id ? (
                            <span className="text-gray-800 text-[14px]">
                              Deleting...
                            </span>
                          ) : deletePendingFor === folder.folder_id ? (
                            <span className="font-semibold text-red-700 text-[14px]">
                              Sure?
                            </span>
                          ) : (
                            <span className="font-medium text-[14px] text-gray-800">
                              Delete
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsCollapsed((s) => !s)}
        aria-label={isCollapsed ? "Open sidebar" : "Close sidebar"}
        style={{
          left: isCollapsed
            ? 0
            : expandedHandleLeft - Math.floor(handleSize / 2),
          width: handleSize,
          height: handleSize,
        }}
        className="absolute top-1/2 -translate-y-1/2 z-50 rounded-full bg-blue-700 border border-gray-200 shadow-sm flex items-center justify-center hover:bg-blue-700/80 cursor-pointer"
      >
        {isCollapsed ? (
          <ChevronRight size={18} className="text-white" />
        ) : (
          <ChevronLeft size={18} className="text-white" />
        )}
      </button>

      <div className="flex-1 overflow-y-auto">{children}</div>

      {showCreate && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-lg shadow p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold mb-3">Create Folder</h3>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="border rounded w-full px-3 py-2 outline-none"
              placeholder="Folder name"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={createFolder}
                className="px-4 py-2 bg-blue-700 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {renameModalFor && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">Rename Folder</h3>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="border rounded w-full px-3 py-2 outline-none focus:border-blue-400"
              placeholder="Folder name"
              autoFocus
            />
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => {
                  setRenameModalFor(null);
                  setRenameValue("");
                }}
                className="px-4 py-2 bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={submitRename}
                className="px-4 py-2 bg-blue-700 text-white rounded disabled:opacity-60"
                disabled={actionLoadingFor === renameModalFor}
              >
                {actionLoadingFor === renameModalFor ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
