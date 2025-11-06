"use client"; // Add this directive at the top

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ChartData {
  name: string;
  value: number;
}

interface SubscriptionStats {
  currentMonthCount?: number;
  newSubscriptions?: number;
  churnedSubscriptions?: number;
  mrr?: number;
}

const SubscriptionChart = ({ stats }: { stats?: SubscriptionStats }) => {
  // Prepare data for the chart
  const chartData: ChartData[] = [
    {
      name: 'Active',
      value: stats?.currentMonthCount || 0,
    },
    {
      name: 'New',
      value: stats?.newSubscriptions || 0,
    },
    {
      name: 'Churned',
      value: stats?.churnedSubscriptions || 0,
    },
    {
      name: 'MRR',
      value: stats?.mrr ? Math.round(stats.mrr) : 0,
    }
  ];

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === 'MRR') return [`$${value}`, 'Monthly Revenue'];
              return [value, name];
            }}
          />
          <Legend />
          <Bar 
            dataKey="value" 
            name="Subscriptions" 
            fill="#8884d8" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SubscriptionChart;