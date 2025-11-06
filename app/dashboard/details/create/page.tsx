"use client";

import {
  CalendarDays,
  ChevronRight,
  ChevronDown,
  Upload,
  ClipboardPaste,
  X,
  Eye,
} from "lucide-react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import ErrorPage from "../../_components/ErrorMessage";
import { showToast } from "@/hooks/useToast";
import { Textarea } from "@/components/ui/textarea";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { useDropzone } from "react-dropzone";

// -------------------- VALIDATION --------------------
const validationSchema = Yup.object({
  content: Yup.string().required("Content is required"),
  user_id: Yup.string().required("User is required"),
  // file_url is optional so no validation rule here
});

// -------------------- TYPES --------------------
type User = {
  id: string;
  title: string;
  key?: string;
};

// -------------------- UTILITIES --------------------
const SkeletonBox = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
);

const textPreDefined = `<p>Dear [FirstName],</p><p>Welcome to DriveX Firm, a proud partner of Sign N Drive Auto Group!</p><p>We’re excited to have you on board as part of our growing network of automotive professionals.</p><p>Our goal is to empower you with the tools, training, and resources needed to succeed in the automotive sales industry. Below, you’ll find your login credentials and access details for the essential platforms you’ll be using: Dealertrack, Carfax, Email, SND App, Auto Corp</p><p>Please ensure that your credentials remain confidential and are not shared with anyone outside of the DriveX Firm network &amp; Sign N Drive Auto Group.</p><p>If you have any questions or need assistance with setup, feel free to reach out to our support team at <a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"mailto:info@drivexfirm.ca\">info@drivexfirm.ca</a>.</p><p>Let’s drive success together!</p><p>CREDENTIALS:</p><p>Tools\t                    Description                                                                                                                         Username\t                      Password              \t    </p><p>SND App\t\t\t        Our SND App is on both Apple &amp; Android Stores for clients to download.                        HArdki                             Sign1234</p><p>                                This is where your clients does most of their application process such as</p><p>                                ID Verify, Credit Application, Questionaire, Inventory, Choose Vehicle, </p><p>                                Upload Paystubs or other docs, Sign bank docs, etc.</p><p>Email\t\t\t            Your company Email is to be used only.                                                                               HArdki                             Sign1234</p><p>Credit Carz CRM      You are given your own CRM with 1 A.I Agent to assist you with nurturing</p><p>                                 your leads. They will contact the clients and book phone appointments.</p><p>                                 On your phone appointment, convince your client to start the process</p><p>                                 by downloading the SND App and start with the ID Verify then application.                     HArdki                             Sign1234</p><p>Dealertrack\t            This is a portal which we use to submit the client's info and vehicle to                               Hardki                             Sign1234</p><p>                                the Bank or Lender for Approval.</p><p>Auto Corp                This is a separate login for ID Verify &amp; Credit Soft Checks for clients only.                         HArdki                             Sign1234</p><p>Carfax\t\t\t            Carfax Canada is used to search the Accident History and Lien Records                             Hardki                             Sign1234</p>`;

// ************************************************************
// *                       COMPONENT                         *
// ************************************************************
export default function CreateInvoice() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------- STATE --------------------
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; url: string }[]
  >([]);
  // -------------------- EFFECTS --------------------
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500); // simulate loading
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    handleFetchUsers();
  }, []);

  // -------------------- SUPABASE: FETCH USERS --------------------
  const handleFetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseBrowser
        .from("users")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const mappedUsers: User[] = (data || []).map((u) => ({
        key: `${u?.display_name || u?.full_name || u?.email}_${u?.id}`,
        id: u.id,
        title: u?.display_name || u?.full_name || u?.email,
      }));
      setUsers(mappedUsers);
    } catch (err: any) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  // -------------------- FORMIK --------------------
  const formik = useFormik({
    initialValues: {
      content: "",
      user_id: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      setFormLoading(true);
      try {
        const payload = {
          ...values,
          attachments: uploadedFiles,
        };
        const { data: existing } = await supabaseBrowser
          .from("details")
          .select("id")
          .eq("user_id", values.user_id)
          .single();
        if (existing) {
          const { error } = await supabaseBrowser
            .from("details")
            .update(payload)
            .eq("user_id", values.user_id);
          if (error) throw error;
        } else {
          const { error } = await supabaseBrowser
            .from("details")
            .insert([payload]);
          if (error) throw error;
        }
        showToast({
          title: "Success",
          description: "Details saved successfully.",
        });
        router.push("/dashboard/details");
      } catch (err) {
        showToast({
          type: "error",
          title: "Error",
          description: "Something went wrong.",
        });
        setFormLoading(false);
      }
    },
  });

  // -------------------- EDITOR --------------------
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: formik.values.content,
    editorProps: {
      attributes: {
        class: "prose p-4 border rounded-md min-h-[200px] bg-white text-black",
      },
    },
    onUpdate: ({ editor }) => {
      formik.setFieldValue("content", editor.getHTML());
    },
    editable: true,
    autofocus: true,
    immediatelyRender: false, // ✅ Important for Next.js SSR
  });

  // -------------------- FILE HANDLERS --------------------
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.currentTarget.files?.[0];
    if (!selected) return;

    // ✨ 5 MB size check
    if (selected.size > 5 * 1024 * 1024) {
      showToast({
        title: "Error",
        description: "File size must be 5 MB or less.",
      });
      e.target.value = ""; // reset input
      return;
    }

    setFile(selected);
    await uploadToSupabase(selected);
  };

  const uploadToSupabase = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const filePath = `attachments/${Date.now()}_${file.name}`;
    const { error } = await supabaseBrowser.storage
      .from("detailsdoc")
      .upload(filePath, file);
    if (error) {
      showToast({
        type: "error",
        title: "Error",
        description: `Failed to upload ${file.name}`,
      });
      return null;
    }
    const {
      data: { publicUrl },
    } = supabaseBrowser.storage.from("detailsdoc").getPublicUrl(filePath);
    return publicUrl;
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length + uploadedFiles.length > 10) {
        showToast({
          title: "Limit Exceeded",
          description: "You can upload up to 10 files only.",
        });
        return;
      }

      setUploading(true);
      const uploaded = [...uploadedFiles];
      for (const file of acceptedFiles) {
        if (file.size > 10 * 1024 * 1024) {
          showToast({
            title: "Error",
            description: `${file.name} exceeds 10 MB.`,
          });
          continue;
        }
        const url = await uploadToSupabase(file);
        if (url) uploaded.push({ name: file.name, url });
      }
      setUploadedFiles(uploaded);
      setUploading(false);
    },
    [uploadedFiles]
  );

  const handleRemoveFile = () => {
    setFile(null);
    setUrl(null);
    formik.setFieldValue("file_url", "");
    if (fileInputRef.current) fileInputRef.current.value = ""; // reset input element
  };

  const handlePasteTemplate = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setContent(textPreDefined, { emitUpdate: false })
      .run();
    formik.setFieldValue("content", textPreDefined);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 10 * 1024 * 1024,
  });

  if (error) return <ErrorPage />;
  if (!editor) return null;

  // -------------------- RENDER --------------------
  return (
    <>
      {/* ----------------- GLOBAL LOADER ----------------- */}
      {(uploading || formLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
          <div className="flex items-center space-x-2 text-gray-700 bg-white px-4 py-2 rounded-md shadow-md">
            <svg
              className="w-5 h-5 animate-spin text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm font-medium">
              {uploading ? "Uploading..." : "Saving..."}
            </span>
          </div>
        </div>
      )}

      {/* ----------------- MAIN ----------------- */}
      <main className="flex-1 flex flex-col  min-h-screen">
        <section className="flex-1 px-4 sm:px-6 md:px-8 py-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8 max-w-6xl mx-auto">
            {loading ? (
              // ----------- SKELETON -----------
              <>
                <SkeletonBox className="h-8 w-48 mb-6" />
                <SkeletonBox className="h-6 w-40 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <SkeletonBox className="h-4 w-32" />
                      <SkeletonBox className="h-10 w-full" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <SkeletonBox className="h-10 w-24" />
                  <SkeletonBox className="h-10 w-36" />
                </div>
              </>
            ) : (
              // ----------- CONTENT -----------
              <>
                {/* Header -------------------------------------------------- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h1 className="text-2xl font-bold text-gray-900" />
                  <div className="flex w-full items-center justify-between flex-wrap gap-3">
                    {/* Paste Button */}
                    <button
                      type="button"
                      title="Paste"
                      onClick={handlePasteTemplate}
                      className="rounded-md border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition"
                    >
                      <ClipboardPaste className="h-5 w-5" />
                    </button>

                    {/* Cancel & Submit Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => router.push("/dashboard/details")}
                        type="button"
                        disabled={uploading || loading}
                        className="cursor-pointer w-full md:w-auto rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => formik.handleSubmit()}
                        type="button"
                        disabled={uploading || loading}
                        className="cursor-pointer w-full md:w-auto rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Save Details
                      </button>
                    </div>
                  </div>
                </div>

                {/* Body -------------------------------------------------- */}
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Basic Information
                </h2>

                <form
                  onSubmit={formik.handleSubmit}
                  className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5"
                >
                  {/* -------------------- USER SELECT -------------------- */}
                  <div className="flex flex-col md:col-span-2">
                    <label className="text-sm font-medium mb-1">
                      Select user
                    </label>
                    <div className="relative">
                      <select
                        name="user_id"
                        value={formik.values.user_id}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className="appearance-none w-full rounded-md border border-gray-300 bg-white py-2 px-3 pr-10 text-sm text-gray-900"
                      >
                        <option disabled value="">
                          Choose user
                        </option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.title}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        ▼
                      </div>
                    </div>
                    {formik.touched.user_id && formik.errors.user_id && (
                      <span className="text-sm text-red-600 mt-1">
                        {formik.errors.user_id as string}
                      </span>
                    )}
                  </div>

                  {/* -------------------- FILE UPLOAD -------------------- */}
                  <div>
                    <label className="text-sm font-medium mb-1">
                      Upload Attachments (max 10 files)
                    </label>
                    <div
                      {...getRootProps({
                        className:
                          "border-2 border-dashed rounded-md p-4 flex items-center justify-center text-sm text-gray-600 bg-gray-50 cursor-pointer hover:bg-gray-100",
                      })}
                    >
                      <input {...getInputProps()} />
                      {isDragActive ? (
                        <p>Drop files here ...</p>
                      ) : (
                        <p>Drag 'n' drop files here, or click to select</p>
                      )}
                    </div>
                    <ul className="mt-2 space-y-1">
                      {uploadedFiles.map((file, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="truncate max-w-xs">{file.name}</span>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-4 w-4 text-gray-600 hover:text-blue-600" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = uploadedFiles.filter(
                                (_, i) => i !== idx
                              );
                              setUploadedFiles(updated);
                            }}
                          >
                            <X className="h-4 w-4 text-gray-500 hover:text-red-600" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* -------------------- RICH TEXT -------------------- */}
                  <div className="flex flex-col md:col-span-2">
                    <label className="text-sm font-medium mb-1">Detail</label>
                    <EditorContent editor={editor} />
                    {formik.touched.content && formik.errors.content && (
                      <span className="text-sm text-red-600 mt-1">
                        {formik.errors.content as string}
                      </span>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
