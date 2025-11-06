'use client'
import React, { useEffect, useState } from "react";
import { User, Users, RatioIcon } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { AppDispatch } from "@/store/store";
import { useDispatch } from "react-redux";
import { setDashboardStats } from "@/store/features/dashboard/dashboardSlice";
import { LoadingSkeleton } from "@/components/userComponents/LoadingSkeleton";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler
);

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function AdminDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscribers: 0,
    totalRevenue: 0,
  });
  const [revenueINR, setRevenueINR] = useState<number>(0);
  const [revenueUSD, setRevenueUSD] = useState<number>(0);
  const [data, setData] = useState<number[]>([]);
  const [rotatedLabels, setRotatedLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const parseAmount = (raw: any) => {
    if (raw === null || raw === undefined || raw === "") return 0;
    if (typeof raw === "number") return raw;
    let s = String(raw).trim();
    s = s.replace(/\((.*)\)/, "-$1");
    s = s.replace(/[^0-9.\-]/g, "");
    const parts = s.split(".");
    if (parts.length > 2) {
      s = parts.shift() + "." + parts.join("");
    }
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
  };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const { count: usersCount, error: usersError } = await supabaseBrowser
        .from("users")
        .select("id", { count: "exact", head: true });

      if (usersError) {
        console.error("usersError", usersError);
        setLoading(false);
        return;
      }

      const { count: activeCount, error: activeError } = await supabaseBrowser
        .from("users")
        .select("id", { count: "exact", head: true })
        .not("subscription", "is", null);

      if (activeError) {
        console.error("activeSubscribersError", activeError);
        setLoading(false);
        return;
      }

      const { data: subData, error: subError } = await supabaseBrowser
        .from("user_subscription")
        .select("user_id, amount, created_at")
        .eq("status", "payment_successful");

      if (subError) {
        console.error("subError", subError);
        setLoading(false);
        return;
      }

      const totalRevenue =
        subData?.reduce(
          (sum, sub) => sum + (Number.parseFloat((sub as any).amount) || 0),
          0
        ) || 0;

      // fetch invoice totals split by payment_provider
      let totalINR = 0;
      let totalUSD = 0;
      try {
        const { data: invoiceData, error: invoiceError } = await supabaseBrowser
          .from("invoice")
          .select("amount, payment_provider");

        if (invoiceError) {
          console.error("invoiceError", invoiceError);
        } else {
          (invoiceData || []).forEach((inv: any) => {
            const amt = parseAmount(inv.amount);
            if (inv.payment_provider === "razorpay") totalINR += amt;
            else if (inv.payment_provider === "paypal") totalUSD += amt;
          });
        }
      } catch (err) {
        console.error("invoice fetch failed", err);
      }

      setStats({
        totalUsers: usersCount || 0,
        activeSubscribers: activeCount || 0,
        totalRevenue: totalRevenue || 0,
      });

      setRevenueINR(totalINR);
      setRevenueUSD(totalUSD);

      const currentYear = new Date().getFullYear();

      const { data: monthlyData, error: monthlyError } = await supabaseBrowser
        .from("user_subscription")
        .select("id, created_at")
        .eq("status", "payment_successful")
        .gte("created_at", `${currentYear}-01-01T00:00:00Z`)
        .lte("created_at", `${currentYear}-12-31T23:59:59Z`);

      if (monthlyError) {
        console.error("monthlyError", monthlyError);
        setLoading(false);
        return;
      }

      const monthlyCounts = Array(12).fill(0);
      (monthlyData || []).forEach((sub) => {
        const month = new Date(sub.created_at).getMonth(); 
        monthlyCounts[month]++;
      });

      const currentMonth = new Date().getMonth();
      const rotatedCounts = [
        ...monthlyCounts.slice(currentMonth),
        ...monthlyCounts.slice(0, currentMonth),
      ];
      const rotatedMonths = [
        ...months.slice(currentMonth),
        ...months.slice(0, currentMonth),
      ];

      setData(rotatedCounts);
      setRotatedLabels(rotatedMonths);

      dispatch(
        setDashboardStats({
          totalUsers: usersCount || 0,
          activeSubscribers: activeCount || 0,
          totalRevenue: totalRevenue || 0,
          chartData: monthlyCounts,
          chartLabels: rotatedMonths,
          SeminarTabName: ""
        })
      );

      setLoading(false);
    };

    fetchStats();
  }, [dispatch]);

  const subscriptionData = {
    labels: rotatedLabels,
    datasets: [
      {
        label: "Subscriptions",
        data: data,
        backgroundColor: "#3B82F6",
        borderRadius: 6,
      },
    ],
  };

  const ratio = stats.totalUsers > 0
    ? `${stats.activeSubscribers}:${stats.totalUsers}`
    : "0:0";

  const fmtINR = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);
  const fmtUSD = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="flex min-h-screen">
      <main className="min-w-[100%]">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-md shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="text-blue-500" />
                  <span className="font-semibold">Active Subscribers</span>
                </div>
                <p className="text-2xl font-bold">{stats.activeSubscribers}</p>
              </div>
              <div className="bg-white p-4 rounded-md shadow">
                <div className="flex items-center gap-2 mb-2">
                  <User className="text-blue-500" />
                  <span className="font-semibold text-md"> Revenue (INR)</span>
                </div>
                <p className="text-2xl font-bold">{fmtINR(revenueINR)}</p>
              </div>
              <div className="bg-white p-4 rounded-md shadow">
                <div className="flex items-center gap-2 mb-2">
                  <User className="text-blue-500" />
                  <span className="font-semibold"> Revenue (USD)</span>
                </div>
                <p className="text-2xl font-bold">{fmtUSD(revenueUSD)}</p>
              </div>
              <div className="bg-white p-4 rounded-md shadow">
                <div className="flex items-center gap-2 mb-2">
                  <RatioIcon className="text-blue-500" />
                  <span className="font-semibold">Users to Subscribers Ratio</span>
                </div>
                <p className="text-2xl font-bold">
                  {ratio}
                </p>
              </div>
            </div>

            <div className="">
              <div className="bg-white p-4 rounded-md shadow h-[300px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Subscriptions by Month</h3>
                  <button className="text-sm text-blue-600 border rounded px-2 py-1">
                    All
                  </button>
                </div>
                <div className="h-[220px]" id="subscriptionChart">
                  <Bar
                    data={subscriptionData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          ticks: {
                            precision: 0,
                            stepSize: 1,
                          },
                          beginAtZero: true,
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
