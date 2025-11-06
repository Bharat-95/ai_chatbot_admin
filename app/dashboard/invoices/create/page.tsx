// app/dashboard/invoices/page.jsx
"use client";

import { CalendarDays, ChevronRight, Upload } from "lucide-react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import ErrorPage from "../../_components/ErrorMessage";
import { showToast } from "@/hooks/useToast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const validationSchema = Yup.object({
  invoiceId: Yup.string().required("Invoice ID is required"),
  dateOfSale: Yup.date().required("Date of Sale is required"),
  salesName: Yup.string().required("Sales Name is required"),
  carModel: Yup.string().required("Car Model is required"),
  vinNumber: Yup.string().required("Vin Number is required"),
  companyName: Yup.string().required("Company Name is required"),
  hst: Yup.string().required("HST is required"),
  saleAmount: Yup.number()
    .typeError("Sale Amount must be a number")
    .required("Sale Amount is required"),
  commission: Yup.number()
    .typeError("Commission must be a number")
    .required("Commission is required"),
  status: Yup.string().required("Status is required"),
  file: Yup.mixed().required("Invoice document is required"),
});

const SkeletonBox = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
);

type User = { // Renamed to User to avoid conflict with 'user' variable in loop
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  email: string;
  commission?: number;
  subscription?: string | null;
};

// Define the plan prices mapping
const planPrices: { [key: string]: string } = {
  Starter: "$299",
  Momentum: "$499",
  Elite: "$999",
  Pro: "$699",
  Power: "$1499",
};

export default function CreateInvoice() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]); // Use the new User type
  const [formLoading, setFormLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  // const [url, setUrl] = useState<string | null>(null); // This state is not directly used for display

  useEffect(() => {
    // Initial loading state for the skeleton
    const timer = setTimeout(() => setLoading(false), 1500); // simulate loading
    return () => clearTimeout(timer);
  }, []);

  const handleFetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseBrowser
        .from("users")
        .select("id, display_name, full_name, email, commission, subscription")
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
        setError(error.message);
        showToast({
          type: "error",
          title: "Error fetching users",
          description: error.message,
        });
      } else {
        // No need to filter and re-map into 'key', 'title' etc., directly use 'data' if it fits User type
        setUsers(data as User[]);
      }
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Failed to fetch user data");
      showToast({
        type: "error",
        title: "Error",
        description: error.message || "Failed to fetch user data",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetchUsers();
  }, []); // Run once on component mount

  const formik = useFormik({
    initialValues: {
      invoiceId: `USR${crypto.randomUUID()}`,
      dateOfSale: "",
      salesName: "", // This will store the user ID
      carModel: "",
      saleAmount: "",
      commission: "",
      status: "",
      file: null, // This will store the public URL after upload
      vinNumber: "",
      companyName: "",
      hst: "",
    },
    validationSchema,
    onSubmit: async (values: any) => {
      setFormLoading(true);
      try {
        if (!values.file) {
          showToast({
            type: "error",
            title: "Error",
            description: "Please upload the invoice document first.",
          });
          setFormLoading(false);
          return;
        }

        const result = (parseFloat(values.saleAmount) * parseFloat(values.commission)) / 100;

        const { error } = await supabaseBrowser
          .from("invoice")
          .insert([{
            invoiceId: values.invoiceId,
            dateOfSale: values.dateOfSale,
            salesName: values.salesName, // This is the user ID
            carModel: values.carModel,
            vinNumber: values.vinNumber,
            companyName: values.companyName,
            hst: values.hst,
            saleAmount: parseFloat(values.saleAmount),
            commission: parseFloat(values.commission),
            commission_amount: result, // Calculated commission amount
            status: values.status,
            invoice_document_url: values.file, // Store the public URL of the uploaded file
          }]);

        if (error) {
          throw new Error(`Failed to create invoice: ${error.message}`);
        }

        showToast({
          title: "Success",
          description: "Invoice created successfully.",
        });
        router.push("/dashboard/invoices");
      } catch (err: any) {
        showToast({
          type: "error",
          title: "Error",
          description: err.message || "Something went wrong.",
        });
      } finally {
        setFormLoading(false);
      }
    },
  });

  // Effect to automatically set commission when salesName changes
  useEffect(() => {
    if (formik.values.salesName) {
      const selectedUser = users.find(
        (user) => user.id === formik.values.salesName
      );
      if (selectedUser && selectedUser.commission != null) { // Check for null
        formik.setFieldValue("commission", selectedUser.commission.toString());
      } else {
        formik.setFieldValue("commission", ""); // Clear if no commission or user not found
      }
    }
  }, [formik.values.salesName, users]);

  const handleUpload = async (file: File) => {
    if (!file) {
      showToast({
        title: "Error",
        description: "Please select a file first!",
      });
      return null;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `invoice_documents/${fileName}`; // Changed path for clarity

    const { error: uploadError } = await supabaseBrowser.storage
      .from("invoices")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      showToast({
        type: "error",
        title: "Upload Failed",
        description: uploadError.message,
      });
      setUploading(false);
      return null;
    } else {
      const { data } = supabaseBrowser.storage
        .from("invoices")
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        showToast({
          title: "Success",
          description: "File uploaded successfully!",
        });
        setUploading(false);
        return data.publicUrl;
      } else {
        showToast({
          type: "error",
          title: "Upload Failed",
          description: "Could not get public URL for the uploaded file.",
        });
        setUploading(false);
        return null;
      }
    }
  };

  if (error) {
    return <ErrorPage message={error} />; 
  }

  return (
    <>
      {(uploading || formLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
          <div className="flex items-center space-x-2 text-gray-700 bg-white px-4 py-2 rounded-md shadow-md">
            <svg
              className="w-5 h-5 animate-spin text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              ></path>
            </svg>
            <span className="text-sm font-medium">
              {uploading ? "Uploading file..." : "Creating invoice..."}
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col  min-h-screen">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 px-6 py-4 text-sm text-gray-600 select-none"
        >
          <Link href={"/dashboard/invoices"}>
            <ArrowLeft className="inline-block cursor-pointer mr-2" size={20} />
          </Link>
          <span>Invoices Management</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <a href="#" className="text-blue-600 hover:underline font-medium">
            Create New Invoice
          </a>
        </nav>

        <section className="flex-1 px-4 sm:px-6 md:px-8 py-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8 max-w-6xl mx-auto">
            {loading ? (
              <>
                <SkeletonBox className="h-8 w-48 mb-6" />
                <SkeletonBox className="h-6 w-40 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <SkeletonBox className="h-4 w-32" />
                      <SkeletonBox className="h-10 w-full" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <SkeletonBox className="h-10 w-24" />
                  <SkeletonBox className="h-10 w-36" />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Create New Invoice
                  </h1>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button
                      onClick={() => router.push("/dashboard/invoices")}
                      type="button"
                      disabled={uploading || formLoading}
                      className="cursor-pointer w-full md:w-auto rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        formik.handleSubmit();
                      }}
                      disabled={uploading || formLoading}
                      type="button"
                      className="cursor-pointer w-full md:w-auto rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      {formLoading ? "Saving..." : "Create Invoice"}
                    </button>
                  </div>
                </div>

                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Basic Information
                </h2>

                <form
                  onSubmit={formik.handleSubmit}
                  className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5"
                >
                  {/* Invoice ID */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">
                      Invoice ID
                    </label>
                    <input
                      name="invoiceId"
                      readOnly
                      value={formik.values.invoiceId}
                      className="rounded-md border border-gray-300 bg-gray-100 py-2 px-3 text-sm text-gray-500"
                    />
                  </div>
                  {/* Date of Sale */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">
                      Date of Sale
                    </label>
                    <input
                      name="dateOfSale"
                      type="date"
                      value={formik.values.dateOfSale}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="rounded-md border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900"
                    />
                    {formik.touched.dateOfSale && formik.errors.dateOfSale && (
                      <span className="text-sm text-red-600 mt-1">
                        {formik.errors.dateOfSale?.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {/* Sales Name */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">
                      Select Sales
                    </label>
                    <div className="relative">
                      <select
                        name="salesName"
                        value={formik.values.salesName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className="appearance-none w-full rounded-md border border-gray-300 bg-white py-2 px-3 pr-10 text-sm text-gray-900"
                      >
                        <option disabled value="">
                          Choose Sales Name
                        </option>
                        {users.map((user) => {
                          // Get the price for the user's subscription, or 'N/A'
                          const price = user.subscription
                            ? planPrices[user.subscription] || "$0"
                            : "No Plan";
                          const commissionDisplay = user.commission != null
                            ? `${user.commission}%`
                            : "No Commission";

                          return (
                            <option key={user.id} value={user.id}>
                              {user.display_name || user.full_name || user.email} (
                              {price} - {user.subscription || "No Plan"} -{" "}
                              {commissionDisplay})
                            </option>
                          );
                        })}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        ▼
                      </div>
                    </div>

                    {formik.touched.salesName && formik.errors.salesName && (
                      <span className="text-sm text-red-600 mt-1">
                        {formik.errors.salesName?.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Car Model */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">
                      Car Model
                    </label>
                    <input
                      name="carModel"
                      value={formik.values.carModel}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="rounded-md border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900"
                    />
                    {formik.touched.carModel && formik.errors.carModel && (
                      <span className="text-sm text-red-600 mt-1">
                        {formik.errors.carModel?.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {/* Sale Amount */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">
                      Sale Amount
                    </label>
                    <input
                      name="saleAmount"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formik.values.saleAmount}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(
                          /[^0-9.]/g, // Allow digits and a single decimal point
                          ""
                        );
                        // Ensure only one decimal point
                        const parts = numericValue.split('.');
                        if (parts.length > 2) {
                            formik.setFieldValue("saleAmount", parts[0] + '.' + parts.slice(1).join(''));
                        } else {
                            formik.setFieldValue("saleAmount", numericValue);
                        }
                      }}
                      onBlur={formik.handleBlur}
                      className="rounded-md border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900"
                    />
                    {formik.touched.saleAmount && formik.errors.saleAmount && (
                      <span className="text-sm text-red-600 mt-1">
                        {formik.errors.saleAmount?.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {/* Commission */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">
                      Commission (% or amount)
                    </label>
                    <input
                      name="commission"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formik.values.commission}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(
                          /[^0-9.]/g, // Allow digits and a single decimal point
                          ""
                        );
                        const parts = numericValue.split('.');
                        if (parts.length > 2) {
                            formik.setFieldValue("commission", parts[0] + '.' + parts.slice(1).join(''));
                        } else {
                            formik.setFieldValue("commission", numericValue);
                        }
                      }}
                      onBlur={formik.handleBlur}
                      className="rounded-md border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900"
                    />
                    {formik.touched.commission && formik.errors.commission && (
                      <span className="text-sm text-red-600 mt-1">
                        {formik?.errors?.commission?.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {/* Status */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">Status</label>
                    <div className="relative">
                      <select
                        name="status"
                        value={formik.values.status}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className="appearance-none w-full rounded-md border border-gray-300 bg-white py-2 px-3 pr-10 text-sm text-gray-900"
                      >
                        <option value="">Select status</option>
                        <option value="Approved">Approved</option>
                        <option value="Pending">Pending</option>
                      </select>

                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                        ▼
                      </div>
                    </div>

                    {formik.touched.status && formik.errors.status && (
                      <span className="text-sm text-red-600 mt-1">
                        {formik.errors.status?.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {/* Upload File */}
                  <div className="flex flex-col relative">
                    <label className="text-sm font-medium mb-1">
                      Upload File
                    </label>

                    {/* File Upload Button */}
                    <div className="relative">
                      <label
                        htmlFor="upload-file"
                        className="flex items-center gap-2 cursor-pointer rounded-md border border-gray-300 bg-white py-2 px-3 text-sm text-gray-500 hover:bg-gray-50"
                      >
                        <Upload className="w-4 h-4" /> Upload Invoice Document
                      </label>

                      <input
                        id="upload-file"
                        name="file"
                        type="file"
                        disabled={uploading}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onClick={(e) => {
                          (e.target as HTMLInputElement).value = "";
                        }}
                        onChange={async (event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) {
                            const fileUrl = await handleUpload(file);
                            if (fileUrl) {
                              formik.setFieldValue("file", fileUrl);
                            }
                          }
                        }}
                      />
                    </div>

                    {/* Validation Error */}
                    {formik.touched.file && formik.errors.file && (
                      <span className="text-sm text-red-600 mt-1">
                        {formik.errors.file as string}
                      </span>
                    )}

                    {/* Uploaded File Link */}
                    {formik.values.file && (
                      <a
                        href={formik.values.file as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 text-sm text-blue-600 underline break-words max-w-full"
                      >
                        📎Uploaded File
                      </a>
                    )}
                  </div>
                  {/* Vin Number */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">
                      Vin Number
                    </label>
                    <input
                      name="vinNumber"
                      value={formik.values.vinNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="rounded-md border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900"
                    />
                    {formik.touched.vinNumber && formik.errors.vinNumber && (
                      <span className="text-sm text-red-600 mt-1">
                        {formik.errors.vinNumber?.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {/* Company Name */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">
                      Company Name
                    </label>
                    <input
                      name="companyName"
                      value={formik.values.companyName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="rounded-md border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900"
                    />
                    {formik.touched.companyName &&
                      formik.errors.companyName && (
                        <span className="text-sm text-red-600 mt-1">
                          {formik.errors.companyName?.toLocaleString()}
                        </span>
                      )}
                  </div>
                  {/* HST */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">HST</label>
                    <input
                      name="hst"
                      value={formik.values.hst}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="rounded-md border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900"
                    />
                    {formik.touched.hst && formik.errors.hst && (
                      <span className="text-sm text-red-600 mt-1">
                        {formik.errors.hst?.toLocaleString()}
                      </span>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}