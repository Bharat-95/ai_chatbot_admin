"use client";
// import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import ComingSoon from "@/components/ui/coming-soon";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Info,
  TimerIcon,
  Trash2,
} from "lucide-react";
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
import { showToast } from "@/hooks/useToast";
import { exportToExcel } from "@/lib/exportToExcel";
import PaginationBar from "./Pagination";
import DeleteModal from "./DeleteModal";
import { displayValidTill } from "@/lib/dateTimeFormatter";

type seminarRegistrationInfo = {
  id: string;
  saminarId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  seminar: string;
  seminarDate: string;
  seminarTime: string;
  omvicLicensed: string;
  employmentStatus: string;
  availability: string;
  experience: string;
  experienceDescription: string;
  gain: string;
  gainOther: string;
  remote: string;
  preference: string;
};
type seminarRegistrationUsPageProps = {
  name: string ;
  tableName: string ;
};

export default function SeminarRegistrationPage({ name,tableName }: seminarRegistrationUsPageProps) {
  const router = useRouter();
  //   const searchParams = useSearchParams();
  // const seminarId = searchParams.get("seminar_id");
  const [seminarId, setSeminarId] = useState<string | null>(null);

  //   const seminarId = useMemo(
  //     () => localStorage.getItem("seminarId"),
  //     []
  //   );
  const [seminarRegistration, setseminarRegistration] = useState<
    seminarRegistrationInfo[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isServer = typeof window === "undefined";
  const [pendingId, setPendingId] = useState<string | null>(null); // id we want to delete
  const confirmOpen = pendingId !== null;
  // const limit = 10;
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<any>(null);
  const totalPages = Math.ceil(total / limit);
  const [isOpenDeleted, setIsOpenDeleted] = useState(false);
  const [rowData, setRowData] = useState<any>(null);
  const [deleteRefresh, setDeleteRefresh] = useState<any>(null);
  const handleRefresh = () => {
    setPage(1);

    setDeleteRefresh(Math.random());
  };

  useEffect(() => {
    const id = localStorage.getItem("seminarId");
    setSeminarId(id);
  }, []);
  useEffect(() => {
    async function fetchseminarRegistration() {
      setLoading(true);
      try {
        const { data, error, count } = await supabaseBrowser
          .from(tableName)
          .select(`* ,${name}(*)`, { count: "exact" })
          .eq("saminarId", seminarId)
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (error) {
          throw new Error(error.message);
        }
        setseminarRegistration(data || []);
        setTotal(count || 0);
      } catch (err: any) {
        console.error("Failed to fetch vip tier data:", err);
        setError(
          err.message || "Failed to load vip tiers. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    }

    if (seminarId) {
      fetchseminarRegistration();
    }
  }, [page, seminarId, deleteRefresh]); // Empty dependency array means this effect runs once after the initial render

  async function confirmDelete() {
    if (!pendingId) return;

    const id = pendingId;
    setPendingId(null); // closes dialog immediately
    setseminarRegistration((prev) => prev.filter((s) => s.id !== id)); // optimistic UI

    const { error } = await supabaseBrowser
      .from("vip_tiers")
      .delete()
      .eq("id", id);

    if (error) {
      alert(`Delete failed: ${error.message}`);
      // roll back
      setseminarRegistration((prev) => [
        { ...seminarRegistration.find((s) => s.id === id)! },
        ...prev,
      ]);
    }
  }

  const handleExportFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("seminar_registration")
        .select("*", { count: "exact" })
        .eq("saminarId", seminarId)
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error("Something went wrong!");
      }
      await exportToExcel(data, "saminar_registration");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
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
      <div className="text-center p-6 bg-red-800 bg-opacity-30 border border-red-700 rounded-lg">
        <p className="text-red-400 text-lg">Error: {error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 ">
        {seminarRegistration.length === 0 ? (
          <div className="flex flex-col justify-center items-center text-gray-900 p-6">
            <FileText className="w-16 h-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Data Found</h2>
          </div>
        ) : (
          <div className="overflow-x-auto mb-2 bg-white rounded-lg shadow-md">
            {/* <div className="flex justify-end mb-4">
              <button
                onClick={() => handleExportFile()}
                className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Download size={16} />
                Export
              </button>
            </div> */}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Seminar Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Phone Number
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Created Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Seminar Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Time
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {seminarRegistration.map((registration, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registration?.firstName || ""}{" "}
                      {registration?.lastName || ""}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registration?.seminar}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        href={`mailto:${registration?.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {registration?.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registration?.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="flex items-center">
                        {" "}
                        {/* Wrapped content in a span with flex */}
                        <Calendar size={16} className="mr-1 text-blue-500" />
                        {displayValidTill(registration?.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="flex items-center">
                        {" "}
                        {/* Wrapped content in a span with flex */}
                        <Calendar size={16} className="mr-1 text-blue-500" />
                        {
                          displayValidTill(registration?.seminarDate)
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="flex items-center">
                        {" "}
                        {/* Wrapped content in a span with flex */}
                        <TimerIcon size={16} className="mr-1 text-blue-500" />
                        {registration?.seminarTime}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-4 ">
                        {/* <Pencil className="h-4 w-4 text-gray-500 hover:text-blue-600 transition-colors duration-150 cursor-pointer" />   */}
                        {/* <Trash2
                          className="h-4 w-4 text-red-500 hover:text-red-700 transition-colors duration-150 cursor-pointer"
                          onClick={() => setPendingId(seminarRegistration.id)}
                        /> */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-gray-200"
                          onClick={() => {
                            setIsOpenDeleted(true);
                            setRowData(registration);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                        <button
                          disabled={loading}
                          onClick={() => {
                            setSelectedData(registration);
                            setIsOpen(true);
                          }}
                          className="cursor-pointer p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
          </div>
        )}
      </div>
      <DeleteModal
        rowData={rowData}
        isOpen={isOpenDeleted}
        setIsOpen={setIsOpenDeleted}
        setRowData={setRowData}
        name="seminar_registration"
        handleRefresh={handleRefresh}
      />
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="mt-5 mb-5 max-w-md mx-auto p-6 bg-white shadow-md rounded-xl">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Seminar Registration Summary
          </h2>
          <div className="text-sm text-gray-700 space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">First Name:</span>
              <span>{selectedData?.firstName || ""}</span>
            </div>{" "}
            <div className="flex justify-between">
              <span className="font-medium">Last Name:</span>
              <span>{selectedData?.lastName || ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Email:</span>
              <a
                href={`mailto:${selectedData?.email || ""}`}
                className="text-blue-600 hover:underline break-all"
              >
                {selectedData?.email || ""}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Phone Number:</span>
              <span>{selectedData?.phone || ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Seminar Name:</span>
              <span>{selectedData?.seminar || ""}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Seminar Date :</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-blue-500" />
                {selectedData?.seminarDate || ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Seminar Time:</span>
              <span>{selectedData?.seminarTime || ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">
                Are you currently OMVIC licensed?:
              </span>
              <span>{selectedData?.omvicLicensed || ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Current Employment Status:</span>
              <span>{selectedData?.employmentStatus || ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Availability:</span>
              <span>{selectedData?.availability || ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">
                Do you have car sales/dealership experience?:
              </span>
              <span>{selectedData?.experience || ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Describe briefly:</span>
              <span>{selectedData?.experienceDescription || ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">
                What are you hoping to gain from DriveX?:
              </span>
              <span>{selectedData?.gain || ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Please specify:</span>
              <span>{selectedData?.gainOther || ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">
                Interested in remote work opportunities?:
              </span>
              <span>{selectedData?.remote || ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Would you prefer to::</span>
              <span>{selectedData?.preference || ""}</span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
