// components/users/UserTable.tsx
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  History,
  Info,
  Trash2,
  Ban,
  CheckCircle,
  Pencil,
  File,
  Users,
} from "lucide-react";
import Modal from "@/app/dashboard/_components/Modal";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { exportToExcel } from "@/lib/exportToExcel";
import { showToast } from "@/hooks/useToast";
import PaginationBar from "@/app/dashboard/_components/Pagination";
import DeleteModal from "@/app/dashboard/_components/DeleteModal";
import { displayValidTill } from "@/lib/dateTimeFormatter";
import { toast } from "sonner";
import Link from "next/link";
import ShowUserId from "@/app/dashboard/_components/ShowUserId";
import GoogleSheet from "@/app/dashboard/_components/GoogleSheet";
interface User {
  id: string;
  display_name: string;
  email: string;
  phone?: string;
  status?: string;
  subscription?: string;
  created_at: string;
  user_subscription: UserSubscription[];
  website_last_opened: string;
  name: string;
  // Added new property to the User interface
  fb_chatbot_user_blocked?: boolean;
}
interface UserSubscription {
  created_at: string;
  end_date: string;
  start_date:string;
}
interface UserTableProps {
  users: User[];
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  page: number;
  handleExportFile: any;
  totalRecord: number;
  limit: number;
  setLimit?: React.Dispatch<React.SetStateAction<number>>;
  setDeleteRefresh?: React.Dispatch<React.SetStateAction<any>>;
}
export const UserTable = ({
  users,
  setPage,
  totalPages,
  page,
  handleExportFile,
  totalRecord,
  limit,
  setLimit,
  setDeleteRefresh,
}: UserTableProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenDeleted, setIsOpenDeleted] = useState(false);
  const [rowData, setRowData] = useState<any>(null);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatStartDateIST = (d?: string | null) => {
    if (!d) return "-";
    const dt = new Date(d);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "long",
      day: "2-digit",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(dt);

    const map: Record<string, string> = {};
    parts.forEach((p) => {
      if (p.type !== "literal") map[p.type] = p.value;
    });

    const month = map.month || "";
    const day = map.day || "";
    const year = map.year || "";
    const weekday = map.weekday || "";
    const hour = map.hour || "";
    const minute = map.minute || "";
    const dayPeriodRaw = (map.dayPeriod || "").toLowerCase();
    const dayPeriod = dayPeriodRaw === "pm" ? "p.m." : "a.m.";

    return `${month} ${day}, ${year} ${weekday} ${hour}:${minute} ${dayPeriod}`;
  };

  const handleRefresh = () => {
    setPage(1);
    if (setDeleteRefresh) {
      setDeleteRefresh(Math.random());
    }
  };
  const handleUserDetails = async (user: User) => {
    console.log(user, "userssss");
    setSelectedData(user);

    console.log("user data", user)
    setIsOpen(true);
  };
  // Toggles the block status of a user
  const handleToggleBlockUser = async (userId: string, isBlocked: boolean) => {
    const newBlockStatus = !isBlocked;
    const { error } = await supabaseBrowser
      .from("users")
      .update({ fb_chatbot_user_blocked: newBlockStatus })
      .eq("id", userId);
    if (error) {
      toast.error(`Error ${newBlockStatus ? "blocking" : "unblocking"} user`);
    } else {
      toast.success(
        `User ${newBlockStatus ? "blocked" : "unblocked"} successfully!`
      );
      handleRefresh();
    }
  };

  const handleDeleteUser = async () => {
    if (!rowData) return;
    try {
      setLoading(true);
      const res = await fetch("/api/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: rowData.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete user");
        return;
      }

      toast.success("User deleted successfully!");
      handleRefresh();
      setIsConfirmOpen(false);
      setRowData(null);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        {/* <div className="flex justify-end mb-4">
          <button
            onClick={() => handleExportFile()}
            className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
        </div> */}
        <table className="w-full border-spacing-0">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200 ">
              <th className="text-left py-4 lg:px-4 md:px-4 px-3 font-medium text-gray-500 text-xs">
                NAME
              </th>
              <th className="text-left py-4 lg:px-4 md:px-4 px-3 font-medium  text-gray-500 text-xs">
                PHONE
              </th>
              <th className="text-left py-4 lg:px-4 md:px-4 px-3 font-medium text-gray-500 text-xs">
                EMAIL
              </th>
              <th className="text-left py-4 lg:px-4 md:px-4 px-3 font-medium text-gray-500 text-xs">
                PLAN
              </th>
              <th className="text-left py-4 lg:px-4 md:px-4 px-3 font-medium text-gray-500 text-xs">
                SUBSCRIPTION DATE
              </th>
              <th className="text-left py-4 lg:px-4 md:px-4 px-3 font-medium text-gray-500 text-xs">
                JOIN DATE
              </th>
              <th className="text-left py-4 lg:px-4 md:px-4 px-3 font-medium text-gray-500 text-xs">
                LAST OPENED
              </th>
              <th className="text-left py-4 lg:px-4 md:px-4 px-3 font-medium text-gray-500 text-xs">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors lg:text-md md:text-md text-sm"
                >
                  <td className="py-4 px-4  text-gray-900">{user.name}</td>
                  <td className="py-4 px-4 text-center  text-gray-900">
                    {user.phone ?? "-"}
                  </td>
                  <td className="py-4 px-4 text-gray-900 ">{user.email}</td>
                  <td className="py-4 px-4">
                    <StatusBadge status={user.subscription} />
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {user.user_subscription.length > 0
                      ? formatStartDateIST(
                          user.user_subscription[0]?.start_date ??
                            user.user_subscription[0]?.created_at
                        )
                      : "-"}
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {/* {format(parseISO(user.created_at), "MMM dd, yyyy")} */}
                    {displayValidTill(user.created_at, user.created_at)}
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {user.website_last_opened
                      ? displayValidTill(user.website_last_opened, user.website_last_opened)
                      : "-"}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-gray-200"
                        onClick={() => {
                          setIsConfirmOpen(true);
                          setRowData(user);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                      <button
                        onClick={() => {
                          handleUserDetails(user);
                        }}
                        className="cursor-pointer p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <Link href={`/dashboard/users/${user.id}/edit`}>
                        <button className="cursor-pointer p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </Link>
                      <Link href={`/dashboard/users/${user.id}/leads`}>
                        <button className="cursor-pointer p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200">
                          <Users className="w-4 h-4" />
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="h-[20vh]">
                  <div className="flex flex-col justify-center items-center h-full text-gray-900">
                    <FileText className="w-16 h-16 text-gray-400 mb-4" />
                    <h2 className="text-2xl font-medium mb-2">No Data Found</h2>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mt-auto">
          <PaginationBar
            page={page}
            setPage={setPage}
            totalPage={totalPages}
            totalRecord={totalRecord}
            limit={limit}
            setLimit={setLimit}
          />
        </div>
      </div>

      <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
        
          <h2 className="text-lg font-semibold mb-2">
            Are you sure?
          </h2>
          <p className="text-sm text-gray-600 mb-4">
           This action cannot be undone.
      
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsConfirmOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </div>
       
      </Modal>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="max-w-md max-h-[90vh] overflow-y-auto mx-auto bg-white p-6">
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <h2 className="text-2xl font-medium text-gray-800">
              {selectedData?.display_name || selectedData?.name}
            </h2>
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full ${
                selectedData?.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {selectedData?.status?.toUpperCase() || "-"}
            </span>
          </div>

          <div className="space-y-3 text-sm text-gray-500">
            {/* Core fields */}
            <div className="flex justify-between">
              <ShowUserId userId={selectedData?.id} />
            </div>
            <div className="flex justify-between">
              {selectedData?.id && <GoogleSheet userId={selectedData.id} />}
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Name:</span>
              <span>{selectedData?.name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Email:</span>
              <span>{selectedData?.email || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Phone:</span>
              <span>{selectedData?.phone || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Role:</span>
              <span>{selectedData?.role || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Subscription:</span>
              <span>{selectedData?.subscription || "Free"}</span>
            </div>

            {/* Timestamps */}
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Join Date:</span>
              <span>
                {selectedData?.created_at
                  ? displayValidTill(selectedData.created_at)
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                Website Last Opened:
              </span>
              <span>
                {selectedData?.website_last_opened
                  ? displayValidTill(selectedData.website_last_opened)
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                FB Chatbot Last Opened:
              </span>
              <span>
                {selectedData?.fb_chatbot_last_opened
                  ? displayValidTill(selectedData.fb_chatbot_last_opened)
                  : "-"}
              </span>
            </div>

            {/* Booleans */}
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Panda3 Bot:</span>
              <span>{selectedData?.panda3_bot ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">New User:</span>
              <span>{selectedData?.new_user ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Anonymous:</span>
              <span>{selectedData?.is_anonymous ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                FB Chatbot Trial Active:
              </span>
              <span>
                {selectedData?.fb_chatbot_trail_active ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                FB Chatbot Sub Active:
              </span>
              <span>
                {selectedData?.fb_chatbot_subscription_active ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">User Blocked:</span>
              <span>
                {selectedData?.fb_chatbot_user_blocked ? "Yes" : "No"}
              </span>
            </div>

            {/* FB Chatbot fields */}
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                FB Chatbot Trial Start:
              </span>
              <span>{selectedData?.fb_chatbot_trail_start_date || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                FB Chatbot Trial Expiry:
              </span>
              <span>{selectedData?.fb_chatbot_trail_expiry_date || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                FB Chatbot Version:
              </span>
              <span>{selectedData?.fb_chatbot_last_version || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                FB Chatbot Subscription Name:
              </span>
              <span>{selectedData?.fb_chatbot_subscription_name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                FB Chatbot Subscription Expiry:
              </span>
              <span>
                {selectedData?.fb_chatbot_subscription_expiry_date
                  ? new Date(
                      selectedData.fb_chatbot_subscription_expiry_date
                    ).toLocaleDateString()
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                FB Chatbot Webhook:
              </span>
              <span className="break-all">
                {selectedData?.fb_chatbot_webhook || "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                FB Chatbot OpenAI ID:
              </span>
              <span>{selectedData?.fb_chatbot_open_ai_id || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                FB Chatbot Prompt:
              </span>
              <span>{selectedData?.fb_chatbot_prompt || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">
                FB Chatbot Leads Sheet:
              </span>
              <span className="break-all">
                {selectedData?.fb_chatbot_leads_gs_link || "-"}
              </span>
            </div>
          </div>

          {selectedData?.user_subscription?.length > 0 && (
            <>
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  Subscription Details
                </h3>
                <div className="space-y-3 text-sm py-1text-gray-500">
                  {selectedData.user_subscription.map((sub, index) => (
                    <div key={sub.id || index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">
                          Subscription ID:
                        </span>
                        <span className="text-right">
                          {sub.subscription_id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">
                          Amount:
                        </span>
                        <span className="text-right">${sub.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">
                          Status:
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            sub.status === "payment_successful"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {sub.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">
                          Start Date:
                        </span>
                        <span className="text-right">
                          {new Date(sub.start_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">
                          End Date:
                        </span>
                        <span className="text-right">
                          {new Date(sub.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};
const PlanBadge = ({ plan }: { plan?: string }) => {
  const planValue = plan || "Free";
  const getVariantAndClass = () => {
    switch (planValue.toLowerCase()) {
      case "enterprise":
        return {
          variant: "default" as const,
          className: "bg-[#5E189D] hover:bg-[#4A1278]",
        };
      case "professional":
        return {
          variant: "secondary" as const,
          className: "bg-purple-100 text-purple-800 hover:bg-purple-200",
        };
      default:
        return { variant: "outline" as const, className: "" };
    }
  };
  const { variant, className } = getVariantAndClass();
  return (
    <Badge variant={variant} className={className}>
      {planValue}
    </Badge>
  );
};
const StatusBadge = ({ status }: { status?: string }) => {
  const statusValue = status || "";
  const getVariantAndClass = () => {
    switch (statusValue) {
      case "active":
        return {
          variant: "default" as const,
          className: "bg-green-100 text-green-800 hover:bg-green-200",
        };
      case "canceled":
        return { variant: "destructive" as const, className: "" };
      default:
        return {
          variant: "secondary" as const,
          className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        };
    }
  };
  const { variant, className } = getVariantAndClass();
  const getStatusText = () => {
    switch (statusValue) {
      case "active":
        return "Active";
      case "canceled":
        return "Canceled";
      case "past_due":
        return "Past Due";
      case "unpaid":
        return "Unpaid";
      default:
        return statusValue;
    }
  };
  return (
    <Badge variant={variant} className={className}>
      {getStatusText()}
    </Badge>
  );
};
