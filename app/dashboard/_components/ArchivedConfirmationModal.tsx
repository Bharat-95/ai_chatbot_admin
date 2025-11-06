"use client";

import { showToast } from "@/hooks/useToast"; 
import { supabaseBrowser } from "@/lib/supabaseBrowser"; 
import React, { useState } from "react"; 

interface ArchiveModalProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rowData: any;
  setRowData: React.Dispatch<React.SetStateAction<any>>;
  handleRefresh: () => void; 
}

export default function ArchiveModal({
  isOpen,
  setIsOpen,
  rowData,
  setRowData,
  handleRefresh,
}: ArchiveModalProps) {
  const [loading, setLoading] = useState(false); 

  const confirmArchive = async () => {
    setLoading(true); 
    try {
      if (!rowData?.id) {
        throw new Error("No seminar ID provided for archiving.");
      }

      // --- Start of client-side archiving logic (replaces RPC call) ---

      // 7. Insert the seminar record into archived_seminars
      const seminarWithArchiveTime = {
        ...rowData,
        archived_at: new Date(),
      };
console.log(seminarWithArchiveTime);


      const { error: seminarInsertError } = await supabaseBrowser
        .from("archived_seminars")
        .insert(seminarWithArchiveTime); // Ensure all columns match the archive table
      
      if (seminarInsertError) {
        throw new Error(
          seminarInsertError.message || "Failed to archive seminar."
        );
      }

      // 1. Fetch related seminar_signup records
      const { data: signupsToArchive, error: signupsFetchError } =
        await supabaseBrowser
          .from("seminar_signup")
          .select("*")
          .eq("seminar_id", rowData.id);

      if (signupsFetchError) {
        throw new Error(
          signupsFetchError.message || "Failed to fetch seminar signups."
        );
      }

      // 2. Insert seminar_signup records into archived_seminar_signup
      if (signupsToArchive && signupsToArchive.length > 0) {
        const signupsWithArchiveTime = signupsToArchive.map((signup) => ({
          ...signup,
          archived_at: new Date(),
        }));
        const { error: signupsInsertError } = await supabaseBrowser
          .from("archived_seminar_signup")
          .insert(signupsWithArchiveTime); // Ensure all columns match the archive table

        if (signupsInsertError) {
          throw new Error(
            signupsInsertError.message || "Failed to archive seminar signups."
          );
        }
      }

      // 4. Fetch related seminar_registration records
      const { data: registrationsToArchive, error: registrationsFetchError } =
        await supabaseBrowser
          .from("seminar_registration")
          .select("*")
          .eq("saminarId", rowData.id);

      if (registrationsFetchError) {
        throw new Error(
          registrationsFetchError.message ||
            "Failed to fetch seminar registrations."
        );
      }

      // 5. Insert seminar_registration records into archived_seminar_registration
      if (registrationsToArchive && registrationsToArchive.length > 0) {
        const registrationsWithArchiveTime = registrationsToArchive.map(
          (registration) => ({
            ...registration,
            archived_at: new Date(),
          })
        );
        const { error: registrationsInsertError } = await supabaseBrowser
          .from("archived_seminar_registration")
          .insert(registrationsWithArchiveTime); // Ensure all columns match the archive table

        if (registrationsInsertError) {
          throw new Error(
            registrationsInsertError.message ||
              "Failed to archive seminar registrations."
          );
        }
      }

      // 3. Delete original seminar_signup records
      const { error: signupsDeleteError } = await supabaseBrowser
        .from("seminar_signup")
        .delete()
        .eq("seminar_id", rowData.id);

      if (signupsDeleteError) {
        throw new Error(
          signupsDeleteError.message ||
            "Failed to delete original seminar signups."
        );
      }

      // 6. Delete original seminar_registration records
      const { error: registrationsDeleteError } = await supabaseBrowser
        .from("seminar_registration")
        .delete()
        .eq("saminarId", rowData.id);

      if (registrationsDeleteError) {
        throw new Error(
          registrationsDeleteError.message ||
            "Failed to delete original seminar registrations."
        );
      }

      // 8. Delete the original seminar record
      const { error: seminarDeleteError } = await supabaseBrowser
        .from("seminars")
        .delete()
        .eq("id", rowData.id);

      if (seminarDeleteError) {
        throw new Error(
          seminarDeleteError.message || "Failed to delete original seminar."
        );
      }

      setIsOpen(false);
      setRowData(null);
      handleRefresh();
      showToast({
        title: "Success",
        description: "Item successfully archived.",
      });
    } catch (error: any) {
      console.error("Error archiving item:", error);
      showToast({
        title: "Error",
        description: error.message || "Something went wrong during archiving.",
      });
    } finally {
      setLoading(false); // Reset loading state regardless of success or failure
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg p-6 shadow-lg w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-2">Confirm Archive?</h2>
        <p className="text-sm text-gray-600 mb-4">
          This action will move the item to the archive. You can restore it
          later.
        </p>
        <div className="flex justify-end gap-2">
          {/* Cancel button */}
          <button
            disabled={loading} // Disable button while loading
            onClick={() => {
              setIsOpen(false); // Close the modal
              setRowData(null); // Clear the row data
            }}
            className="px-4 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            disabled={loading} // Disable button while loading
            onClick={confirmArchive}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700" 
          >
            {loading ? "Archiving ..." : "Archive"}{" "}
          </button>
        </div>
      </div>
    </div>
  );
}
