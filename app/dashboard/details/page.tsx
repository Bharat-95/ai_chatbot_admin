// app/dashboard/invoices/page.jsx
"use client";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import {
  FileText,
  CalendarDays,
  DollarSign,
  Plus,
  Search,
  Calendar,
  Info,
  Trash2,
  Download,
  Eye,
  Edit, // Import the Edit icon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import Modal from "../_components/Modal";
import { exportToExcel } from "@/lib/exportToExcel";
import { showToast } from "@/hooks/useToast";
import PaginationBar from "../_components/Pagination";
import DeleteModal from "../_components/DeleteModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"; // Import Dialog components
import { Input } from "@/components/ui/input"; // Import Input component
import { Textarea } from "@/components/ui/textarea"; // Import Textarea for content

// Type for your actual detail data from the 'details' table
// This should match the structure of your Supabase 'details' table, including 'users' relation
type DetailData = {
  id: string;
  content: string | null; // Content can be null
  attachments?: { name: string; url: string }[] | null; // Attachments can be null
  created_at: string;
  users: {
    id: string;
    email: string;
    display_name?: string | null;
    full_name?: string | null;
    subscription?: string | null;
    phone?: string | null;
  } | null; // users can be null if join fails or user doesn't exist
  saleAmount?: number | null; // Example of other fields you might have
  commission_amount?: number | null; // Example of other fields you might have
  status?: string | null; // Example of other fields you might have
  [key: string]: any; // Allows for other properties that might be returned
};

export default function InvoicesPage() {
  const router = useRouter();
  const [isFileOpen, setIsFileOpen] = useState<boolean>(false);
  // Corrected type: `any[]` is fine, but ensure you always pass an array.
  const [fileDetails, setFileDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInvoice, setInvoice] = useState<DetailData[]>([]); // Corrected type for fetched data
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(""); // This status seems to be for 'details' table
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isOpen, setIsOpen] = useState(false); // For view details modal
  const [selectedData, setSelectedData] = useState<DetailData | null>(null); // Corrected type

  const [isOpenDeleted, setIsOpenDeleted] = useState(false);
  const [rowData, setRowData] = useState<any>(null); // For delete modal
  const [deleteRefresh, setDeleteRefresh] = useState<any>(null);

  // NEW STATES FOR EDITING
  const [isEditing, setIsEditing] = useState(false);
  const [editDetail, setEditDetail] = useState<DetailData | null>(null);
  const [saving, setSaving] = useState(false); // For save button loading state

  const handleRefresh = () => {
    setPage(1);
    setDeleteRefresh(Math.random()); // Trigger re-fetch
  };

  const [invoiceStats, setInvoiceStats] = useState<any>({
    totalInvoice: 0,
    totalAmount: 0,
    conmissionearned: 0,
  });

  // Filter change handler
  const handleFilterChange = (setter: Function, value: any) => {
    setter(value);
    setPage(1); // reset page on filter
  };

  // Fetch actual data from 'details' table
  useEffect(() => {
    const handleFetchDetails = async () => {
      setLoading(true);
      try {
        let query = supabaseBrowser
          .from("details")
          .select("*, users(*)", {
            count: "exact",
          })
          .order("created_at", { ascending: false });

        // Apply filters
        if (search) {
          query = query.or(
            `users.email.ilike.%${search}%,users.display_name.ilike.%${search}%,users.full_name.ilike.%${search}%,content.ilike.%${search}%`
          );
        }

        if (status && status !== "all") {
          query = query.eq("status", status); // Assuming 'status' column exists in 'details' table
        }

        if (selectedDate) {
          // Format date for Supabase query to match 'YYYY-MM-DDTHH:MM:SSZ'
          const dateString = selectedDate.toISOString().split("T")[0];
          query = query
            .gte("created_at", `${dateString}T00:00:00Z`)
            .lte("created_at", `${dateString}T23:59:59Z`);
        }

        // Apply pagination
        query = query.range((page - 1) * limit, page * limit - 1);

        const { data, error, count } = await query;

        if (error) {
          console.error("Supabase fetch error:", error);
          setError(error.message);
        } else {
          setInvoice(data as DetailData[]);
          setTotal(count || 0); // Set total count of records
        }
      } catch (error: any) {
        console.error("Failed to fetch detail data:", error);
        setError(error.message || "Failed to fetch detail data");
      } finally {
        setLoading(false);
      }
    };
    handleFetchDetails();
  }, [page, search, status, selectedDate, deleteRefresh, limit]);

  // Fetch invoice stats (this seems to be separate from the main table data)
  useEffect(() => {
    const handleInvoiceData = async () => {
      try {
        const { data, error } = await supabaseBrowser
          .from("details") // This table name seems to be correct for details
          .select("saleAmount, commission_amount", { count: "exact" }); // Select only needed columns for stats

        if (error) {
          console.error("Error fetching invoice stats:", error);
          return;
        }

        const totalInvoice = data?.length || 0;
        let totalAmount = 0;
        let commissionEarned = 0;

        data?.forEach((w) => {
          totalAmount += Number(w?.saleAmount || 0);
          commissionEarned += Number(w?.commission_amount || 0);
        });

        setInvoiceStats({
          totalInvoice,
          totalAmount,
          conmissionearned: commissionEarned,
        });
      } catch (error) {
        console.error("Error in handleInvoiceData:", error);
      }
    };
    handleInvoiceData();
  }, [deleteRefresh]); // Add deleteRefresh to dependency to update stats after delete

  const handleExportFile = async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from("details")
        .select("*, users(*)") // Select all data for export, including user details
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error("Failed to fetch data for export!");
      }

      // Flatten the data for Excel export if 'users' is nested
      const flattenedData = data.map((item) => ({
        ...item,
        user_id: item.users?.id,
        user_email: item.users?.email,
        user_name: item.users?.display_name || item.users?.full_name,
        user_phone: item.users?.phone,
        user_subscription: item.users?.subscription,
        // Remove the nested 'users' object if you want a flat table
        users: undefined,
        // Convert content from HTML to plain text for better Excel readability
        content_plain: item.content
          ? new DOMParser().parseFromString(item.content, "text/html").body
              .textContent
          : "",
      }));

      await exportToExcel(flattenedData, "details_report"); // Use a specific filename
      showToast({
        title: "Success",
        description: "Data exported successfully!",
      });
    } catch (error: any) {
      console.error("Export error:", error);
      showToast({
        type: "error",
        title: "Error",
        description: error?.message || "Something went wrong during export!",
      });
    }
  };

  const handleFileOpened = (url: string) => {
    if (!url) {
      return showToast({
        type: "error",
        title: "Error",
        description: "File Not Found.",
      });
    }
    return window.open(url, "_blank", "noopener,noreferrer");
  };

  // Function to open the edit dialog
  const handleEditClick = (detail: DetailData) => {
    // Convert HTML content to plain text when setting for editing
    const plainTextContent = detail.content
      ? new DOMParser().parseFromString(detail.content, "text/html").body
          .textContent || ""
      : "";
    setEditDetail({ ...detail, content: plainTextContent });
    setIsEditing(true);
  };

  const handleDownloadFileInNewWindow = async (url: string, filename: string) => {
    // Attempt to open a new, blank window/tab first
    const newWindow = window.open('about:blank', '_blank');

    if (!newWindow) {
      showToast({
        type: "error",
        title: "Error",
        description: "Pop-ups blocked or failed to open new window. Please allow pop-ups for this site to download files.",
      });
      return; // Stop if new window couldn't be opened
    }

    try {
      // Fetch the file content
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob(); // Get the file content as a Blob

      // Create a temporary URL for the blob
      const blobUrl = URL.createObjectURL(blob);

      // Create a temporary anchor element within the new window's document
      const a = newWindow.document.createElement('a');
      a.href = blobUrl;
      a.download = filename; // Set the download attribute with the desired filename
      newWindow.document.body.appendChild(a);

      // Programmatically click the link
      a.click();

      // Clean up: Remove the temporary link and revoke the blob URL
      newWindow.document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl); // Release the memory associated with the blob URL

      // You might want to close the new window if the download starts immediately
      // Forcing close immediately might prevent the download prompt in some browsers,
      // so it's often better to let the user close it after the download starts.
      // newWindow.close(); // Uncomment with caution if needed
      showToast({
        title: "Success",
        description: "Download initiated in a new window.",
      });

    } catch (error: any) {
      console.error("Error during download:", error);
      // Close the new window if an error occurred before download started
      if (newWindow && !newWindow.closed) {
        newWindow.close();
      }
      showToast({
        type: "error",
        title: "Error",
        description: `Failed to download file: ${error.message || "Unknown error"}`,
      });
    }
  };

  // Function to handle saving edited details
  const handleSaveEditedDetails = async () => {
    if (!editDetail || !editDetail.id) return; // Ensure editDetail and its id exist

    setSaving(true);
    try {
      // Option to convert back to a simple HTML paragraph for storage
      // If your 'content' column in Supabase is meant to store HTML,
      // and you want to preserve basic formatting (like newlines becoming <br>).
      // If you prefer to store plain text moving forward, you can just use `editDetail.content`.
      const contentToSave = editDetail.content
        ? `<p>${editDetail.content.replace(/\n/g, "<br>")}</p>` // Simple conversion for new lines to <br> and wrapped in <p>
        : null;

      const { error } = await supabaseBrowser
        .from("details")
        .update({
          content: contentToSave, // Use the converted HTML content for saving
          status: editDetail.status,
          // Add other fields you want to make editable here
          // saleAmount: editDetail.saleAmount,
          // commission_amount: editDetail.commission_amount,
        })
        .eq("id", editDetail.id);

      if (error) {
        throw new Error(error.message);
      }

      showToast({
        title: "Success",
        description: "Details updated successfully!",
      });
      setIsEditing(false);
      setEditDetail(null);
      handleRefresh(); // Re-fetch data to reflect changes
    } catch (err: any) {
      console.error("Error updating details:", err);
      showToast({
        type: "error",
        title: "Error",
        description: err.message || "Failed to update details.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && dataInvoice.length === 0) {
    // Show full loading screen only if no data is present yet
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-screen">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-800">Loading...</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm">
          Please wait while we fetch the latest data for you.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 bg-red-100 border border-red-400 text-red-700 rounded-lg">
        <p className="text-lg">Error: {error}</p>
        <Button onClick={() => setError(null)} className="mt-4">
          Clear Error
        </Button>
      </div>
    );
  }

  return (
    <>
      <section className="flex-1 overflow-y-auto lg:w-full md:w-full w-[320px] ">
        {/* Filter Actions and Add Button */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-lg mb-4 sm:mb-0">Details List</h3>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/dashboard/details/create")}
                className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md px-4 py-2"
              >
                <Plus size={16} /> Create New Details
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
            <div className="flex-1 mb-3 sm:mb-0 relative">
              <input
                type="search"
                placeholder="Search by email or content..."
                value={search}
                onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                className="lg:w-full md:w-full w-[280px] rounded-md border border-gray-200 py-2 pl-10 pr-4 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
            </div>
            <select
              value={status}
              onChange={(e) => handleFilterChange(setStatus, e.target.value)}
              className="border border-gray-200 rounded-md py-2 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3 sm:mb-0 lg:w-full md:w-full w-[280px]"
            >
              <option value="all">All Status</option>
              {/* Assuming these are the statuses you have, adjust as needed */}
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
            <div className="relative">
              <div className="flex items-center gap-2 border border-gray-200 rounded-md py-2 px-3 text-sm text-gray-700 bg-white lg:w-full md:w-full w-[280px]">
                <Calendar size={16} className="text-gray-400" />
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    setPage(1); // reset pagination on date change
                  }}
                  placeholderText="Choose Date"
                  dateFormat="MMM d, yyyy"
                  className="outline-none bg-transparent w-full"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto lg:w-full md:w-full w-[320px]">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: limit }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 bg-gray-100 animate-pulse rounded-md"
                  ></div>
                ))}
              </div>
            ) : dataInvoice.length === 0 ? (
              <div className="flex flex-col justify-center items-center text-gray-900 p-6">
                <FileText className="w-16 h-16 text-gray-400 mb-4" />
                <div className="text-2xl font-semibold mb-2">
                  No details found
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Try adjusting your filters or clearing your search.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-sm text-gray-700 border border-gray-200 rounded-md ">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Name", "Email", "Content", "File", "Actions"].map(
                      (heading) => (
                        <th key={heading} className="py-3 px-4 font-semibold">
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {dataInvoice.map((row) => (
                    <tr key={row?.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        {row?.users?.display_name ||
                          row?.users?.full_name ||
                          "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        {row?.users?.email || "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <div
                          dangerouslySetInnerHTML={{
                            __html:
                              (row?.content?.slice(0, 30) || "") +
                              ((row?.content?.length || 0) > 30 ? "..." : ""),
                          }}
                        />
                      </td>
                      <td className="py-3 px-4">
                        {row?.attachments && row.attachments.length > 0 ? (
                          <span
                            className="cursor-pointer text-blue-600 hover:underline"
                            onClick={() => {
                              // FIX: Provide a default empty array if attachments is null/undefined
                              setIsFileOpen(true);
                              setFileDetails(row.attachments || []);
                            }}
                          >
                            View ({row.attachments.length})
                          </span>
                        ) : (
                          "No Files"
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {/* Edit Button */}
                          <button
                            disabled={loading}
                            onClick={() => handleEditClick(row)}
                            className="cursor-pointer p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {/* Info Button */}
                          <button
                            disabled={loading}
                            onClick={() => {
                              setSelectedData(row);
                              setIsOpen(true);
                            }}
                            className="cursor-pointer p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-gray-200 p-2"
                            onClick={() => {
                              setIsOpenDeleted(true);
                              setRowData(row);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-auto">
            <PaginationBar
              page={page}
              setPage={setPage}
              totalPage={Math.ceil(total / limit)} // Use total here
              totalRecord={total}
              limit={limit}
              setLimit={setLimit}
            />
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal (using your existing DeleteModal component) */}
      <DeleteModal
        rowData={rowData}
        isOpen={isOpenDeleted}
        setIsOpen={setIsOpenDeleted}
        setRowData={setRowData}
        name="details" // Ensure this matches your Supabase table name
        handleRefresh={handleRefresh}
      />

      {/* View Details Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="mt-5 mb-5 max-w-md mx-auto bg-white shadow-md rounded-xl max-h-[80vh] overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Details Summary
          </h2>
          <div className="text-sm text-gray-700 space-y-4">
            <div className="flex justify-between items-start">
              <span className="font-medium">Name :</span>
              <span className="text-right">
                {selectedData?.users?.display_name ||
                  selectedData?.users?.full_name ||
                  "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-medium">User ID :</span>
              <span className="text-right">
                {selectedData?.users?.id || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-medium">User Email :</span>
              <span className="text-right">
                {selectedData?.users?.email || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-medium">Subscription :</span>
              <span className="text-right">
                {selectedData?.users?.subscription || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-medium">Phone No. :</span>
              <span className="text-right">
                {selectedData?.users?.phone || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-medium">Created At :</span>
              <span className="text-right">
                {selectedData?.created_at
                  ? new Date(selectedData.created_at).toLocaleString()
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-medium">Files :</span>
              {selectedData?.attachments &&
              selectedData.attachments.length > 0 ? (
                <span
                  className="cursor-pointer text-blue-600 hover:underline text-right"
                  onClick={() => {
                    // FIX: Provide a default empty array if attachments is null/undefined
                    setIsFileOpen(true);
                    setFileDetails(selectedData.attachments || []);
                  }}
                >
                  View ({selectedData.attachments.length})
                </span>
              ) : (
                <span className="text-right">No Files</span>
              )}
            </div>
            <div>
              <span className="font-medium block mb-2">Detail Content:</span>
              <div
                className="prose max-w-none prose-table:table-auto prose-th:font-semibold prose-th:text-left p-2 border rounded-md bg-gray-50"
                dangerouslySetInnerHTML={{
                  __html: selectedData?.content || "N/A",
                }}
              />
            </div>
            {/* Add more fields here if needed */}
          </div>
        </div>
      </Modal>

      {/* File View Modal */}
      <Modal isOpen={isFileOpen} onClose={() => setIsFileOpen(false)}>
        <div className="mt-5 mb-5 max-w-md mx-auto bg-white shadow-md rounded-xl max-h-[80vh] overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Document Lists
          </h2>
          <div className="text-sm text-gray-700 space-y-4">
            <ul className="mt-2 space-y-2">
              {fileDetails?.length > 0 ? (
                fileDetails.map((file, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-3 p-2 bg-gray-50 border rounded-md"
                  >
                    <span className="truncate flex-1 font-medium">
                      {file.name}
                    </span>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                      title="View File"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                  <button
                      onClick={() => handleDownloadFileInNewWindow(file.url, file.name)}
                      className="text-green-600 hover:text-green-800 p-0 m-0 bg-transparent border-none cursor-pointer" // Style as button
                      title="Download File"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </li>
                ))
              ) : (
                <p>No files attached.</p>
              )}
            </ul>
          </div>
        </div>
      </Modal>

      {/* Edit Detail Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
          {" "}
          {/* Added overflow-y-auto and max-h */}
          <DialogHeader>
            <DialogTitle>Edit Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Display User Name/Email (read-only) */}
            <div>
              <label
                htmlFor="userName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                User Name
              </label>
              <Input
                id="userName"
                value={
                  editDetail?.users?.display_name ||
                  editDetail?.users?.full_name ||
                  ""
                }
                disabled
                className="bg-gray-100"
              />
            </div>
            <div>
              <label
                htmlFor="userEmail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                User Email
              </label>
              <Input
                id="userEmail"
                value={editDetail?.users?.email || ""}
                disabled
                className="bg-gray-100"
              />
            </div>
            {/* Editable Content */}
            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Content
              </label>
              <Textarea
                id="content"
                value={editDetail?.content || ""} // This will now display plain text
                onChange={(e) =>
                  setEditDetail((prev) =>
                    prev ? { ...prev, content: e.target.value } : null
                  )
                }
                rows={6}
                className="min-h-[120px]"
              />
            </div>
            {/* Example for a status field (if your 'details' table has one) */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                value={editDetail?.status || ""}
                onChange={(e) =>
                  setEditDetail((prev) =>
                    prev ? { ...prev, status: e.target.value } : null
                  )
                }
                className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setEditDetail(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEditedDetails} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
