"use client";

import React, { useEffect, useState, useRef } from "react";
import { Lock, Unlock } from "lucide-react";

export default function ImageModal({ open, initial = null, onClose, onSubmit }) {
  const [sourceType, setSourceType] = useState("url");
  const [url, setUrl] = useState("");
  const [filePreview, setFilePreview] = useState(null);
  const [alt, setAlt] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locked, setLocked] = useState(true);
  const naturalRatioRef = useRef(null);
  const imgLoaderRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setUrl(initial.src || "");
      setAlt(initial.alt || "");
      setWidth(initial.width ? String(initial.width) : "");
      setHeight(initial.height ? String(initial.height) : "");
      setFilePreview(initial.src || null);
      setSourceType(initial.src ? "url" : "url");
      naturalRatioRef.current = initial.width && initial.height ? (initial.width / initial.height) : null;
    } else {
      setUrl("");
      setAlt("");
      setWidth("");
      setHeight("");
      setFilePreview(null);
      setSourceType("url");
      naturalRatioRef.current = null;
    }
  }, [open, initial]);

  useEffect(() => {
    return () => {
      if (filePreview && filePreview.startsWith("blob:")) {
        URL.revokeObjectURL(filePreview);
      }
      if (imgLoaderRef.current) {
        imgLoaderRef.current.onload = null;
        imgLoaderRef.current = null;
      }
    };
  }, [filePreview]);

  const onFileChange = (e) => {
    const f = e?.target?.files?.[0] ?? null;
    if (!f) return;
    const objectUrl = URL.createObjectURL(f);
    setFilePreview(objectUrl);
    setUrl("");
    setSourceType("file");
    loadNaturalSize(objectUrl);
  };

  const loadNaturalSize = (src) => {
    const img = new window.Image();
    imgLoaderRef.current = img;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        naturalRatioRef.current = img.naturalWidth / img.naturalHeight;
        if (!width && !height) {
          setWidth(String(Math.min(img.naturalWidth, 600)));
          setHeight(String(Math.round(Math.min(img.naturalWidth, 600) / naturalRatioRef.current)));
        } else if (locked && width && !height) {
          const h = Math.round(parseInt(width, 10) / naturalRatioRef.current);
          setHeight(String(h));
        } else if (locked && height && !width) {
          const w = Math.round(parseInt(height, 10) * naturalRatioRef.current);
          setWidth(String(w));
        }
      }
    };
    img.src = src;
  };

  const onUrlBlur = () => {
    const src = url.trim();
    if (!src) return;
    setFilePreview(null);
    setSourceType("url");
    loadNaturalSize(src);
  };

  const onWidthChange = (v) => {
    if (!/^\d*$/.test(v) && v !== "") return;
    setWidth(v);
    if (locked && naturalRatioRef.current && v !== "") {
      const h = Math.round(Number(v) / naturalRatioRef.current);
      setHeight(String(h));
    }
  };

  const onHeightChange = (v) => {
    if (!/^\d*$/.test(v) && v !== "") return;
    setHeight(v);
    if (locked && naturalRatioRef.current && v !== "") {
      const w = Math.round(Number(v) * naturalRatioRef.current);
      setWidth(String(w));
    }
  };

  const toggleLock = () => {
    setLocked((s) => !s);
  };

  const submit = async () => {
    if (!onSubmit) return;
    setIsSubmitting(true);
    let srcToSend = null;
    if (sourceType === "file" && filePreview) {
      srcToSend = filePreview;
    } else if (sourceType === "url" && url.trim()) {
      srcToSend = url.trim();
    } else if (filePreview) {
      srcToSend = filePreview;
    }
    if (!srcToSend) {
      setIsSubmitting(false);
      return;
    }
    const payload = {
      src: srcToSend,
      alt: alt || "",
      width: width ? parseInt(width, 10) || undefined : undefined,
      height: height ? parseInt(height, 10) || undefined : undefined,
    };
    try {
      await onSubmit(payload);
      onClose && onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-blue-700/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded shadow-lg z-10 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="text-2xl font-semibold">Insert/Edit Image</div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Source</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={onUrlBlur}
              placeholder="https://example.com/image.jpg"
              className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <div className="mt-2 flex items-center gap-3 text-sm">
              <label className="text-gray-500">Or upload</label>
              <input type="file" accept="image/*" onChange={onFileChange} className="text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Alternative description</label>
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Alternate description"
              className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Width / Height</label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  value={width}
                  onChange={(e) => onWidthChange(e.target.value)}
                  placeholder="Width"
                  className="w-full border border-gray-300 rounded px-3 py-2 outline-none"
                />
              </div>
              <div className="flex-1">
                <input
                  value={height}
                  onChange={(e) => onHeightChange(e.target.value)}
                  placeholder="Height"
                  className="w-full border border-gray-300 rounded px-3 py-2 outline-none"
                />
              </div>
              <button onClick={toggleLock} className="p-2 rounded border bg-white hover:bg-gray-50">
                {locked ? <Lock size={16} /> : <Unlock size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 px-6 py-4 border-t">
          <button onClick={onClose} className="px-5 py-2 rounded border bg-white">Cancel</button>
          <button onClick={submit} disabled={isSubmitting} className="px-5 py-2 rounded bg-indigo-600 text-white disabled:opacity-60">
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
