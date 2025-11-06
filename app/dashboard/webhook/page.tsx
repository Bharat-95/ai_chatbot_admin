// app/dashboard/webhook/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "lucide-react";

function isValidUrl(url: string) {
  try {
    const u = new URL(url);
    return ["https:", "http:"].includes(u.protocol) && !!u.host;
  } catch {
    return false;
  }
}

export default function FbWebhookAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentWebhook, setCurrentWebhook] = useState<string>("");
  const [newWebhook, setNewWebhook] = useState<string>("");

  const [mixedValues, setMixedValues] = useState<string[] | null>(null);

  useEffect(() => {
    const fetchCurrent = async () => {
      setLoading(true);
      try {
      
        const { data, error } = await supabaseBrowser
          .from("users")
          .select("fb_chatbot_webhook")
          .limit(2000); 

        if (error) throw error;

        const values = Array.from(
          new Set(
            (data || [])
              .map((r: any) => r.fb_chatbot_webhook || "")
              .map((v) => v.trim())
          )
        );

    
        const nonEmpty = values.find((v) => v.length > 0) || "";
        setCurrentWebhook(nonEmpty);
        setNewWebhook(nonEmpty);

      
        const filtered = values.filter((v) => v.length > 0);
        if (filtered.length > 1) {
          setMixedValues(filtered.slice(0, 5)); 
        } else {
          setMixedValues(null);
        }
      } catch (err: any) {
        console.error("[fb-webhook] fetch error:", err);
        showToast({ title: "Error", description: "Failed to load current webhook." });
      } finally {
        setLoading(false);
      }
    };

    fetchCurrent();
  }, []);

  const handleSave = async () => {
    const val = newWebhook.trim();
    if (!val) {
      showToast({ title: "Validation", description: "Webhook cannot be empty." });
      return;
    }
    if (!isValidUrl(val)) {
      showToast({ title: "Validation", description: "Please enter a valid URL (http/https)." });
      return;
    }

    if (!confirm("This will update the webhook for ALL users. Continue?")) {
      return;
    }

    setSaving(true);
    try {
    
      const { error } = await supabaseBrowser
        .from("users")
        .update({ fb_chatbot_webhook: val })
         .not("id", "is", null);

      if (error) throw error;

      setCurrentWebhook(val);
      showToast({ title: "Success", description: "Webhook updated for all users." });
      setMixedValues(null);
    } catch (err: any) {
      console.error("[fb-webhook] save error:", err);
      showToast({ title: "Error", description: err.message || "Update failed." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-semibold mb-6">FB Chatbot Webhook</h1>

      {loading ? (
        <div className="flex justify-center"><Loader className=" animate-spin text-blue-600 w-7 h-7" /></div>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Current webhook</label>
            <div className="w-full border rounded-md px-3 py-2 bg-gray-50 text-sm break-all">
              {currentWebhook || <span className="text-gray-400 italic">not set</span>}
            </div>
          </div>

          {mixedValues && (
            <div className="mb-4 p-3 border border-amber-300 bg-amber-50 rounded-md text-sm">
              <div className="font-medium mb-1">Multiple values detected across users:</div>
              <ul className="list-disc pl-5 space-y-1">
                {mixedValues.map((v, i) => (
                  <li key={i} className="break-all">{v}</li>
                ))}
              </ul>
              <div className="mt-2">
                Saving a new webhook here will normalize it for all users.
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm text-gray-600 mb-1">New webhook</label>
            <Input
              type="url"
              value={newWebhook}
              onChange={(e) => setNewWebhook(e.target.value)}
              placeholder="https://your-webhook.example.com/endpoint"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use a full URL (http/https). This will be applied to every user.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setNewWebhook(currentWebhook)}>
              Reset
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer" onClick={handleSave} disabled={saving}>
              {saving ? "Updating…" : "Save for all users"}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
