"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/userComponents/LoadingSkeleton";
import { SearchAndFilter } from "@/components/userComponents/SearchAndFilter";
import { UserTable } from "@/components/userComponents/UserTable";
import ComingSoon from "@/components/ui/coming-soon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import PhoneInput from "react-phone-input-2";
import { showToast } from "@/hooks/useToast";
import { exportToExcel } from "@/lib/exportToExcel";

type Seminar = {
  fullname: string;
  email: string;
  phone: string;
};

const ITEMS_PER_PAGE = 10;

function UsersPage() {
  // const { users, loading, error } = useUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState<Seminar>({
    fullname: "",
    email: "",
    phone: "",
  });
  const [users, setUsers] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const limit = 10;
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const totalPages = Math.ceil(total / limit);
  const [deleteRefresh, setDeleteRefresh] = useState<any>(null);

  // const filteredUsers = useMemo(
  //   () => filterUsers(users, searchTerm, planFilter, statusFilter),
  //   [users, searchTerm, planFilter, statusFilter]
  // );

  useEffect(() => {
    const handleFetchSeminar = async () => {
      try {
        let query = supabaseBrowser
          .from("users")
          .select("*, user_subscription(*)", {
            count: "exact",
          })
          .eq("role", "user")
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        // Apply filters
        if (searchTerm) {
          query = query.or(
            `email.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
          );
        }

        if (statusFilter && statusFilter != "all") {
          query = query.eq("status", statusFilter);
        }

        if (planFilter && planFilter != "all") {
          query = query.eq("subscription", planFilter);
        }

        const { data, error, count } = await query;

        if (error) {
          console.error(error);
          setError(error.message);
        } else {
          setUsers(data);
          setTotal(count || 0); // Set total count of records
        }
        setLoading(false);
      } catch (error) {
        console.error(error);
        setError("Failed to fetch seminar data");
      }
    };
    handleFetchSeminar();
  }, [page, searchTerm, statusFilter, planFilter, limit, deleteRefresh]);

  const handleExportFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("users")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error("Something went wrong!");
      }
      await exportToExcel(data, "users");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
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

  if (error) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        {/* <p className="text-red-500">Error: {error}</p> */}
        <ComingSoon />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          planFilter={planFilter}
          onPlanFilterChange={setPlanFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Users Table */}
        <Card className="border border-gray-200 shadow-sm lg:w-full md:w-full w-[320px] overflow-x-auto ">
          <CardContent className="p-0">
            <UserTable
              users={users || []}
              handleExportFile={handleExportFile}
              setPage={setPage}
              page={page}
              totalPages={totalPages}
              limit={limit}
              totalRecord={total}
              setLimit={setLimit}
              setDeleteRefresh={setDeleteRefresh}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Create New User
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={newUser.fullname}
                onChange={(e) =>
                  setNewUser({ ...newUser, fullname: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                min={0}
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              WhatsApp Number
            </label>
            <PhoneInput
              country="ca"
              value={newUser.phone}
              // onChange={(val: any) => {
              //   setNewUser({ ...newUser, phone: val });
              // }}
              onChange={(val, data: any) => {
                // setFieldValue("phone", `+${data?.dialCode}${val}`)
                const finalVal = val.startsWith("+") ? val : `+${val}`;
                setNewUser({ ...newUser, phone: finalVal });
              }}
              inputClass="!w-full !h-11 !text-sm !border !border-gray-300 !rounded-md focus:ring-2 focus:ring-primary"
              buttonClass="!border-gray-300"
              enableSearch
            />
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={async () => {
                setSaving(true);

                if (!newUser.phone) {
                  setSaving(false);
                  showToast({
                    title: "error",
                    description: "Phone number is required.",
                  });
                  return;
                }
                if (!newUser.email) {
                  setSaving(false);
                  showToast({
                    title: "error",
                    description: "Email is required.",
                  });
                  return;
                }
                if (!newUser.fullname) {
                  setSaving(false);
                  showToast({
                    title: "error",
                    description: "Name is required.",
                  });
                  return;
                }
                const { error } = await supabaseBrowser.from("users").insert({
                  id: crypto.randomUUID(),
                  phone: newUser.phone,
                  display_name: newUser.fullname,
                  full_name: newUser.fullname,
                  email: newUser.email,
                  created_at: new Date().toISOString(),
                });

                if (error) {
                  setSaving(false);
                  showToast({
                    title: "error",
                    description: "Something went wronge!",
                  });
                  // alert(`Save failed: ${error.message}`);
                  return;
                } else {
                  setDialogOpen(false);
                  setNewUser({
                    fullname: "",
                    email: "",
                    phone: "",
                  });
                }
                setSaving(false);
                window.location.reload();
              }}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default UsersPage;
