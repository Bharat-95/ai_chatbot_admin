// app/error/page.tsx or pages/error.tsx (based on your routing structure)

"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ErrorPage() {
  const router = useRouter();

  const handleRetry = () => {
    router.refresh(); // You can also use router.push('/') to redirect
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-md border border-gray-200">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          Please try again later.
        </p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
