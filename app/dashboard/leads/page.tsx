"use client";

import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Pencil, Trash2, Plus, Info, Search } from "lucide-react";
import { showToast } from "@/hooks/useToast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PaginationBar from "../_components/Pagination";

const ITEMS_PER_PAGE = 10;

interface Lead {
  id: string;
  created_date: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  convo: string | null;
  notes: string | null;
  updated_date: string | null;
  user_id: string | null;
  message_id: string | null;
  // convenience field computed client-side
  created_by_name?: string | null;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  // Bulk delete dialog
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination + search
  const [limit, setLimit] = useState(ITEMS_PER_PAGE);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / limit);
  const [searchTerm, setSearchTerm] = useState("");

  // fetch leads WITHOUT join, then batch-query users by user_id to get name
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      // basic leads query
      let query = supabaseBrowser
        .from("leads")
        .select("*", { count: "exact" })
        .order("created_date", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
        );
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("fetchLeads - leads error:", error);
        showToast({ title: "error", description: "Failed to load leads" });
        setLeads([]);
        setTotal(0);
        return;
      }

      const leadsData = (data || []) as Lead[];
      setTotal(count || 0);

      if (leadsData.length === 0) {
        setLeads([]);
        return;
      }

      // Collect unique user_ids from the page (only non-null)
      const userIdSet = new Set<string>();
      for (const l of leadsData) {
        if (l.user_id) userIdSet.add(l.user_id);
      }
      const userIds = Array.from(userIdSet);

      // If we have user_ids, batch-query users table to get names
      let usersById: Record<string, { id: string; name?: string | null }> = {};
      if (userIds.length > 0) {
        const uResp = await supabaseBrowser
          .from("users")
          .select("id, name")
          .in("id", userIds);

        if (uResp.error) {
          // If users query fails (RLS or permissions), log & continue — leads will show Unknown
          console.warn("fetchLeads - users lookup failed:", uResp.error);
        } else if (uResp.data) {
          for (const u of uResp.data) {
            usersById[u.id] = u;
          }
        }
      }

      // Map leads to include created_by_name from usersById (fallback to "Unknown")
      const mapped = leadsData.map((l) => {
        const createdBy =
          (l.user_id && usersById[l.user_id]?.name) || "Unknown";
        return { ...l, created_by_name: createdBy } as Lead;
      });

      setLeads(mapped);
    } catch (err: any) {
      console.error("fetchLeads exception:", err);
      showToast({ title: "error", description: "Something went wrong!" });
      setLeads([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchLeads();
    }, 400);
    return () => clearTimeout(handler);
  }, [fetchLeads]);

  // Clear selection whenever the current page's leads change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [leads, page, limit, searchTerm]);

  // save (insert or update)
  const handleSave = async (lead: Lead) => {
    let result;
    if (lead.id) {
      result = await supabaseBrowser
        .from("leads")
        .update({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          convo: lead.convo,
          notes: lead.notes,
          updated_date: new Date().toISOString(),
        })
        .eq("id", lead.id);
    } else {
      // insert new — ensure we attach the current authenticated user as user_id
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();

      const payload: any = {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        convo: lead.convo,
        notes: lead.notes,
        message_id: lead.message_id,
      };

      if (user?.id) {
        payload.user_id = user.id;
      } else if (lead.user_id) {
        // fallback to anything caller provided
        payload.user_id = lead.user_id;
      }

      result = await supabaseBrowser.from("leads").insert([payload]);
    }

    if ((result as any).error) {
      console.error((result as any).error);
      showToast({ title: "Error", description: "Save failed" });
    } else {
      showToast({ title: "Success", description: "Lead saved" });
      setEditingLead(null);
      setDialogOpen(false);
      fetchLeads();
    }
  };

  // delete single lead
  const handleDelete = async () => {
    if (!leadToDelete) return;
    const { error } = await supabaseBrowser
      .from("leads")
      .delete()
      .eq("id", leadToDelete.id);

    if (error) {
      console.error(error);
      showToast({ title: "Error", description: "Delete failed" });
    } else {
      showToast({ title: "Success", description: "Lead deleted" });
      fetchLeads();
    }

    setDeleteDialogOpen(false);
    setLeadToDelete(null);
  };

  // bulk delete
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const { error } = await supabaseBrowser
      .from("leads")
      .delete()
      .in("id", ids);

    if (error) {
      console.error(error);
      showToast({ title: "Error", description: "Bulk delete failed" });
    } else {
      showToast({ title: "Success", description: "Selected leads deleted" });
      fetchLeads();
    }

    setBulkDeleteDialogOpen(false);
  };

  // Selection helpers
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const areAllCurrentPageSelected =
    leads.length > 0 && leads.every((l) => selectedIds.has(l.id));

  const toggleSelectAllCurrentPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (areAllCurrentPageSelected) {
        // Unselect all current page
        leads.forEach((l) => next.delete(l.id));
      } else {
        // Select all current page
        leads.forEach((l) => next.add(l.id));
      }
      return next;
    });
  };

  // Early return while loading → hides search, table, buttons
  if (loading) {
    return (
      <main className="min-h-screen p-4">
        <div className="space-y-3">
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <div
              key={i}
              className="h-10 bg-gray-100 animate-pulse rounded-md"
            />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative">
      {/* Top bar: Search + Bulk Delete */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between mb-6">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="relative w-full md:max-w-md"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Name, Email, or Phone..."
            className="pl-9 pr-4 py-2 border rounded-md w-full"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
              setLoading(true); // instant skeleton while debouncing fetch
            }}
          />
        </form>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            disabled={selectedIds.size === 0}
            onClick={() => setBulkDeleteDialogOpen(true)}
          >
            <Trash2 size={16} className="mr-1" />
            Delete Selected ({selectedIds.size})
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Select all leads on this page"
                  checked={areAllCurrentPageSelected}
                  onChange={toggleSelectAllCurrentPage}
                />
              </th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Created By</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const checked = selectedIds.has(lead.id);
              return (
                <tr
                  key={lead.id}
                  className="border-b last:border-none hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select lead ${lead.name ?? lead.id}`}
                      checked={checked}
                      onChange={() => toggleSelectOne(lead.id)}
                    />
                  </td>
                  <td className="px-4 py-3">{lead.name}</td>
                  <td className="px-4 py-3">{lead.email}</td>
                  <td className="px-4 py-3">{lead.phone}</td>
                  <td className="px-4 py-3">
                    {lead.created_date
                      ? new Date(lead.created_date).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    {lead.created_by_name ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setViewLead(lead);
                        setViewDialogOpen(true);
                      }}
                      className="p-2 text-blue-600"
                    >
                      <Info size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingLead(lead);
                        setDialogOpen(true);
                      }}
                      className="p-2"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setLeadToDelete(lead);
                        setDeleteDialogOpen(true);
                      }}
                      className="p-2 text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500">
                  No leads found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4">
        <PaginationBar
          page={page}
          setPage={setPage}
          totalPage={totalPages}
          totalRecord={total}
          limit={limit}
          setLimit={setLimit}
        />
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => {
          setEditingLead({
            id: "",
            created_date: new Date().toISOString(),
            name: "",
            email: "",
            phone: "",
            convo: "",
            notes: "",
            updated_date: null,
            user_id: null,
            message_id: null,
          });
          setDialogOpen(true);
        }}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
      >
        <Plus size={24} />
      </button>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLead?.id ? "Edit Lead" : "Add Lead"}
            </DialogTitle>
          </DialogHeader>

          {editingLead && (
            <div className="grid gap-4 py-4">
              <Input
                type="text"
                value={editingLead.name || ""}
                onChange={(e) =>
                  setEditingLead({ ...editingLead, name: e.target.value })
                }
                placeholder="Name"
              />
              <Input
                type="text"
                value={editingLead.email || ""}
                onChange={(e) =>
                  setEditingLead({ ...editingLead, email: e.target.value })
                }
                placeholder="Email"
              />
              <Input
                type="text"
                value={editingLead.phone || ""}
                onChange={(e) =>
                  setEditingLead({ ...editingLead, phone: e.target.value })
                }
                placeholder="Phone"
              />
              <Input
                type="text"
                value={editingLead.convo || ""}
                onChange={(e) =>
                  setEditingLead({ ...editingLead, convo: e.target.value })
                }
                placeholder="Conversation"
              />
              <Input
                type="text"
                value={editingLead.notes || ""}
                onChange={(e) =>
                  setEditingLead({ ...editingLead, notes: e.target.value })
                }
                placeholder="Notes"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => editingLead && handleSave(editingLead)}
              className="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Info Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {viewLead && (
            <div className="space-y-2 text-sm">
              <p>
                <strong>Name:</strong> {viewLead.name}
              </p>
              <p>
                <strong>Email:</strong> {viewLead.email}
              </p>
              <p>
                <strong>Phone:</strong> {viewLead.phone}
              </p>
              <p>
                <strong>Conversation:</strong> {viewLead.convo}
              </p>
              <p>
                <strong>Notes:</strong> {viewLead.notes}
              </p>
              <p>
                <strong>Created:</strong>{" "}
                {viewLead.created_date
                  ? new Date(viewLead.created_date).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "N/A"}
              </p>
              {viewLead.updated_date && (
                <p>
                  <strong>Updated:</strong>{" "}
                  {new Date(viewLead.updated_date).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              )}
              <p>
                <strong>Created By:</strong> {viewLead.created_by_name ?? "Unknown"}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setViewDialogOpen(false)}
              className="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog (single) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{leadToDelete?.name || "this lead"}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Leads</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            You are about to delete{" "}
            <span className="font-semibold">{selectedIds.size}</span> lead(s).
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
