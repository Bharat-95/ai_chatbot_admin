"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "../../../../../lib/supabaseBrowser";
import { Loader2, ArrowLeft } from "lucide-react";
import StoredDocuments from "../../_components/StoredDocuments";
import { showToast } from "@/hooks/useToast";



export default function ImportWebsite({ folderId: folderIdProp = null }) {
  const params = useParams();
  const inferredFolderId = params?.project || params?.folderId || null;
  const folderId = folderIdProp || inferredFolderId || null;

  const [url, setUrl] = useState("");
  const [docName, setDocName] = useState("");
  const [recurring, setRecurring] = useState("once");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [listKey, setListKey] = useState(0);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseBrowser.auth.getUser();
        const id = data?.user?.id;
        if (id) setUserId(id);
      } catch {}
    })();
  }, []);

 
  const validateUrl = (value) => {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const allFieldsValid =
    docName.trim() !== "" && url.trim() !== "" && validateUrl(url.trim());

  const onInsert = async (e) => {
    e && e.preventDefault();

    if (!docName || !docName.trim()) {
      showToast({
        type:"error",
        title:"Error",
        description:"Title is required",
      });
      return;
    }

    if (!url || !url.trim()) {
      showToast({
        type:"error",
        title:"Error",
        description:"Please enter a website URL."
      });
      return;
    }

    if (!validateUrl(url.trim())) {
      showToast(
       {
        type:'error',
        title:"Error",
        description: "Please enter a valid URL starting with http:// or https://"
       }
       
      );
      return;
    }

    if (!userId) {
      showToast({
        type:"error",
        title:"Error",
        description:"User not authenticated. Please sign in and try again."
      });
      return;
    }

    if (!folderId) {
      showToast({
        type:"error",
        title:"Error",
        description:"Folder not selected. Open a folder before inserting."
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        doc_name: docName.trim(),
        status: "learned",
        type: "website",
        doc_url: url.trim(),
        doc_content: JSON.stringify({
          recurring: recurring,
          imported_at: new Date().toISOString(),
        }),
        folderId,
        userId,
        file_type: null,
        file_size: null,
      };

       try {
        await fetch(
          "https://n8n.srv1028016.hstgr.cloud/webhook/AI-Chatbot-KnowledgeBase",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
      } catch (webhookError) {
        console.error("Webhook call failed:", webhookError);
      }


      const { error } = await supabaseBrowser
        .from("documents")
        .insert([payload])
        .select()
        .single();

      if (error) {
        showToast({
          type:"error",
          title:"Error",
          description: "Failed to insert record."
        });
      } else {
        showToast({
          type:"success",
          title:"Success",
          description:"Website Details inserted"
        });
        setUrl("");
        setDocName("");
        setRecurring("once");
        setListKey((k) => k + 1);
      }
    } catch {
      showToast({
        type:"error",
        title:"Error",
        description:"Unexpected error. Check console."
      });
    } finally {
      setLoading(false);
    }
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
      )}/storage/v1/object/public/kb-files/${encodeURIComponent(docPath)}`;
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
        <h2 className="text-[17px] font-semibold">Import Website</h2>
      </div>

      <p className="text-[14px] text-gray-500 -mt-2">
        You can import a webpage by entering its URL below. Only valid URLs are
        accepted.
      </p>

      <form onSubmit={onInsert} className="space-y-6 mt-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="Title for this imported website"
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website URL (must start with http:// or https://)
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webpage"
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            autoComplete="off"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={!allFieldsValid || loading}
            type="submit"
            className={`px-5 py-3 rounded-md text-white flex items-center gap-2 ${
              !allFieldsValid || loading
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Insert
          </button>

          <button
            type="button"
            onClick={() => {
              setUrl("");
              setDocName("");
              setRecurring("once");
           
            }}
            className="px-4 py-3 rounded-md border border-gray-200 text-sm"
          >
            Reset
          </button>
        </div>
      </form>

     

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
