// app/dashboard/_components/SheetPage.tsx
"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { showToast } from "@/hooks/useToast";

interface SheetPageProps {
  userId: string | null; 
}

export default function SheetPage({ userId }: SheetPageProps) {
  const [sheetLink, setSheetLink] = useState<string | null>(null);
  const toastShown = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const fetchLink = async () => {
      const { data, error } = await supabaseBrowser
        .from("users")
        .select("fb_chatbot_leads_gs_link")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching sheet link:", error.message);
        return;
      }

      if (!data?.fb_chatbot_leads_gs_link) {
        if (!toastShown.current) {
          showToast({
            title: "Please wait",
            description:
              "Please wait for 2 mins or refresh and try again.",
            type: "info",
          });
          toastShown.current = true;
        }

        setTimeout(fetchLink, 1000);
        return;
      }

      setSheetLink(data.fb_chatbot_leads_gs_link || null);
    };

    fetchLink();
  }, [userId]);

  const handleOpen = () => {
    if (sheetLink) {
      window.open(sheetLink, "_blank");
    }
  };

  const handleCopy = async () => {
    if (!sheetLink) return;

    try {
      await navigator.clipboard.writeText(sheetLink);
      showToast({
        title: "Copied!",
        description: "Google Sheet link copied to clipboard.",
      });
    } catch (err) {
      console.error("Failed to copy:", err);
      showToast({
        title: "Error",
        description: "Failed to copy link.",
      });
    }
  };

  if (!userId) return null; // ✅ don't render if no userId

  return (
    <div className="flex gap-3 px-2 items-center pt-4">
      <span className="text-md font-medium">Google Sheet for Leads :</span>

      <button onClick={handleOpen} className="focus:outline-none">
        <Image
          src="/sheets.png"
          alt="Open Google Sheet"
          width={40}
          height={40}
          className="cursor-pointer hover:scale-105 transition-transform"
        />
      </button>

      <Button onClick={handleCopy} className="bg-blue-600">
        <Copy className="text-white" />
      </Button>
    </div>
  );
}
