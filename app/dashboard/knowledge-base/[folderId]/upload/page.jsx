"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabaseBrowser } from "../../../../../lib/supabaseBrowser";
import StoredDocuments from "../../_components/StoredDocuments";
import { showToast } from "@/hooks/useToast";

const BUCKET = "kb-files";
const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".txt",
  ".xlsx",
  ".xls",
];
const MAX_FILE_BYTES = 100 * 1024 * 1024;

function extFromName(name = "") {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx).toLowerCase();
}
function isAllowedFile(file) {
  const ext = extFromName(file.name);
  return ALLOWED_EXTENSIONS.includes(ext);
}
function uniqueFilePath(folderId, filename) {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1000000);
  const safeName = filename.replace(/[^a-zA-Z0-9.\-_() ]/g, "");
  const prefix = folderId ? `${folderId}` : "public";
  return `${prefix}/${ts}_${rand}_${safeName}`;
}

export default function UploadAreaWithList({
  folderId: folderIdProp = null,
  onUploaded = null,
}) {
  const params = useParams();
  const inferredFolderId = params?.project || params?.folderId || null;
  const folderId = folderIdProp || inferredFolderId || null;

  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [user, setUser] = useState(null);
  const [listKey, setListKey] = useState(0);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabaseBrowser.auth.getUser();
        if (!error && data?.user) setUser(data.user);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const addFiles = useCallback(
    (filesList) => {
      setGlobalError("");
      const files = Array.from(filesList || []);
      if (!files.length) return;
      if (items.length + files.length > 50) {
        setGlobalError(`You can upload up to 50 files at once.`);
        return;
      }
      const toAdd = files.map((f) => {
        const id = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        let error = null;
        if (!isAllowedFile(f)) error = "File type not supported";
        else if (f.size > MAX_FILE_BYTES)
          error = `File too large (max ${MAX_FILE_BYTES / (1024 * 1024)} MB)`;
        return {
          id,
          file: f,
          name: f.name,
          size: f.size,
          status: error ? "error" : "queued",
          error,
          path: null,
          publicUrl: null,
        };
      });
      setItems((prev) => {
        const merged = [...prev, ...toAdd];
        return merged;
      });
      toAdd.forEach((t) => {
        if (!t.error) startSingleUpload(t);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.length, folderId, user]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    addFiles(dt.files);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };
  const openFileDialog = () => {
    fileInputRef.current && fileInputRef.current.click();
  };

  async function uploadFileDirect(file, path) {
    const url = `${SUPABASE_URL.replace(
      /\/$/,
      ""
    )}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`;
    const headers = {};
    if (SUPABASE_ANON) headers["Authorization"] = `Bearer ${SUPABASE_ANON}`;
    headers["Content-Type"] = file.type || "application/octet-stream";
    const resp = await fetch(url, {
      method: "PUT",
      headers,
      body: file,
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(
        `Upload failed: ${resp.status} ${txt || resp.statusText}`
      );
    }
    return true;
  }

  async function startSingleUpload(item) {
    if (!folderId) {
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? { ...p, status: "error", error: "Folder not selected." }
            : p
        )
      );
      setGlobalError("Folder not selected.");
      return;
    }
    if (!user) {
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? { ...p, status: "error", error: "User not authenticated." }
            : p
        )
      );
      setGlobalError("User not authenticated.");
      return;
    }

    setItems((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, status: "uploading" } : p))
    );
    const path = uniqueFilePath(folderId, item.name);

    try {
      setUploading(true);
      await uploadFileDirect(item.file, path);

      const publicUrl = `${SUPABASE_URL.replace(
        /\/$/,
        ""
      )}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(path)}`;


      const docPayload = {
        doc_name: item.name,
        status: "uploaded",
        folderId: folderId,
        userId: user.id,
        type: "upload",
        doc_path: path, 
        doc_url: publicUrl, 
        file_type: item.file.type || extFromName(item.name).replace(".", ""),
        file_size: item.size || null,
        doc_content: null,
      };

     
      try {
        await fetch(
          "https://n8n.srv1028016.hstgr.cloud/webhook/AI-Chatbot-KnowledgeBase",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(docPayload),
          }
        );
      } catch (webhookError) {
        console.error("Webhook call failed:", webhookError);
      }

    
      const { error: insertError } = await supabaseBrowser
        .from("documents")
        .insert([docPayload]);

      if (insertError) {
      
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, status: "error", error: insertError.message }
              : p
          )
        );
        showToast({
          title: "Error",
          description: insertError.message || "Error saving document record.",
          type: "error",
        });
      } else {
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, status: "done", path, publicUrl } : p
          )
        );
        setListKey((k) => k + 1);
        if (onUploaded)
          onUploaded([{ ...item, status: "done", path, publicUrl }]);
      }

      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("kb:doc-created", {
              detail: {
                folderId: folderId || null,
                fileName: item.name,
                path,
                publicUrl,
              },
            })
          );
        }
      } catch (e) {
        console.warn("dispatch kb:doc-created failed", e);
      }

      showToast({
        title: "Success",
        description: "Document Uploaded successfully.",
        type: "success",
      });

      setGlobalError("");
    } catch (err) {
      const message = err?.message || "Upload failed";

      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, status: "error", error: message } : p
        )
      );
      setGlobalError(message);
    } finally {
      setUploading(false);
    }
  }

  const onFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    e.target.value = "";
  };

  const viewOriginal = (publicUrl, docPath) => {
    if (publicUrl) {
      window.open(publicUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (docPath) {
      const url = `${SUPABASE_URL.replace(
        /\/$/,
        ""
      )}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(docPath)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="pt-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        {folderId ? (
          <Link
            href={`/dashboard/knowledge-base/${folderId}`}
            className="p-2 rounded-full hover:bg-gray-100 transition"
            title="Back to Folders"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="p-2 rounded-full text-gray-300 cursor-not-allowed"
            title="Back to Folders"
          >
            <ArrowLeft size={20} className="text-gray-300" />
          </button>
        )}
        <h2 className="text-[17px] font-semibold">Create Documents</h2>
      </div>

      <p className="text-[14px] text-gray-500 -mt-2">
        You can create a new document in this folder by writing, uploading an
        existing document or importing a webpage.
      </p>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? "border-blue-700 bg-blue-700/5 shadow"
            : "border-gray-200 bg-white"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={onFileSelect}
          className="hidden"
          accept={ALLOWED_EXTENSIONS.join(",")}
        />
        <div className="mx-auto w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v12"
              stroke="#111827"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7 8l5-5 5 5"
              stroke="#111827"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 21H3"
              stroke="#111827"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-lg font-semibold mb-1">
          <button
            onClick={openFileDialog}
            className="underline"
            disabled={uploading}
          >
            Click to upload
          </button>{" "}
          or drag and drop
        </div>
        <div className="text-sm text-gray-500">
          Up to {ALLOWED_EXTENSIONS.join(", ")}. Max{" "}
          {MAX_FILE_BYTES / (1024 * 1024)} MB each.
        </div>
        {uploading && (
          <div className="flex justify-center items-center mt-4 text-gray-600">
            <Loader2 className="animate-spin mr-2 h-5 w-5" />
            Uploading...
          </div>
        )}
      </div>

      <div className="text-sm text-red-600 mt-2">{globalError}</div>

      <div className="mt-8">
        <StoredDocuments
          key={listKey}
          folderId={folderId}
          onSelect={(d) =>
            viewOriginal(d.public_url, d.doc_path || d.file_path)
          }
        />
      </div>
    </div>
  );
}
