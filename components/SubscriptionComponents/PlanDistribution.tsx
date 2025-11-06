"use client"; // Add this directive at the top

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

interface PlanData {
  _id: string;
  count: number;
}

interface PlanDistributionProps {
  stats?: {
    plans?: PlanData[];
  };
}

const PlanDistribution = ({ stats }: PlanDistributionProps) => {
  if (!stats?.plans) return null;

  // Calculate total for percentage calculations
  const total = stats.plans.reduce((sum, plan) => sum + plan.count, 0);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={stats.plans}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
            nameKey="_id"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {stats.plans.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => {
              const percentage = ((value / total) * 100).toFixed(2);
              return [`${value} (${percentage}%)`];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PlanDistribution;