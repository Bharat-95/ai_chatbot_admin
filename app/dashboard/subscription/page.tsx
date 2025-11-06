// app/(dashboard)/subscriptions/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  AlertTriangle,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  Info,
  Loader,
  Trash2,
  Download,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  useCurrentMonthSubscriptions,
  useSubscriptionStats,
} from "@/store/hooks/useSubscriptions";
import ComingSoon from "@/components/ui/coming-soon";
import { cn } from "@/lib/utils";
import { format, parseISO, set } from "date-fns";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import Modal from "../_components/Modal";
import { exportToExcel } from "@/lib/exportToExcel";
import { showToast } from "@/hooks/useToast";
import PaginationBar from "../_components/Pagination";
import DeleteModal2 from "../_components/DeleteModal2";
import { displayValidTill } from "@/lib/dateTimeFormatter";

const ITEMS_PER_PAGE = 10;

type Sub = {
  _id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    display_name: string;
  };
  plan: "starter" | "momentum" | "pro" | "elite" | "power" | "titan" | "vip";
  amount: number;
  createdAt: string; // ISO
  method: "credit card" | "debit card" | "paypal";
  status: "pending" | "paid" | "failed";
};

// const demo: Sub[] = Array.from({ length: 97 }).map((_, i) => ({
//   _id: String(i),
//   user: { firstName: `User${i}`, lastName: "Smith", email: `u${i}@mail.com` },
//   plan: ["starter", "momentum", "pro", "elite", "power", "titan", "vip"][
//     i % 7
//   ] as any,
//   amount: [299, 499, 699, 999, 1399, 1699, 2000][i % 7],
//   createdAt: new Date(Date.now() - i * 864e5).toISOString(),
//   method: ["credit card", "debit card", "paypal"][i % 3] as any,
//   status: ["pending", "paid", "failed"][i % 3] as any,
// }));
// -------------------------------------------------------------------

/* ───────────────────────── helper ───────────────────────── */
const PAGE = 10;
// const Fmt = (n: number) => `$${n.toLocaleString()}`;
const statusEnum: any = {
  payment_successful: "Successful",
  payment_pending: "Pending",
  payment_failed: "Failed",
  expired: "Expired",
};
const statusColor: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-gray-100 text-gray-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Failed: "bg-red-100 text-red-700",
};
export default function SubscriptionsTable() {
  // const [rows] = useState<Sub[]>(demo); // plug in real data
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [data, setData] = useState<any>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // const limit = 10;
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<any>(null);

  const [isOpenDeleted, setIsOpenDeleted] = useState(false);
  const [rowData, setRowData] = useState<any>(null);
  const [deleteRefresh, setDeleteRefresh] = useState<any>(null);

  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    pending: 0,
    failed: 0,
  });

  // const filtered = useMemo(
  //   () =>
  //     rows.filter(
  //       (r) =>
  //         (search === "" ||
  //           `${r.user.firstName} ${r.user.display_name} ${r.user.lastName} ${r.user.email} ${r.user.phone}`
  //             .toLowerCase()
  //             .includes(search.toLowerCase())) &&
  //         (status === "all" || r.status === status) &&
  //         (plan === "all" || r.plan === plan)
  //     ),
  //   [rows, search, status, plan]
  // );
  const totalPages = Math.ceil(total / limit);

  /* ------------- KPI quick maths ------------- */
  // const total = filtered.reduce((s, r) => s + r.amount, 0);
  // const pend = filtered.filter((r) => r.status === "pending").length;
  // const fail = filtered.filter((r) => r.status === "failed").length;

  useEffect(() => {
    const fetchData = async () => {
      try {
        let query = supabaseBrowser
          .from("user_subscription")
          .select("*, subscription:subscription_id!inner(*), users!inner(*)", {
            count: "exact",
          })
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        // Apply filters
        // if (search) {
        //   // query = query.ilike("users.display_name", `%${search}%`);
        //   query = query.or(
        //     `users.display_name.ilike.%${search}%,users.phone.ilike.%${search}%`
        //   );
        // }

        if (status) {
          query = query.eq("status", status);
        }

        if (plan) {
          query = query.eq("subscription.plan_name", plan);
        }

        const { data, error, count } = await query;

        if (error) {
          console.log("Supabase error:", error.message);
          setData([]);
          setTotal(0);
        } else {
          console.log("Supabase data:", data);
          const filteredData = search
            ? data?.filter(
                (item) =>
                  item.users?.display_name
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||
                  item.users?.phone
                    ?.toLowerCase()
                    .includes(search.toLowerCase())
              )
            : data;
          setData(filteredData || []);
          setTotal(count || 0);
        }
        setLoading(false);
      } catch (error) {
        console.log("Error fetching data:", error);
        setData([]);
        setTotal(0);
      }
    };

    fetchData();
  }, [page, search, status, plan, deleteRefresh, limit]);

  useEffect(() => {
    const handleFetchStats = async () => {
      const successFull = await supabaseBrowser
        .from("user_subscription")
        .select("*", { count: "exact", head: true }) // Only count, no data
        .eq("status", "payment_successful");

      const failedFull = await supabaseBrowser
        .from("user_subscription")
        .select("*", { count: "exact", head: true }) // Only count, no data
        .eq("status", "payment_failed");

      const pendingFull = await supabaseBrowser
        .from("user_subscription")
        .select("*", { count: "exact", head: true }) // Only count, no data
        .eq("status", "payment_pending");

      setStats({
        ...stats,
        successful: successFull?.count || 0,
        pending: pendingFull?.count || 0,
        failed: failedFull?.count || 0,
      });
    };
    handleFetchStats();
  }, []);

  const handleExportFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("user_subscription")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error("Something went wrong!");
      }

      await exportToExcel(data, "subscription");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setDeleteRefresh(Math.random());
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
          <div
            key={i}
            className="h-10 bg-gray-100 animate-pulse rounded-md"
          ></div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* <div className="flex justify-end mb-4">
         <button
            onClick={() => handleExportFile()}
            className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
        </div> */}
        {/* KPI row */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xl">
          <KPI
            label="Total Payments Collected"
            value={stats?.successful || 0}
            color="blue"
            Icon={CreditCard}
          />
          <KPI
            label="Pending Payments"
            value={stats?.pending || 0}
            color="amber"
            Icon={Clock}
          />
          <KPI
            label="Failed Transactions"
            value={stats?.failed || 0}
            color="red"
            Icon={AlertTriangle}
          />
        </div> */}

        {/* search + filters */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative lg:w-full md-w-full w-[320px]">
            <select
              value={status}
              disabled={loading}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-md border px-3 pr-10 text-sm bg-background appearance-none w-full"
            >
              <option value="">All</option>
              <option value="payment_successful">Successful</option>
              <option value="payment_pending">Pending</option>
              <option value="payment_failed">Failed</option>
              <option value="expired">Expired</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
          <div className="relative lg:w-full md-w-full w-[320px]">
            <select
              value={plan}
              disabled={loading}
              onChange={(e) => {
                setPlan(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-md border px-3 pr-10 text-sm bg-background appearance-none w-full"
            >
              <option value="">All</option>
              <option value="Starter">Starter</option>
              <option value="Power">Power</option>
              <option value="Pro">Pro</option>
              <option value="Elite">Elite</option>
              <option value="Titan">Titan</option>
              <option value="Momentum">Momentum</option>
              <option value="VIP">VIP</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* table */}
        <div className="rounded-lg border overflow-x-auto lg:w-full md:w-full w-[320px]">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                {[
                  "USER NAME",
                  "PHONE",
                  "PLAN",
                  "AMOUNT",
                  "DATE",
                  "METHOD",
                  "STATUS",
                  "ACTIONS ",
                ].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && data.length == 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col justify-center items-center text-gray-900 p-6">
                      <FileText className="w-16 h-16 text-gray-400 mb-4" />
                      <h2 className="text-2xl font-semibold mb-2">
                        No Data Found
                      </h2>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!loading && data.length > 0 && (
                <>
                  {data.map((r: any) => (
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      <TableCell>
                        {r?.users?.display_name || r?.users?.name}
                      </TableCell>
                      <TableCell>{r?.users?.phone || "-"}</TableCell>
                      <TableCell className="capitalize">
                        {r?.subscription?.plan_name}
                      </TableCell>
                      <TableCell>{r?.subscription?.amount}</TableCell>
                      <TableCell>
                        {" "}
                        {/* {new Date(r?.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })} */}
                        {displayValidTill(r?.created_at)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {r?.is_trial ||
                        r?.subscription?.plan_name === "Trial Run"
                          ? "Free Trial"
                          : "Paypal"}
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={cn(
                            "capitalize",
                            r.status === "paid" &&
                              "bg-emerald-100 text-emerald-700",
                            r.status === "pending" &&
                              "bg-amber-100  text-amber-700",
                            r.status === "failed" &&
                              "bg-red-100    text-red-700"
                          )}
                        >
                          {statusEnum[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {/* <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-600 text-blue-600"
                  >
                    <FileText className="h-4 w-4 mr-1" /> Invoice&nbsp;(PDF)
                  </Button> */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-gray-200"
                          onClick={() => {
                            setIsOpenDeleted(true);
                            setRowData(r);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                        <button
                          disabled={loading}
                          onClick={() => {
                            setSelectedData(r);
                            setIsOpen(true);
                          }}
                          className="cursor-pointer p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
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
      </div>

      <DeleteModal2
        rowData={rowData}
        isOpen={isOpenDeleted}
        setIsOpen={setIsOpenDeleted}
        setRowData={setRowData}
        handleRefresh={handleRefresh}
        name="user_subscription"
      />
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <Card className="max-w-md w-full mx-auto shadow-md border mt-5 p-4 rounded-2xl bg-white">
          <CardContent className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Subscription Details
            </h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-700">
              <div className="font-medium">Username:</div>
              <div>
                {" "}
                {selectedData?.users?.display_name || selectedData?.users?.name}
              </div>

              <div className="font-medium">Plan:</div>
              <div>{selectedData?.subscription?.plan_name}</div>

              <div className="font-medium">Amount:</div>
              <div>{selectedData?.subscription?.amount}</div>

              <div className="font-medium">Date:</div>
              <div>
                {new Date(selectedData?.created_at).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </div>

              <div className="font-medium">Method:</div>
              <div>Paypal</div>

              <div className="font-medium">Payment Id:</div>
              <div className="break-words max-w-full">
                {selectedData?.payment_id}
              </div>

              <div className="font-medium">Status:</div>
              <div>
                <span
                  className={` rounded ${statusColor[selectedData?.status]}`}
                >
                  {statusEnum[selectedData?.status] || "Unknown"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Modal>
    </>
  );
}

/* ---------- tiny helpers ---------- */
const KPI = ({
  label,
  value,
  color,
  Icon,
}: {
  label: string;
  value: any;
  color: string;
  Icon: any;
}) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-4 flex items-center gap-4">
      <div
        className={cn(
          `h-8 w-8 rounded-full flex items-center justify-center bg-${color}-100`
        )}
      >
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="text-lg font-semibold leading-none">{value}</div>
      </div>
    </CardContent>
  </Card>
);
