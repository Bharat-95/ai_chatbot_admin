// app/dashboard/_components/SheetPage.tsx
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { showToast } from "@/hooks/useToast";
import Link from "next/link";

interface SheetPageProps {
  userId: string | null; 
}

export default function SheetPage({ userId }: SheetPageProps) {
  // constant Google Drive link
  const sheetLink =
    "https://drive.google.com/drive/folders/1ac0GGAtQZs8hfdgcMjLMVUrh55Rs1Ipn?usp=sharing";

  if (!userId) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sheetLink);
      showToast({
        title: "Copied!",
        description: "FB Marketplace Chatbot link copied to clipboard.",
      });
    } catch (err) {
      console.error("Failed to copy:", err);
      showToast({
        title: "Error",
        description: "Failed to copy link.",
      });
    }
  };

  return (
    <div className="flex gap-3 px-2 items-center pt-4">
      <span className="text-md font-medium">
        FB Marketplace Chatbot Link :
      </span>

      <Link
        href={sheetLink}
        target="_blank"
        className="focus:outline-none"
      >
        <Image
          src="/LOGO.png"
          alt="Open ChatBot sheet"
          width={40}
          height={40}
          className="cursor-pointer hover:scale-105 transition-transform"
        />
      </Link>

      <Button onClick={handleCopy} className="bg-blue-600">
        <Copy className="text-white" />
      </Button>
    </div>
  );
}
