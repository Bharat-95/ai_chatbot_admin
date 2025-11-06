"use client";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import {
  FileText,
  CalendarDays,
  DollarSign,
  Plus,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info,
  Trash2,
  Download,
  Recycle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import DatePicker from "react-datepicker";
import Modal from "../_components/Modal";
import { exportToExcel } from "@/lib/exportToExcel";
import { showToast } from "@/hooks/useToast";
import PaginationBar from "../_components/Pagination";
import DeleteModal from "../_components/DeleteModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { DialogFooter, DialogHeader } from "@/components/ui/dialog";
import JsonViewer from "../_components/JsonViewer";
import { displayValidTill } from "@/lib/dateTimeFormatter";

type Recycle = {
  id: string;
  name: string;
  data: any;
  created_at: string;
};
const KeyNums: any = {
  contact_us_messages: "Contact us messages",
  invoice: "invoice",
  seminar_registration: "Seminar registration",
  seminar_signup: "Seminar signup",
  seminars: "Seminars",
  subscription: "Subscription",
  user_subscription: "User subscription",
  users: "User",
  vip_tiers: "Vip tiers",
};
const ITEMS_PER_PAGE = 5;

export default function RecyclePage() {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null); // id we want to delete
  const confirmOpen = pendingId !== null;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Recycle[]>([]);
  const [dataRecycle, setDataRecycle] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  // const limit = 10;
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [isOpenDeleted, setIsOpenDeleted] = useState(false);
  const [rowData, setRowData] = useState<any>(null);
  const [deleteRefresh, setDeleteRefresh] = useState<any>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const handleRefresh = () => {
    setPage(1);

    setDeleteRefresh(Math.random());
  };

  const [recycletats, setrecycletats] = useState<any>({
    totalInvoice: 0,
    totalAmount: 0,
    conmissionearned: 0,
  });
  // Load dummy data

  const totalPages = Math.ceil(total / limit);

  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setPage(1); // reset page on filter
  };

  useEffect(() => {
    const handleFetchSeminar = async () => {
      try {
        let query = supabaseBrowser
          .from("recycle_bin")
          .select("*", {
            count: "exact",
          })
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (status && status != "all") {
          query = query.eq("status", status);
        }

        if (selectedDate) {
          query = query
            .gte("created_at", selectedDate + " 00:00:00")
            .lte("created_at", selectedDate + " 23:59:59");
        }

        const { data, error, count } = await query;

        if (error) {
          console.log(error);
          setError(error.message);
        } else {
          console.log(data, "dataRecycledataRecycledataRecycle");
          setDataRecycle(data);
          setTotal(count || 0); // Set total count of records
        }
        setLoading(false);
      } catch (error) {
        console.error(error);
        setError("Failed to fetch seminar data");
      }
    };
    handleFetchSeminar();
  }, [page, status, selectedDate, deleteRefresh, limit]);

  // Around line 70, or after your `useEffect`
  const filteredRecycleData = useMemo(() => {
    if (!searchTerm.trim()) {
      return dataRecycle; // If search term is empty, return all fetched data
    }
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return dataRecycle.filter(
      (item) =>
        item.name.toLowerCase().includes(lowercasedSearchTerm) ||
        (item.data && // Check if 'data' exists and is an object
          Object.values(item.data).some((value) =>
            String(value).toLowerCase().includes(lowercasedSearchTerm)
          ))
    );
  }, [dataRecycle, searchTerm]);

  const handleExportFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("recycle_bin")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error("Something went wrong!");
      }
      await exportToExcel(data, "recycle");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };

  async function confirmDelete() {
    try {
      if (!pendingId) return;

      const id = pendingId;
      setPendingId(null); // closes dialog immediately
      // optimistic UI

      const { error } = await supabaseBrowser
        .from("recycle_bin")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error("Something went wrong!");
          
      }
      setDeleteRefresh(Math.random());
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  }
const restroeFiled = async (data: any) => {
  setRestoreLoading(true);
  try {
    let record = { ...data?.data };

    if (data?.name == "seminar_registration" || data?.name == "seminar_signup") {
      delete record.seminars;
    }
    if (data?.name == "invoice") {
      delete record.users;
    }
    if (data?.name == "user_subscription") {
      delete record.subscription;
      delete record.users;
    }

    // Special case: restoring users with subscriptions
    if (data?.name === "users") {
      const subscriptions = record.user_subscription || [];
      delete record.user_subscription;

      // insert user first
      const { error: userError } = await supabaseBrowser
        .from("users")
        .insert([record]);

      if (userError) throw new Error(userError.message);

      // insert subscriptions if available
      if (subscriptions.length > 0) {
        const { error: subError } = await supabaseBrowser
          .from("user_subscription")
          .insert(subscriptions);

        if (subError) throw new Error(subError.message);
      }
    } else {
      // normal insert
      const { error } = await supabaseBrowser
        .from(data?.name)
        .insert([record]);

      if (error) throw new Error(error.message);
    }

    // now delete from recycle_bin
    const { error: deleteError } = await supabaseBrowser
      .from("recycle_bin")
      .delete()
      .eq("id", data.id);

    if (deleteError) throw new Error(deleteError.message);

    handleRefresh();
    showToast({
      title: "Success",
      description: "Data restored successfully.",
    });
  } catch (error) {
    console.error(error);
    showToast({
      title: "Error",
      description: "Something went wrong while restoring!",
    });
  } finally {
    setRestoreLoading(false);
  }
};


  return (
    <>
     <div className="text-center text-sm text-gray-600 font-medium mb-4 lg:w-full md:w-full w-[320px] ">
          Data older than 30 days will be removed automatically
        </div>
      <div className="relative flex-1 mb-5 px-2 lg:w-full md:w-full w-[320px] ">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        {/* Search input field remains unchanged, as per your request */}
        <Input
          placeholder="Search by Name..."
          className="pl-9"
          value={searchTerm}
          disabled={loading}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <section className="flex-1 overflow-y-auto p-2 sm:p-2 lg:w-full md:w-full w-[320px]">
        {/* <h2 className="font-semibold text-lg mb-6">Recycle Management</h2> */}
        {/* <div className="flex justify-end mb-4">
          <button
            onClick={() => handleExportFile()}
            className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
        </div> */}
        {/* Filter Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col gap-4">
          {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-lg mb-4 sm:mb-0">
              Recycle Generated List
            </h3>
          </div> */}

          {/* <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
            <div className="flex-1 mb-3 sm:mb-0 relative">
              <input
                type="search"
                placeholder="Search by name"
                value={search}
                onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                className="w-full rounded-md border border-gray-200 py-2 pl-10 pr-4 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
            </div>
            <select
              value={status}
              onChange={(e) => handleFilterChange(setStatus, e.target.value)}
              className="border border-gray-200 rounded-md py-2 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3 sm:mb-0"
            >
              <option value="all">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
            </select>
            <div className="relative">
              <div className="flex items-center gap-2 border border-gray-200 rounded-md py-2 px-3 text-sm text-gray-700 bg-white w-full sm:w-auto">
                <Calendar size={16} className="text-gray-400" />
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    setPage(1); // reset pagination if needed
                  }}
                  placeholderText="Choose Date"
                  dateFormat="MMM d, yyyy"
                  className="outline-none bg-transparent w-full"
                />
              </div>
            </div>
          </div> */}

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 bg-gray-100 animate-pulse rounded-md"
                  ></div>
                ))}
              </div>
            ) : filteredRecycleData.length === 0 ? (
              <div className="text-center text-gray-500 py-6">
                {searchTerm.trim()
                  ? "No results found for your search."
                  : "No Data found."}
              </div>
            ) : (
              <table className="w-full text-left text-sm text-gray-700 border border-gray-200 rounded-md">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Name", "Deleted At", "Remove At", "Actions"].map(
                      (heading) => (
                        <th key={heading} className="py-3 px-4 font-semibold">
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecycleData.map((row) => (
                    <tr key={row?.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">{KeyNums[row?.name]}</td>
                      <td className="py-3 px-4">
                        {displayValidTill(row?.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        {displayValidTill(row?.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer hover:bg-gray-200"
                          onClick={() => {
                            setPendingId(row?.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer hover:bg-gray-200"
                          onClick={() => {
                            restroeFiled(row);
                          }}
                        >
                          <Recycle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer hover:bg-gray-200"
                          onClick={() => {
                            setSelectedData(row);
                            setIsOpen(true);
                          }}
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
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
        </div>
        <Dialog
          open={pendingId != null}
          onOpenChange={(o) => !o && setPendingId(null)}
        >
          <DialogContent className="sm:max-w-sm fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-xl rounded-2xl p-6 z-50 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-800">
                Delete seminar?
              </DialogTitle>
            </DialogHeader>

            <p className="text-sm text-gray-600 leading-relaxed">
              This action can’t be undone. This will be permanently removed.
            </p>

            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                className="cursor-pointer px-4 py-2"
                onClick={() => setPendingId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                className="cursor-pointer px-4 py-2"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="max-w-3xl w-full bg-white rounded-lg shadow-lg">
          <div className="max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-xl font-semibold mb-4">Subscription Details</h2>
            <JsonViewer data={selectedData} />
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                JSON.stringify(selectedData, null, 2)
              );
              showToast({
                title: "Success",
                description: "Copy Done!",
              });
            }}
            className="absolute top-4 right-4 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
          >
            Copy JSON
          </button>
        </div>
      </Modal>
    </>
  );
}
