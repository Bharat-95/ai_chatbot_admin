"use client";

import React, { useEffect, useState, useRef } from "react";
import { LiaPenNibSolid } from "react-icons/lia";
import { PiUploadThin } from "react-icons/pi";
import { IoIosLink } from "react-icons/io";
import { ArrowLeft, MoreVertical, Loader2 } from "lucide-react";
import Link from "next/link";
import StoredDocuments from "../_components/StoredDocuments";
import { useRouter } from "next/navigation";

export default function FolderDashboard({ params }) {
  const { folderId } = React.use(params);
  const router = useRouter();

  const [folder, setFolder] = useState(null);
  const [loadingFolder, setLoadingFolder] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const loadFolder = async () => {
      setLoadingFolder(true);
      try {
        const mod = await import("../../../../lib/supabaseBrowser").catch(() => null);
        const supabase = mod?.supabaseBrowser || null;

        // ✅ Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const userId = user?.id;
        if (!userId || !folderId) {
          if (!cancelled) setFolder(null);
          return;
        }

        // ✅ Explicit fetch using select and limit(1)
        const { data, error } = await supabase
          .from("knowledge_base")
          .select("folder_id, folder, created_at, updated_at, user_id")
          .eq("folder_id", folderId)
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();

        if (error) console.warn("Supabase folder fetch error:", error);

        if (!cancelled) setFolder(data || null);
      } catch (err) {
        console.error("Error loading folder:", err);
        if (!cancelled) setFolder(null);
      } finally {
        if (!cancelled) setLoadingFolder(false);
      }
    };
    loadFolder();
    return () => {
      cancelled = true;
    };
  }, [folderId]);

  useEffect(() => {
    const hideOnOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
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
    e.stopPropagation();
    setMenuOpen((s) => !s);
    setDeleteConfirm(false);
  };

  const openRename = () => {
    setRenameValue(folder?.folder || "");
    setRenameOpen(true);
    setMenuOpen(false);
  };

  const submitRename = async () => {
    if (!renameValue || !folder) return;
    setRenameLoading(true);
    try {
      const mod = await import("../../../lib/supabaseBrowser").catch(() => null);
      const supabase = mod?.supabaseBrowser || null;
      const now = new Date().toISOString();
      await supabase
        .from("knowledge_base")
        .update({ folder: renameValue.trim(), updated_at: now })
        .eq("folder_id", folder.folder_id);
      const { data } = await supabase
        .from("knowledge_base")
        .select("folder_id, folder, created_at, updated_at")
        .eq("folder_id", folder.folder_id)
        .single();
      setFolder(data || null);
      setRenameOpen(false);
      setRenameValue("");
    } catch (err) {
      console.error("Rename failed:", err);
      setRenameOpen(false);
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!folder) return;
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleteLoading(true);
    try {
      const mod = await import("../../../lib/supabaseBrowser").catch(() => null);
      const supabase = mod?.supabaseBrowser || null;
      await supabase.from("documents").delete().eq("folderId", folder.folder_id);
      await supabase.from("knowledge_base").delete().eq("folder_id", folder.folder_id);
      router.push("/dashboard/knowledge-base");
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6">
     

      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[17px] font-semibold">Create Documents</h2>
      </div>

      <p className="text-[14px] text-gray-500 -mt-2">
        You can create a new document in this folder by writing, uploading an existing document, or importing a webpage.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <Link
          href={`/dashboard/knowledge-base/${folderId}/create`}
          className="px-4 py-4 border rounded-lg bg-blue-50 border-blue-200 block hover:shadow-sm transition"
        >
          <LiaPenNibSolid size={30} color="blue" />
          <h3 className="font-semibold mt-2">Write</h3>
          <p className="text-sm text-gray-600 mt-1">Write or copy-paste your document</p>
        </Link>

        <Link
          href={`/dashboard/knowledge-base/${folderId}/upload`}
          className="px-4 py-4 border rounded-lg bg-purple-50 border-purple-200 block hover:shadow-sm transition"
        >
          <PiUploadThin size={30} color="purple" />
          <h3 className="font-semibold mt-2">Upload</h3>
          <p className="text-sm text-gray-600 mt-1">PDF, Word, or PowerPoint files</p>
        </Link>

        <Link
          href={`/dashboard/knowledge-base/${folderId}/website`}
          className="px-4 py-4 border rounded-lg bg-green-50 border-green-200 block hover:shadow-sm transition"
        >
          <IoIosLink size={30} color="green" />
          <h3 className="font-semibold mt-2">Import Website</h3>
          <p className="text-sm text-gray-600 mt-1">Webpage with text content</p>
        </Link>
      </div>

      <StoredDocuments folderId={folderId} onSelect={() => {}} />

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
  );
}
