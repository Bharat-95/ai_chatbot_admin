"use client";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Search, Calendar, Info, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import Modal from "../_components/Modal";
import { exportToExcel } from "@/lib/exportToExcel";
import { showToast } from "@/hooks/useToast";
import PaginationBar from "../_components/Pagination";
import DeleteModal from "../_components/DeleteModal";
import { Button } from "@/components/ui/button";
import moment from "moment";

type Invoice = {
  id: string;
  invoiceId: string | null;
  dateOfSale: string | null;
  plan_name: string | null;
  amount: string | null;
  users?: {
    full_name?: string;
    email?: string;
  };
};

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [dataInvoice, setInvoice] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<Invoice | null>(null);

  const [isOpenDeleted, setIsOpenDeleted] = useState(false);
  const [rowData, setRowData] = useState<Invoice | null>(null);
  const [deleteRefresh, setDeleteRefresh] = useState<any>(null);

  const handleRefresh = () => {
    setPage(1);
    setDeleteRefresh(Math.random());
  };

  const totalPages = Math.ceil(total / limit);

  // ✅ Fetch invoices
  useEffect(() => {
    const handleFetchInvoices = async () => {
      setLoading(true);
      try {
        let query = supabaseBrowser
          .from("invoice")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        // Search filter (by invoiceId or email)
        if (search) {
          query = query.or(
            `invoiceId.ilike.%${search}%,users.email.ilike.%${search}%`
          );
        }

        // Date filter
        if (selectedDate) {
          const formattedDate = moment(selectedDate).format("YYYY-MM-DD");
          query = query.eq("dateOfSale", formattedDate);
        }

        const { data, error, count } = await query;

        if (error) {
          console.error("Supabase error:", error);
          setError(error.message);
        } else {
          setInvoice(data || []);
          setTotal(count || 0);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch invoices");
      } finally {
        setLoading(false);
      }
    };

    handleFetchInvoices();
  }, [page, search, selectedDate, deleteRefresh, limit]);

  // ✅ Export invoices
  const handleExportFile = async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from("invoice")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error("Something went wrong!");
      await exportToExcel(data, "invoices");
      showToast({ title: "Success", description: "Exported to Excel!" });
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong during export.",
      });
    }
  };

  return (
    <>
      <section className="flex-1 lg:w-full md:w-full w-[320px] overflow-y-auto ">
        <div className="bg-white border-gray-200 flex flex-col gap-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
            {/* Search */}
            <div className="flex-1 mb-3 sm:mb-0 relative w-full">
              <input
                type="search"
                placeholder="Search by invoiceId or email"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-gray-200 py-2 pl-10 pr-4 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
            </div>

            {/* Date filter */}
            <div className="relative w-48">
              <div className="flex items-center gap-2 border border-gray-200 rounded-md py-2 px-3 text-sm text-gray-700 bg-white">
                <Calendar size={16} className="text-gray-400" />
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    setPage(1);
                  }}
                  placeholderText="Choose Date"
                  dateFormat="MMM d, yyyy"
                  className="outline-none bg-transparent w-full"
                />
              </div>
            </div>

          
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
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
              <div className="text-center text-gray-500 py-6">
                No invoices found.
              </div>
            ) : (
              <table className="w-full text-left text-sm text-gray-700 border border-gray-200 rounded-md">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      "Invoice ID",
                      "Plan",
                      "Date of Sale",
                      "Amount",
                      "Actions",
                    ].map((heading) => (
                      <th key={heading} className="py-3 px-4 font-semibold">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataInvoice.map((row) => (
                    <tr key={row?.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">{row?.invoiceId}</td>
                     
                      <td className="py-3 px-4">{row?.plan_name}</td>
                      <td className="py-3 px-4">{row?.dateOfSale}</td>
                      <td className="py-3 px-4">{row?.amount}</td>
                      <td className="py-3 px-4 flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-gray-200"
                          onClick={() => {
                            setIsOpenDeleted(true);
                            setRowData(row);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
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
      </section>

      {/* Delete Modal */}
      <DeleteModal
        rowData={rowData}
        isOpen={isOpenDeleted}
        setIsOpen={setIsOpenDeleted}
        setRowData={setRowData}
        name="invoice"
        handleRefresh={handleRefresh}
      />

      {/* View Invoice Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="mt-5 mb-5 max-w-md mx-auto p-6 bg-white shadow-md rounded-xl">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Invoice Summary
          </h2>
          <div className="text-sm text-gray-700 space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">Invoice :</span>
              <span>{selectedData?.invoiceId || ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Sales User:</span>
              <span>
                {selectedData?.users?.full_name || selectedData?.users?.email}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Plan:</span>
              <span>{selectedData?.plan_name || ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Date of sale:</span>
              <span>{selectedData?.dateOfSale || ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Amount:</span>
              <span>{selectedData?.amount || ""}</span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
