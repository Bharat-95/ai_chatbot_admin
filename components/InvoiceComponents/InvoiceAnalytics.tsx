import { useSelector } from 'react-redux';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface InvoiceState {
  invoices: any[];
  loading: boolean;
  error: string | null;
}

const statusColors = {
  'Pending': '#6366f1',
  'Approved': '#10b981',
  'Rejected': '#ef4444'
};

const monthlyColors = [
  '#8b5cf6',
  '#7c3aed',
  '#6d28d9',
  '#5b21b6',
  '#4c1d95'
];

// Simple SVG icons
const PieChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
    <path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
);

const BarChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10"/>
    <line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="16"/>
  </svg>
);

const InvoiceAnalytics = () => {
  const { invoices = [] } = useSelector((state: { invoices: InvoiceState }) => state.invoices);
  const safeInvoices = Array.isArray(invoices) ? invoices : [];

  // Status data with percentage calculation
  const statusData = [
    { name: 'Pending', count: safeInvoices.filter(i => i.status === 'pending').length },
    { name: 'Approved', count: safeInvoices.filter(i => i.status === 'approved').length },
    { name: 'Rejected', count: safeInvoices.filter(i => i.status === 'rejected').length },
  ].map(item => ({
    ...item,
    percentage: safeInvoices.length > 0 
      ? Math.round((item.count / safeInvoices.length) * 100) 
      : 0
  }));

  // Monthly data with sorting
  const monthlyData = safeInvoices.reduce((acc, invoice) => {
    const month = invoice?.month?.split(' ')[0] || 'Unknown';
    const existing = acc.find(item => item.name === month);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: month, count: 1 });
    }
    return acc;
  }, [] as Array<{ name: string; count: number }>)
  .sort((a, b) => b.count - a.count);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-100">
          <p className="font-semibold text-gray-800">{label}</p>
          <p className="text-sm">
            <span className="text-gray-600">Count:</span>{' '}
            <span className="font-medium">{payload[0].value}</span>
          </p>
          {payload[0].payload.percentage !== undefined && (
            <p className="text-sm">
              <span className="text-gray-600">Percentage:</span>{' '}
              <span className="font-medium">{payload[0].payload.percentage}%</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Status Card */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Invoice Status Distribution</h3>
            <PieChartIcon />
          </div>
          <p className="text-sm text-gray-500">Breakdown of invoices by approval status</p>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }} />
                <Bar dataKey="count" barSize={24} radius={[0, 4, 4, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={statusColors[entry.name as keyof typeof statusColors]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center space-x-6">
            {statusData.map((status) => (
              <div key={status.name} className="flex flex-wrap items-center">
                <span 
                  className="h-3 w-3 rounded-full mr-2" 
                  style={{ backgroundColor: statusColors[status.name as keyof typeof statusColors] }}
                />
                <span className="text-sm text-gray-600">
                  {status.name}: {status.count} ({status.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Card */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Monthly Invoice Volume</h3>
            <BarChartIcon />
          </div>
          <p className="text-sm text-gray-500">Invoice submission trends by month</p>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} />
                <Bar dataKey="count" barSize={32} radius={[4, 4, 0, 0]}>
                  {monthlyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={monthlyColors[index % monthlyColors.length]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center text-sm text-gray-500">
            {monthlyData.length > 0 ? (
              <p>
                Highest volume in <span className="font-medium text-gray-700">{monthlyData[0].name}</span> with{' '}
                <span className="font-medium text-gray-700">{monthlyData[0].count}</span> invoices
              </p>
            ) : (
              <p>No monthly data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


export default InvoiceAnalytics