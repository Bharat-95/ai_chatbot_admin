import { supabaseBrowser } from "@/lib/supabaseBrowser";
import EditUserForm from "./EditUserForm";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import Link from "next/link";
import ShowUserId from "../../../_components/ShowUserId";
import GoogleSheet from "../../../_components/GoogleSheet"
import FbChatBotLink from "../../../_components/FbChatBotLink"

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;   // 👈 mark params as a Promise
}) {
  const { id } = await params;       // 👈 await it here

  const { data: user, error } = await supabaseBrowser
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !user) {
    notFound();
  }

  return (
    <div className="mx-auto py-2">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/users">
          <ArrowLeft
            size={20}
            className="text-gray-500 hover:text-blue-600 cursor-pointer"
          />
        </Link>
      </div>

 
      <ShowUserId userId={id} />
      <GoogleSheet userId={id} />
      <FbChatBotLink userId={id} />
 

      <EditUserForm user={user} />
    </div>
  );
}
