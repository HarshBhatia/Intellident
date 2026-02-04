'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff6b6b'];

export default function EarningsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Default to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({ start: firstDay, end: lastDay });
  const [data, setData] = useState<{ totalRevenue: number; pieData: any[] } | null>(null);

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?start=${dateRange.start}&end=${dateRange.end}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
             <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
               <span className="font-bold text-xl text-gray-800">IntelliDent</span>
               <span className="text-gray-400">|</span>
               <span className="text-gray-600 font-medium">Earnings</span>
             </div>
             <button onClick={() => router.push('/')} className="text-sm text-blue-600 hover:underline">
                Back to Dashboard
             </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Controls */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-center justify-between">
            <h1 className="text-lg font-bold text-gray-700">Financial Overview</h1>
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">From:</span>
                <input 
                    type="date" 
                    value={dateRange.start} 
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="border rounded p-1 text-sm text-gray-700"
                />
                <span className="text-sm text-gray-500">To:</span>
                <input 
                    type="date" 
                    value={dateRange.end} 
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="border rounded p-1 text-sm text-gray-700"
                />
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Revenue Card */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white md:col-span-1">
                <h3 className="text-green-100 text-sm font-medium uppercase tracking-wider mb-1">Total Revenue</h3>
                {loading ? (
                    <div className="h-10 w-24 bg-green-400 animate-pulse rounded"></div>
                ) : (
                    <div className="text-4xl font-bold">₹{data?.totalRevenue.toLocaleString()}</div>
                )}
                <p className="text-green-100 text-xs mt-2 opacity-80">
                    {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
                </p>
            </div>

            {/* Breakdown Chart */}
            <div className="bg-white rounded-lg shadow p-6 md:col-span-2 flex flex-col">
                <h3 className="text-gray-700 font-bold mb-4">Revenue by Treatment</h3>
                {loading ? (
                    <div className="h-64 bg-gray-100 animate-pulse rounded"></div>
                ) : data?.pieData && data.pieData.length > 0 ? (
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {data.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        No data available for this period.
                    </div>
                )}
            </div>
        </div>

        {/* Detailed List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-gray-700 font-bold">Category Breakdown</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Treatment Category</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Generated</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                        [1,2,3].map(i => (
                            <tr key={i}><td colSpan={2} className="px-6 py-4"><div className="h-4 bg-gray-100 animate-pulse rounded"></div></td></tr>
                        ))
                    ) : data?.pieData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                                {item.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-mono">
                                ₹{item.value.toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

      </main>
    </div>
  );
}
