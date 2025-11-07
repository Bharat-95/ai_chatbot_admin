"use client";

import React, { createContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, Loader2 } from "lucide-react";
import { supabaseBrowser } from "../../../../lib/supabaseBrowser";

/**
 * FolderContext: children can use this to read folder & reload
 * Example in child: const { folder, reloadFolder } = useContext(FolderContext)
 */
export const FolderContext = createContext({ folder: null, reloadFolder: () => {} });

export default function FolderLayout({ children, params }) {
  // unwrap params for client component (next.js migration support)
  const { folder: folderIdParam, folder: _maybe } = React.use(params); // keep naming stable
  // Note: depending on your routing setup the param name may be `folder` or `folderId`.
  // If your folder param key is `folderId`, change above to: const { folderId } = React.use(params);
  // In your examples you used `folderId` earlier. If param key is `folderId` use that.
  const { folderId } = React.use(params);

  const router = useRouter();
  const menuRef = useRef(null);

  const [folder, setFolder] = useState(null);
  const [loadingFolder, setLoadingFolder] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // fetch folder details (client-side)
  const loadFolder = async () => {
    if (!folderId) {
      setFolder(null);
      setLoadingFolder(false);
      return;
    }
    setLoadingFolder(true);
    try {
      const { data: { user } = {} } = await supabaseBrowser.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        setFolder(null);
        setLoadingFolder(false);
        return;
      }

      const { data, error } = await supabaseBrowser
        .from("knowledge_base")
        .select("folder_id, folder, created_at, updated_at, user_id")
        .eq("folder_id", folderId)
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("folder fetch error:", error);
      }
      setFolder(data || null);
    } catch (err) {
      console.error("loadFolder error:", err);
      setFolder(null);
    } finally {
      setLoadingFolder(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadFolder();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  // close menu when clicking outside
 useEffect(() => {
  const hideOnOutside = (e) => {
    // If the menu ref isn't present, nothing to do
    if (!menuRef.current) return;

    // If this is a resize event (no meaningful e.target for DOM contains),
    // treat it as an outside action and close the menu.
    if (e && e.type === "resize") {
      setMenuOpen(false);
      setDeleteConfirm(false);
      return;
    }

    // For other events (click), ensure e.target is a DOM Node before calling contains.
    const target = e && "target" in e ? e.target : null;
    if (!(target instanceof Node) || !menuRef.current.contains(target)) {
      setMenuOpen(false);
      setDeleteConfirm(false);
    }
  };

  window.addEventListener("click", hideOnOutside);
  window.addEventListener("resize", hideOnOutside);
  return () => {
    window.removeEventListener("click", hideOnOutside);
    window.removeEventListener("resize", hideOnOutside);
  };
}, []);


  const toggleMenu = (e) => {
    e?.stopPropagation();
    setMenuOpen((s) => !s);
    setDeleteConfirm(false);
  };

  const openRename = (e) => {
    e?.stopPropagation();
    setRenameValue(folder?.folder || "");
    setRenameOpen(true);
    setMenuOpen(false);
  };

  const submitRename = async () => {
    if (!renameValue?.trim() || !folder) return;
    setRenameLoading(true);
    try {
      const now = new Date().toISOString();
      await supabaseBrowser
        .from("knowledge_base")
        .update({ folder: renameValue.trim(), updated_at: now })
        .eq("folder_id", folder.folder_id);

      // reload fresh folder
      await loadFolder();
      setRenameOpen(false);
      setRenameValue("");
    } catch (err) {
      console.error("rename failed:", err);
      setRenameOpen(false);
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDeleteClick = async (e) => {
    e?.stopPropagation();
    if (!folder) return;
    // first click toggles confirmation; keep menu open
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    // confirmed: delete documents and folder
    setDeleteLoading(true);
    try {
      // delete documents in folder (if you want that)
      await supabaseBrowser.from("documents").delete().eq("folderId", folder.folder_id);

      // delete folder row
      await supabaseBrowser.from("knowledge_base").delete().eq("folder_id", folder.folder_id);

      // navigate back to folders list
      router.push("/dashboard/knowledge-base");
    } catch (err) {
      console.error("delete failed:", err);
      // keep menu open and show sure? again for retry
      setDeleteConfirm(true);
    } finally {
      setDeleteLoading(false);
    }
  };

  // expose folder + reload to children via context
  const contextValue = {
    folder,
    reloadFolder: loadFolder,
  };

  return (
    <FolderContext.Provider value={contextValue}>
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Header shared across all child pages */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
         

            <div className="flex items-center gap-3 mx-10">
              <div className="px-3 py-1 rounded-md bg-gray-100 text-sm font-medium">
                {loadingFolder ? (
                  <span className="inline-block h-4 w-20 bg-gray-200 rounded animate-pulse" />
                ) : folder ? (
                  folder.folder
                ) : (
                  "Folder"
                )}
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={toggleMenu}
                  className="p-2 rounded-full hover:bg-gray-100"
                  title="Folder options"
                >
                  <MoreVertical size={18} className="text-gray-700" />
                </button>

                {menuOpen && (
                  <div className="absolute left-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-md z-40">
                    <button
                      onClick={openRename}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor" />
                        <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor" />
                      </svg>
                      Rename
                    </button>

                    <button
                      onClick={handleDeleteClick}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm ${deleteConfirm ? "text-red-600" : "text-gray-700"} ${!deleteConfirm ? "hover:bg-gray-50" : ""}`}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Deleting
                        </span>
                      ) : deleteConfirm ? (
                        "Sure?"
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                            <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor" />
                          </svg>
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Keep the small "Create Documents" UI and children rendering exactly as before.
            Children (pages like index, create, upload, website, etc.) will be rendered here. */}
        <div>{children}</div>

        {/* Rename modal */}
        {renameOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-3">Rename Folder</h3>
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-4 outline-none"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setRenameOpen(false);
                    setRenameValue("");
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRename}
                  className="px-4 py-2 bg-black text-white rounded flex items-center gap-2"
                  disabled={renameLoading}
                >
                  {renameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FolderContext.Provider>
  );
}
