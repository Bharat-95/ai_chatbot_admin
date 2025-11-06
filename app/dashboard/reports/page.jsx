"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Line, Bar } from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
} from "chart.js";
import {
  Card,
  Card1,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Users, ArrowLeft, CheckCircle } from "lucide-react";
import moment from "moment";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { LoadingSkeleton } from "@/components/userComponents/LoadingSkeleton";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const sharedChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" },
    title: { display: true },
  },
  scales: {
    x: { title: { display: true, text: "Date" } },
    y: { title: { display: true, text: "Count" } },
  },
};

export default function ReportsPage() {
  const [reportsList, setReportsList] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [kpiStats, setKpiStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    ratio: 0,
  });
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("all");

  const reportRef = useRef(null);

  const fetchInitialKpiStats = async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from("cron_reports")
        .select("data")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.error("Error fetching KPI stats:", error?.message);
        return { totalUsers: 0, activeSubscriptions: 0, ratio: 0 };
      }

      const report = data.data;

      // ✅ match your JSON keys
      const totalUsers = report?.engagement?.total_users ?? 0;
      const activeSubscriptions =
        report?.subscriptions?.total_subscriptions ?? 0;
      const ratio = `${activeSubscriptions}: ${totalUsers}`;

      return { totalUsers, activeSubscriptions, ratio };
    } catch (error) {
      console.error("Error in fetchInitialKpiStats:", error);
      return { totalUsers: 0, activeSubscriptions: 0, ratio: 0 };
    }
  };

  const fetchReportsList = async () => {
    try {
      let query = supabaseBrowser.from("cron_reports").select("*");
      if (reportType !== "all") query = query.eq("type", reportType);
      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching reports from Supabase:", error.message);
        return [];
      }
      return (data || []).map((row) => ({ ...row, parsed: row.data }));
    } catch (error) {
      console.error("Error in fetchReportsList:", error);
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [kpiData, reportsData] = await Promise.all([
        fetchInitialKpiStats(),
        fetchReportsList(),
      ]);
      setKpiStats(kpiData);
      setReportsList(reportsData);
      setLoading(false);
    };
    fetchData();
  }, [reportType]);

  const handleReportClick = (report) => setSelectedReport(report);

  const renderKpiCards = (stats) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card1>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Total Users</CardTitle>
          <Users className="h-5 w-5 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
        </CardContent>
      </Card1>

      <Card1>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Total Subscribers</CardTitle>
          <CheckCircle className="h-5 w-5 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
        </CardContent>
      </Card1>

      <Card1>
        <CardHeader>
          <CardTitle>Users-to-Subscribers Ratio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.ratio}</div>
        </CardContent>
      </Card1>
    </div>
  );

  return (
    <div className="min-h-screen">
      {!selectedReport ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <div></div>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
             <LoadingSkeleton />

          ) : (
            <>
              {renderKpiCards(kpiStats)}
              <div className="space-y-4">
                {reportsList.length > 0 ? (
                  reportsList.map((report) => (
                    <Card1
                      key={report.id}
                      className="cursor-pointer hover:shadow-lg"
                      onClick={() => handleReportClick(report)}
                    >
                      <CardContent className="flex items-center p-4">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full capitalize bg-blue-100 text-blue-800">
                          {report.type}
                        </span>
                        <span className="ml-4 text-sm text-gray-700">
                          {moment(report.data.from).format("MMM D, YYYY")} →{" "}
                          {moment(report.data.to).format("MMM D, YYYY")}
                        </span>
                      </CardContent>
                    </Card1>
                  ))
                ) : (
                  <div className="text-center text-gray-500 mt-10">
                    No reports found.
                  </div>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <div ref={reportRef}>
          <div className="flex items-center mb-6">
            <button
              onClick={() => setSelectedReport(null)}
              className="p-2 mr-4 rounded-full hover:bg-gray-200"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Card1>
              <CardHeader>
                <CardTitle>Dashboard Last Opened</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  {selectedReport.data.engagement?.website_openers ?? "0"}
                </div>
              </CardContent>
            </Card1>

            <Card1>
              <CardHeader>
                <CardTitle>Bot Last Opened</CardTitle>
              </CardHeader>
              <CardContent>
                <div>{selectedReport.data.engagement?.bot_openers ?? "0"}</div>
              </CardContent>
            </Card1>
          </div>

         <Card1 className="lg:col-span-2">
  <CardHeader>
    <CardTitle>Website vs Bot Engagement</CardTitle>
  </CardHeader>
  <CardContent className="h-80">
    {selectedReport?.data?.engagement ? (
      <Bar
        data={{
          labels: ["Website", "Bot"],
          datasets: [
            {
              label: "Openers",
              data: [
                selectedReport.data.engagement.website_openers ?? 0,
                selectedReport.data.engagement.bot_openers ?? 0,
              ],
              backgroundColor: [
                "rgba(54, 162, 235, 0.6)",  // Website (blue)
                "rgba(255, 99, 132, 0.6)",  // Bot (red)
              ],
              borderColor: [
                "rgba(54, 162, 235, 1)",
                "rgba(255, 99, 132, 1)",
              ],
              borderWidth: 1,
            },
          ],
        }}
        options={{
          ...sharedChartOptions,
          indexAxis: "x", // keeps it vertical (use "y" for horizontal bars)
          scales: {
            x: { title: { display: true, text: "Platform" } },
            y: { title: { display: true, text: "Openers" }, beginAtZero: true },
          },
        }}
      />
    ) : (
      <div className="flex items-center justify-center h-full text-gray-500">
        No data available
      </div>
    )}
  </CardContent>
</Card1>



        </div>
      )}
    </div>
  );
}
