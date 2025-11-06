"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";

type User = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  subscription: string | null;
  status: string | null;
  role: string | null;
  panda3_bot: boolean | null;
  new_user: boolean | null;
  is_anonymous: boolean | null;
  website_last_opened: string | null;
  fb_chatbot_trail_start_date: string | null;
  fb_chatbot_trail_expiry_date: string | null;
  fb_chatbot_trail_active: boolean | null;
  fb_chatbot_last_opened: string | null;
  fb_chatbot_last_version: string | null;
  fb_chatbot_subscription_name: string | null;
  fb_chatbot_subscription_active: boolean | null;
  fb_chatbot_subscription_expiry_date: string | null;
  fb_chatbot_webhook: string | null;
  fb_chatbot_open_ai_id: string | null;
  fb_chatbot_prompt: string | null;
  fb_chatbot_user_blocked: boolean | null;
  fb_chatbot_leads_gs_link: string | null;
};

export default function EditUserForm({ user }: { user: User }) {
  const router = useRouter();
  const [formData, setFormData] = useState<User>({ ...user });
  const [loading, setLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false); // New state for superadmin check

  // Use useEffect to fetch the logged-in user's role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { session }, error: sessionError } = await supabaseBrowser.auth.getSession();
      
      if (session && !sessionError) {
        const { data: loggedInUser, error: roleError } = await supabaseBrowser
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (!roleError && loggedInUser) {
          setIsSuperadmin(loggedInUser.role === "superadmin");
        }
      }
    };

    fetchUserRole();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheckbox = (field: keyof User) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabaseBrowser
      .from("users")
      .update(formData)
      .eq("id", user.id);

    setLoading(false);

    if (!error) {
      router.push("/dashboard/users");
      router.refresh();
    } else {
      alert("Error updating user: " + error.message);
    }
  };

  const handleBlockToggle = async () => {
    setBlockLoading(true);

    const newStatus = !(formData.fb_chatbot_user_blocked ?? false);

    const { error } = await supabaseBrowser
      .from("users")
      .update({ fb_chatbot_user_blocked: newStatus })
      .eq("id", user.id);

    setBlockLoading(false);

    if (!error) {
      setFormData((prev) => ({
        ...prev,
        fb_chatbot_user_blocked: newStatus,
      }));
      router.refresh();
    } else {
      alert("Error updating block status: " + error.message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-4 grid grid-cols-2 gap-4"
    >
      {/* Text Fields */}
      <InputField
        label="Name"
        name="name"
        value={formData.name ?? ""}
        onChange={handleChange}
      />
      <InputField
        label="Email"
        name="email"
        value={formData.email ?? ""}
        onChange={handleChange}
      />
      <InputField
        label="Phone"
        name="phone"
        value={formData.phone ?? ""}
        onChange={handleChange}
      />
      <div>
        <label className="block text-sm font-semibold text-gray-700">
          Subscription
        </label>
        <select
          name="subscription"
          value={formData.subscription ?? ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md p-2 border border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
        >
          <option value="">Select Subscription</option>
          <option value="Trial Run">Trial Run</option>
          <option value="Foundation Pack">Foundation Pack</option>
          <option value="Growth Engine">Growth Engine</option>
          <option value="Ultimate Advantage">Ultimate Advantage</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700">
          Status
        </label>
        <select
          name="status"
          value={formData.status ?? ""}
          onChange={handleChange}
          className="mt-1 block w-full p-2  rounded-md border border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
        >
          <option value="">Select Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Dates */}
      <InputField
        label="Website Last Opened"
        type="datetime-local"
        name="website_last_opened"
        value={formData.website_last_opened ?? ""}
        onChange={handleChange}
      />
      <InputField
        label="FB Trail Start Date"
        type="date"
        name="fb_chatbot_trail_start_date"
        value={formData.fb_chatbot_trail_start_date ?? ""}
        onChange={handleChange}
      />

      <InputField
        label="FB Trail Expiry Date"
        type="date"
        name="fb_chatbot_trail_expiry_date"
        value={formData.fb_chatbot_trail_expiry_date ?? ""}
        onChange={handleChange}
      />
      <InputField
        label="FB Last Opened"
        type="datetime-local"
        name="fb_chatbot_last_opened"
        value={formData.fb_chatbot_last_opened ?? ""}
        onChange={handleChange}
      />
      <InputField
        label="FB Subscription Expiry"
        type="datetime-local"
        name="fb_chatbot_subscription_expiry_date"
        value={formData.fb_chatbot_subscription_expiry_date ?? ""}
        onChange={handleChange}
      />

      <div className="col-span-2">
        <label className="block text-sm font-semibold text-gray-700">
          FB Chatbot Prompt
        </label>
        <Textarea
          name="fb_chatbot_prompt"
          value={formData.fb_chatbot_prompt ?? ""}
          onChange={(e) => {
            // Allow superadmins to bypass the 3000-character limit
            if (isSuperadmin || e.target.value.length <= 3000) {
              handleChange(e);
            }
          }}
          // Disable the field only for non-superadmins who don't have the "Ultimate Advantage" plan
          disabled={!isSuperadmin && formData.subscription !== "Ultimate Advantage"}
          className={`${
            !isSuperadmin && formData.subscription !== "Ultimate Advantage"
              ? "bg-gray-100 cursor-not-allowed"
              : ""
          }`}
        />
        {/* The character limit warning is now only shown to non-superadmins */}
        {!isSuperadmin && formData.fb_chatbot_prompt && formData.fb_chatbot_prompt.length >= 3000 && (
          <p className="text-red-500 text-sm mt-1">
            Maximum 3000 characters allowed
          </p>
        )}
        {/* The character counter is also only shown to non-superadmins */}
        {!isSuperadmin && (
          <p className="text-xs text-gray-500 mt-1">
            {formData.fb_chatbot_prompt?.length ?? 0}/3000 characters
          </p>
        )}
      </div>

      {/* Boolean Switches */}
      <SwitchField
        label="Panda3 Bot"
        checked={formData.panda3_bot ?? false}
        onChange={() => handleCheckbox("panda3_bot")}
      />
      <SwitchField
        label="New User"
        checked={formData.new_user ?? false}
        onChange={() => handleCheckbox("new_user")}
      />
      <SwitchField
        label="Anonymous"
        checked={formData.is_anonymous ?? false}
        onChange={() => handleCheckbox("is_anonymous")}
      />
      <SwitchField
        label="FB Trail Active"
        checked={formData.fb_chatbot_trail_active ?? false}
        onChange={() => handleCheckbox("fb_chatbot_trail_active")}
      />
      <SwitchField
        label="FB Subscription Active"
        checked={formData.fb_chatbot_subscription_active ?? false}
        onChange={() => handleCheckbox("fb_chatbot_subscription_active")}
      />
      <SwitchField
        label="FB User Blocked"
        checked={formData.fb_chatbot_user_blocked ?? false}
        onChange={() => handleCheckbox("fb_chatbot_user_blocked")}
      />

      {/* Extra fields */}
      <InputField
        label="FB Last Version"
        name="fb_chatbot_last_version"
        value={formData.fb_chatbot_last_version ?? ""}
        onChange={handleChange}
      />
      <InputField
        label="FB Subscription Name"
        name="fb_chatbot_subscription_name"
        value={formData.fb_chatbot_subscription_name ?? ""}
        onChange={handleChange}
      />
      <InputField
        label="FB Webhook"
        name="fb_chatbot_webhook"
        value={formData.fb_chatbot_webhook ?? ""}
        onChange={handleChange}
      />
      <InputField
        label="FB OpenAI ID"
        name="fb_chatbot_open_ai_id"
        value={formData.fb_chatbot_open_ai_id ?? ""}
        onChange={handleChange}
      />
      <InputField
        label="FB Leads GS Link"
        name="fb_chatbot_leads_gs_link"
        value={formData.fb_chatbot_leads_gs_link ?? ""}
        onChange={handleChange}
      />

      {/* Submit + Block Toggle */}
      <div className="col-span-2 flex gap-4">
        <Link
          href={`/dashboard/users/${user.id}`}
          className="w-48 py-2 px-3 text-md rounded-lg text-white disabled:opacity-50 bg-gray-600"
        >
          Previous Subscriptions
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="w-48 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update User"}
        </button>

        <button
          type="button"
          onClick={handleBlockToggle}
          disabled={blockLoading}
          className={`w-48 py-2 px-3 rounded-lg text-white disabled:opacity-50 ${
            formData.fb_chatbot_user_blocked
              ? "bg-green-600 hover:bg-green-500"
              : "bg-red-600 hover:bg-red-500"
          }`}
        >
          {blockLoading
            ? "Processing..."
            : formData.fb_chatbot_user_blocked
            ? "Unblock User"
            : "Block User"}
        </button>
      </div>
    </form>
  );
}

// 🔹 Reusable Field Components
function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: any;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <Input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
      />
    </div>
  );
}

function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <label className="text-sm font-semibold text-gray-700">{label}</label>
    </div>
  );
}