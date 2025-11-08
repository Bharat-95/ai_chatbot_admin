"use client";

import React, { useEffect, useState, useRef } from "react";
import { MoreVertical, Loader2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { showToast } from "@/hooks/useToast";

export default function StoredDocuments({
  folderId,
  onSelect = null,
  hideHeader = false,
  pageSize = 100,
}) {
  const [docs, setDocs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // menuState: open toggles, anchorRect stores button rect, doc is the doc for menu
  const [menuState, setMenuState] = useState({
    open: false,
    anchorRect: null,
    key: null,
    doc: null,
  });

  // menu position (px) computed & updated after measuring menu
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0 });
  const menuRef = useRef(null);

  const [renameFor, setRenameFor] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [changeFolderFor, setChangeFolderFor] = useState(null);
  const [changeFolderValue, setChangeFolderValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [renameLoading, setRenameLoading] = useState(false);
  const [changeFolderLoading, setChangeFolderLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Preview state for HTML documents
  const [previewDoc, setPreviewDoc] = useState(null); // doc object
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null); // inline HTML for type === "write"
  const [previewLoading, setPreviewLoading] = useState(false);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const BUCKET = "kb-files";
  const pageSizeRef = useRef(pageSize);

  // Fetch documents
  useEffect(() => {
    if (!folderId) {
      setDocs([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchDocs = async () => {
      setLoading(true);
      try {
        const mod = await import("../../../../lib/supabaseBrowser").catch(() => null);
        const supabase = mod?.supabaseBrowser || null;
        const { data } = await supabase
          .from("documents")
          .select("*")
          .eq("folderId", folderId)
          .order("created_at", { ascending: false })
          .limit(pageSizeRef.current);
        if (!cancelled) setDocs(data || []);
      } catch (err) {
        if (!cancelled) setDocs([]);
        console.error("fetchDocs error", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDocs();
    return () => {
      cancelled = true;
    };
  }, [folderId]);

  // Fetch folders for "Change Folder"
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const mod = await import("../../../../lib/supabaseBrowser").catch(() => null);
        const supabase = mod?.supabaseBrowser || null;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const userId = user?.id;
        if (!userId) return setFolders([]);
        const { data } = await supabase
          .from("knowledge_base")
          .select("folder_id, folder")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });
        setFolders(data || []);
      } catch (err) {
        console.error("fetchFolders error", err);
        setFolders([]);
      }
    };
    fetchFolders();
  }, []);

  const filtered = docs.filter((d) =>
    (d.doc_name || d.file_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const prettyDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const isHtmlDoc = (doc) => {
    if (!doc) return false;
    const fileType = (doc.file_type || "").toString().toLowerCase();
    const path = (doc.doc_path || doc.file_path || "").toString().toLowerCase();
    if (fileType.includes("html")) return true;
    if (path.endsWith(".html")) return true;
    // Consider 'write' with doc_content as HTML that should open in modal
    if (doc.type === "write" && doc.doc_content) return true;
    return false;
  };

  // Prepare and show HTML preview modal for docs saved as HTML or 'write' type
  const showHtmlPreview = async (doc, e) => {
    e && e.stopPropagation();
    if (!doc) return;
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewUrl(null);
    setPreviewHtml(null);

    try {
      // If this is a 'write' document and doc_content exists, use it
      if (doc.type === "write" && doc.doc_content) {
        // Use srcDoc via previewHtml to render inline HTML safely
        setPreviewHtml(doc.doc_content);
        setPreviewLoading(false);
        return;
      }

      // Prefer doc.doc_url if available
      if (doc.doc_url) {
        setPreviewUrl(doc.doc_url);
        setPreviewLoading(false);
        return;
      }

      const path = doc.doc_path || doc.file_path;
      if (!path) throw new Error("No path for doc");
      const publicUrl = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(
        path
      )}`;
      setPreviewUrl(publicUrl);
    } catch (err) {
      console.error("showHtmlPreview error", err);
      alert("Unable to preview this HTML document.");
      setPreviewDoc(null);
      setPreviewUrl(null);
      setPreviewHtml(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Open document in new tab (keeps original behavior for non-HTML docs).
  // For HTML docs we open the modal instead (per your request).
  const openDoc = (doc, e) => {
    try {
      if (isHtmlDoc(doc)) {
        // open modal preview for HTML/write docs
        showHtmlPreview(doc, e);
        return;
      }

      // if it's a website document, open its URL directly
      if (doc.type === "website" && doc.doc_url) {
        window.open(doc.doc_url, "_blank", "noopener,noreferrer");
        return;
      }

      // existing logic for files remains untouched
      const path = doc.doc_path || doc.file_path;
      if (!path) return alert("File path not found for this document.");
      const publicUrl =
        doc.public_url ||
        `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(
          path
        )}`;
      window.open(publicUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Preview error:", error);
      alert("Unable to open this document.");
    }
  };

  // Open menu at button rect. We store anchor rect (viewport coords).
  const openMenuAt = (e, key, doc) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuState({
      open: true,
      anchorRect: rect,
      key,
      doc,
    });
    setDeleteConfirmId(null); // reset inline confirm state when switching
    // reset menu pos until measured
    setMenuPos({ left: rect.left, top: rect.bottom + 6 });
  };

  const closeMenu = () =>
    setMenuState({
      open: false,
      anchorRect: null,
      key: null,
      doc: null,
    });

  // Close on outside click, but not when clicking inside menu. Keep menu anchored on scroll/resize.
  useEffect(() => {
    const handleDocClick = (e) => {
      const menuEl = document.getElementById("doc-menu");
      // guard target type (avoid contains error)
      const target = e && "target" in e ? e.target : null;
      if (menuEl && target instanceof Node && menuEl.contains(target)) return;
      // if the clicked element is a button that opens the menu we let that handler manage open/close
      closeMenu();
    };
    const handleKey = (ev) => {
      if (ev.key === "Escape") closeMenu();
    };
    window.addEventListener("click", handleDocClick);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("resize", closeMenu);
    // Close menu on scroll (optional) - here we close so menu doesn't drift away from anchor
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("click", handleDocClick);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  // After menu opens/mounts, measure and clamp to viewport so it doesn't overflow.
  useEffect(() => {
    if (!menuState.open || !menuState.anchorRect) return;
    const adjust = () => {
      const anchor = menuState.anchorRect;
      const menuEl = menuRef.current;
      const menuWidth = menuEl ? menuEl.offsetWidth : 220;
      const menuHeight = menuEl ? menuEl.offsetHeight : 200;
      const GAP = 6;
      const MARGIN = 8;

      // Try place below the button by default
      let left = anchor.left;
      let top = anchor.bottom + GAP;

      // If there's not enough room on the right, shift left
      if (left + menuWidth + MARGIN > window.innerWidth) {
        left = anchor.right - menuWidth;
      }
      // Clamp left so it never goes off-screen
      left = Math.max(MARGIN, Math.min(left, window.innerWidth - menuWidth - MARGIN));

      // If not enough space below, flip above
      if (top + menuHeight + MARGIN > window.innerHeight) {
        const altTop = anchor.top - menuHeight - GAP;
        if (altTop >= MARGIN) {
          top = altTop;
        } else {
          // Not enough space above either — clamp vertically
          top = Math.max(MARGIN, Math.min(top, window.innerHeight - menuHeight - MARGIN));
        }
      }

      // If the anchor is far to the right and left is negative, clamp
      if (!Number.isFinite(left) || !Number.isFinite(top)) {
        left = Math.max(MARGIN, Math.min(anchor.left, window.innerWidth - menuWidth - MARGIN));
        top = Math.max(MARGIN, Math.min(anchor.bottom + GAP, window.innerHeight - menuHeight - MARGIN));
      }

      setMenuPos({ left, top });
    };

    // Run after a tick to allow DOM to render
    const t = setTimeout(adjust, 8);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuState.open, menuState.anchorRect, menuRef.current]);

  // Rename
  const startRename = (doc) => {
    setRenameFor(doc);
    setRenameValue(doc.doc_name || doc.file_name || "");
    closeMenu();
  };

  const submitRename = async () => {
    if (!renameFor) return;
    setRenameLoading(true);
    try {
      const mod = await import("../../../../lib/supabaseBrowser").catch(() => null);
      const supabase = mod?.supabaseBrowser || null;
      const now = new Date().toISOString();
      await supabase
        .from("documents")
        .update({ doc_name: renameValue.trim(), updated_at: now })
        .eq("id", renameFor.id);
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("folderId", folderId)
        .order("updated_at", { ascending: false });
      setDocs(data || []);
    } catch (err) {
      console.error(err);
    }
    setRenameLoading(false);
    setRenameFor(null);
    setRenameValue("");
  };

  // Change Folder
  const startChangeFolder = (doc) => {
    setChangeFolderFor(doc);
    setChangeFolderValue(folderId || "");
    closeMenu();
  };

  const submitChangeFolder = async () => {
    if (!changeFolderFor || !changeFolderValue) return;
    setChangeFolderLoading(true);
    try {
      const mod = await import("../../../../lib/supabaseBrowser").catch(() => null);
      const supabase = mod?.supabaseBrowser || null;
      const now = new Date().toISOString();
      await supabase
        .from("documents")
        .update({ folderId: changeFolderValue, updated_at: now })
        .eq("id", changeFolderFor.id);
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("folderId", folderId)
        .order("updated_at", { ascending: false });
      setDocs(data || []);
    } catch (err) {
      console.error(err);
    }
    setChangeFolderLoading(false);
    setChangeFolderFor(null);
    setChangeFolderValue("");
  };

 const startDelete = async (doc) => {
  if (deleteConfirmId === doc.id) {
    setDeleteLoading(true);
    try {
      const mod = await import("../../../../lib/supabaseBrowser").catch(() => null);
      const supabase = mod?.supabaseBrowser || null;

      await supabase.from("documents").delete().eq("id", doc.id);

      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("folderId", folderId)
        .order("updated_at", { ascending: false });

      setDocs(data || []);

      // close the menu explicitly after successful delete
      closeMenu();

      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("kb:doc-deleted", {
              detail: {
                folderId: folderId || null,
                docId: doc.id,
              },
            })
          );
        }
      } catch (e) {
        console.warn("dispatch kb:doc-deleted failed", e);
      }

      showToast({
        type: "success",
        title: "Success",
        description: "Document Deleted Successfully",
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        description: "Error deleting document",
      });
      console.error(err);
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmId(null);
    }
  } else {
    setDeleteConfirmId(doc.id);
  }
};



  const renderMenuPortal = () => {
    if (!menuState.open || !menuState.doc) return null;
    const doc = menuState.doc;
    const isConfirming = deleteConfirmId === doc.id;
    const isHtml = isHtmlDoc(doc);

    const style = {
      position: "fixed",
      left: `${menuPos.left}px`,
      top: `${menuPos.top}px`,
      zIndex: 9999,
      minWidth: 220,
      // small visual adjustment
      boxSizing: "border-box",
    };

    return createPortal(
      <div
        id="doc-menu"
        ref={menuRef}
        style={style}
        className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()} // prevent outside click handler from closing when clicking inside
      >
        <button
          onClick={() => {
            // If HTML doc, open modal; otherwise open public URL in new tab
            if (isHtml) {
              showHtmlPreview(doc);
            } else {
              openDoc(doc);
            }
            closeMenu();
          }}
          className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm"
        >
          Preview
        </button>
        <button
          onClick={() => startRename(doc)}
          className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm"
        >
          Rename
        </button>
        <button
          onClick={() => startChangeFolder(doc)}
          className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm"
        >
          Change Folder
        </button>
        <button
          onClick={() => startDelete(doc)}
          disabled={deleteLoading}
          className={`w-full text-left px-4 py-3 text-sm font-medium ${
            isConfirming ? "text-red-600" : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          {deleteLoading ? (
            <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
          ) : isConfirming ? (
            "Sure?"
          ) : (
            "Delete"
          )}
        </button>
      </div>,
      document.body
    );
  };

  return (
    <div className="mt-10 relative">
      {!hideHeader && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Stored Documents</h3>
            <p className="text-sm text-gray-500">
              These are all uploaded documents that the system has stored.
            </p>
          </div>
          <input
            type="text"
            placeholder="Search documents"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
      )}

      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="py-3 px-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Edited On</th>
              <th className="py-3 px-4 font-medium">Created On</th>
              <th className="py-3 px-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="py-4 px-4"><div className="h-4 w-40 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="py-4 px-4" />
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan="5" className="py-10 text-center text-gray-400">No documents found</td></tr>
            ) : (
              filtered.map((doc) => {
                const key = doc.id ?? doc.document_id ?? JSON.stringify(doc);
                const status = (doc.status || doc.processing_status || "N/A").toString();
                const isHtml = isHtmlDoc(doc);
                return (
                  <tr
                    key={key}
                    onClick={() => openDoc(doc)}
                    className="border-t border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 text-gray-800 font-medium">
                      <div className="flex items-center gap-3">
                        <div>
                          {doc.doc_name || doc.file_name || "Untitled"}
                          
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          status.toLowerCase() === "done" || status.toLowerCase() === "uploaded"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{prettyDate(doc.updated_at)}</td>
                    <td className="py-3 px-4 text-gray-600">{prettyDate(doc.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            openMenuAt(e, key, doc);
                          }}
                        >
                          <MoreVertical size={16} className="text-gray-800" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {renderMenuPortal()}

      {/* Rename Modal */}
      {renameFor &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-3">Rename Document</h3>
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-4 outline-none"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setRenameFor(null);
                    setRenameValue("");
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRename}
                  className="px-4 py-2 bg-blue-700 text-white rounded flex items-center gap-2"
                >
                  {renameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Change Folder Modal */}
      {changeFolderFor &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-3">
                Select New Folder for {changeFolderFor.doc_name || changeFolderFor.file_name}
              </h3>
              <select
                value={changeFolderValue}
                onChange={(e) => setChangeFolderValue(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-4 outline-none"
              >
                <option value="">Select a folder</option>
                {folders.map((f) => (
                  <option key={f.folder_id} value={f.folder_id}>
                    {f.folder || f.folder_name || f.folder_id}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setChangeFolderFor(null);
                    setChangeFolderValue("");
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={submitChangeFolder}
                  className="px-4 py-2 bg-blue-700 text-white rounded flex items-center gap-2"
                >
                  {changeFolderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Change"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* HTML / Inline Preview Modal */}
      {previewDoc && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-lg w-[90%] max-w-4xl h-[80%] overflow-hidden relative">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Preview: {previewDoc.doc_name || previewDoc.file_name}</h3>
                {previewLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <div className="flex items-center gap-2">
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm px-3 py-1 border rounded"
                  >
                    Open in new tab
                  </a>
                )}
                {/* If previewHtml exists, we still provide "Open in new tab" which opens a window with the HTML content */}
                {previewHtml && (
                  <button
                    onClick={() => {
                      const w = window.open("", "_blank", "noopener,noreferrer");
                      if (!w) return alert("Popup blocked. Please allow popups for previews.");
                      w.document.open();
                      w.document.write(previewHtml);
                      w.document.close();
                    }}
                    className="text-sm px-3 py-1 border rounded"
                  >
                    Open in new tab
                  </button>
                )}
                <button
                  onClick={() => { setPreviewDoc(null); setPreviewUrl(null); setPreviewHtml(null); }}
                  className="p-2"
                >
                  <X />
                </button>
              </div>
            </div>

            <div className="h-full">
              {previewLoading ? (
                <div className="p-6 text-center text-gray-500">Loading preview...</div>
              ) : previewHtml ? (
                // Render inline HTML directly via srcDoc for 'write' documents
                <iframe
                  title={`preview-${previewDoc.id}`}
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
              ) : previewUrl ? (
                <iframe
                  title={`preview-${previewDoc.id}`}
                  src={previewUrl}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
              ) : (
                <div className="p-6 text-center text-gray-500">Unable to load preview.</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
