// app/dashboard/contactus/page.jsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { FileText, Info, Trash2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Modal from "../_components/Modal";
import { Card, CardContent } from "@/components/ui/card";
import { exportToExcel } from "@/lib/exportToExcel";
import { showToast } from "@/hooks/useToast";
import PaginationBar from "../_components/Pagination";
import DeleteModal2 from "../_components/DeleteModal2";
import { Input } from "@/components/ui/input";

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string | null;
  created_at: string;
  [key: string]: any;
};

export default function ContactUsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // single delete dialog (existing)
  const [pendingId, setPendingId] = useState<string | null>(null);
  const confirmOpen = pendingId !== null;

  // pagination
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.ceil(total / limit);

  // view modal
  const [isOpen, setIsOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<any>(null);

  // existing delete modal wrapper
  const [isOpenDeleted, setIsOpenDeleted] = useState(false);
  const [rowData, setRowData] = useState<any>(null);
  const [deleteRefresh, setDeleteRefresh] = useState<any>(null);
  const handleRefresh = () => {
    setPage(1);
    setDeleteRefresh(Math.random());
  };

  // NEW: bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // fetch data
  useEffect(() => {
    async function fetchContacts() {
      setLoading(true);
      try {
        const { data, error, count } = await supabaseBrowser
          .from("contact_us_messages")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (error) throw new Error(error.message);

        setContacts((data || []) as Contact[]);
        setTotal(count || 0);
      } catch (err: any) {
        console.error("Failed to fetch contact data:", err);
        setError(err.message || "Failed to load contacts. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, [page, deleteRefresh, limit]);

  // filter (client-side)
  const filteredContacts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return contacts.filter((c) =>
      (c.name || "").toLowerCase().includes(term) ||
      (c.email || "").toLowerCase().includes(term) ||
      (c.subject || "").toLowerCase().includes(term)
    );
  }, [contacts, searchTerm]);

  // clear selection when page/contacts change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [contacts, page, limit]);

  // single delete (existing)
  async function confirmDelete() {
    if (!pendingId) return;

    const id = pendingId;
    setPendingId(null);
    setContacts((prev) => prev.filter((s) => s.id !== id)); // optimistic

    const { error } = await supabaseBrowser
      .from("contact_us_messages")
      .delete()
      .eq("id", id);

    if (error) {
      showToast({ title: "Error", description: error.message });
      setDeleteRefresh(Math.random());
    } else {
      showToast({ title: "Success", description: "Message deleted" });
    }
  }

  // export (unchanged)
  const handleExportFile = async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from("contact_us_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error("Something went wrong!");
      await exportToExcel(data, "contact_inquiries");
    } catch (error) {
      showToast({ title: "Error", description: "Something went wrong!" });
    }
  };

  // selection helpers
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allCurrentSelected =
    filteredContacts.length > 0 &&
    filteredContacts.every((c) => selectedIds.has(c.id));

  const toggleAllCurrent = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allCurrentSelected) {
        filteredContacts.forEach((c) => next.delete(c.id));
      } else {
        filteredContacts.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  // bulk delete
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBulkDeleteOpen(false);
    setLoading(true);
    try {
      const { error } = await supabaseBrowser
        .from("contact_us_messages")
        .delete()
        .in("id", ids);

      if (error) throw error;

      showToast({ title: "Success", description: "Selected messages deleted" });
      setDeleteRefresh(Math.random());
    } catch (err: any) {
      console.error(err);
      showToast({ title: "Error", description: err.message || "Bulk delete failed" });
    } finally {
      setLoading(false);
    }
  };

  // --- Skeleton while loading (hides search/table/actions) ---
  if (loading) {
    return (
      <main className="min-h-screen p-4">
        <div className="space-y-4">
          {/* top bar skeleton */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="h-10 bg-gray-100 animate-pulse rounded-md w-full md:max-w-md" />
            <div className="h-10 bg-gray-100 animate-pulse rounded-md w-40 md:ml-auto" />
          </div>

          {/* table header skeleton */}
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <div className="border-b p-3">
              <div className="h-6 w-3/4 bg-gray-100 animate-pulse rounded" />
            </div>
            {/* rows */}
            <div className="divide-y">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-4 p-4">
                  <div className="col-span-1 h-4 bg-gray-100 animate-pulse rounded" />
                  <div className="col-span-1 h-4 bg-gray-100 animate-pulse rounded" />
                  <div className="col-span-1 h-4 bg-gray-100 animate-pulse rounded" />
                  <div className="col-span-2 h-4 bg-gray-100 animate-pulse rounded" />
                  <div className="col-span-1 h-4 bg-gray-100 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* pagination skeleton */}
          <div className="flex items-center justify-end gap-2">
            <div className="h-8 w-24 bg-gray-100 animate-pulse rounded" />
            <div className="h-8 w-24 bg-gray-100 animate-pulse rounded" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 bg-red-800 bg-opacity-30 border border-red-700 rounded-lg">
        <p className="text-red-400 text-lg">Error: {error}</p>
      </div>
    );
  }

  return (
    <>
      <div>
        {/* Top Bar: Search + Bulk Delete */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
          <form onSubmit={(e) => e.preventDefault()} className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Name, Email or Subject..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </form>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
              disabled={selectedIds.size === 0}
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedIds.size})
            </Button>
          </div>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="flex flex-col justify-center items-center text-gray-900 p-6">
            <FileText className="w-16 h-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Data Found</h2>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow-md lg:w-full md:w-full w-[320px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all on page"
                      checked={
                        filteredContacts.length > 0 &&
                        filteredContacts.every((c) => selectedIds.has(c.id))
                      }
                      onChange={() => {
                        const allSelected =
                          filteredContacts.length > 0 &&
                          filteredContacts.every((c) => selectedIds.has(c.id));
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (allSelected) {
                            filteredContacts.forEach((c) => next.delete(c.id));
                          } else {
                            filteredContacts.forEach((c) => next.add(c.id));
                          }
                          return next;
                        });
                      }}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContacts.map((contact) => {
                  const isChecked = selectedIds.has(contact.id);
                  return (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${contact.name ?? contact.email}`}
                          checked={isChecked}
                          onChange={() => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(contact.id)) next.delete(contact.id);
                              else next.add(contact.id);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contact.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {contact.email}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contact.phone}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-pre-wrap break-words">
                        {contact.message}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(contact.created_at))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-4">
                          <Button
                            disabled={loading}
                            onClick={() => {
                              setIsOpenDeleted(true);
                              setRowData(contact);
                            }}
                            className="cursor-pointer p-2 rounded-md bg-gray-100 text-red-500 hover:bg-gray-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <button
                            disabled={loading}
                            onClick={() => {
                              setSelectedData(contact);
                              setIsOpen(true);
                            }}
                            className="cursor-pointer p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-auto">
              <PaginationBar
                page={page}
                setPage={setPage}
                totalPage={totalPages}
                totalRecord={total}
                limit={limit}
                setLimit={setLimit}
              />
            </div>

            {/* Existing single delete confirm (kept) */}
            <Dialog open={confirmOpen} onOpenChange={(o) => !o && setPendingId(null)}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Delete message?</DialogTitle>
                </DialogHeader>

                <p className="text-sm text-gray-600">
                  This action can’t be undone. The message will be permanently removed.
                </p>

                <DialogFooter className="mt-6">
                  <Button variant="outline" className="cursor-pointer" onClick={() => setPendingId(null)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={confirmDelete} className="cursor-pointer">
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Existing delete modal wrapper */}
      <DeleteModal2
        rowData={rowData}
        isOpen={isOpenDeleted}
        setIsOpen={setIsOpenDeleted}
        setRowData={setRowData}
        name="contact_us_messages"
        handleRefresh={handleRefresh}
      />

      {/* View modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <Card className="max-w-md w-full mx-auto shadow-md border mt-5 p-4 rounded-2xl bg-white">
          <CardContent className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Contact Details</h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-700">
              <div className="font-medium">Name:</div>
              <div>{selectedData?.name}</div>

              <div className="font-medium">Email:</div>
              <div>
                <a href={`mailto:${selectedData?.email}`} className="text-blue-600 hover:underline">
                  {selectedData?.email}
                </a>
              </div>

              <div className="font-medium">Phone Number:</div>
              <div>{selectedData?.phone}</div>

              <div className="font-medium">Message:</div>
              <div>{selectedData?.message}</div>
            </div>
          </CardContent>
        </Card>
      </Modal>

      {/* Bulk delete confirmation */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Messages</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            You are about to delete <span className="font-semibold">{selectedIds.size}</span>{" "}
            message(s). This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
              Delete Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
