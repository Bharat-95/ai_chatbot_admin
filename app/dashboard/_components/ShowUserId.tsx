// app/dashboard/_components/ShowUserId.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { showToast } from "@/hooks/useToast";

interface ShowUserIdProps {
  userId: string | null;
}

export default function ShowUserId({ userId }: ShowUserIdProps) {
  return (
    <div className="flex items-center gap-4 p-2">
      <div className="text-md font-semibold">User ID :</div>
      <div className="flex items-center gap-2">
        <code className="px-2 py-2 bg-gray-100 rounded text-sm">
          {userId || "Not available"}
        </code>
        {userId && (
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(userId);
                showToast({ title: "Copied!", description: "User ID copied." });
              } catch (err) {
                console.error(err);
                showToast({ title: "Error", description: "Failed to copy." });
              }
            }}
            className="bg-blue-600"
          >
            <Copy className="text-white" />
          </Button>
        )}
      </div>
    </div>
  );
}