'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Skeleton from '@/components/Skeleton';
import Navbar from '@/components/Navbar';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function EarningsClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'monthly'>('categories');
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const startDefault = thirtyDaysAgo.toISOString().split('T')[0];
  const endDefault = today.toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({ start: startDefault, end: endDefault });
  const [data, setData] = useState<{ totalRevenue: number; totalExpenses: number; profit: number; pieData: any[]; monthlyTrend: any[] } | null>(null);

  const fetchStats = async (start: string, end: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?start=${start}&end=${end}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'categories') {
        fetchStats(dateRange.start, dateRange.end);
    } else {
        // Fetch full year for trend
        fetchStats(`${selectedYear}-01-01`, `${selectedYear}-12-31`);
    }
  }, [activeTab, dateRange, selectedYear]);

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 transition-colors pb-12">
      <Navbar activePage="Financials" />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Controls Bar */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-800 shadow-sm mb-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
                <button 
                    onClick={() => setActiveTab('categories')}
                    className={`px-6 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'categories' ? 'bg-white dark:bg-gray-900 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                    CATEGORIES
                </button>
                <button 
                    onClick={() => setActiveTab('monthly')}
                    className={`px-6 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'monthly' ? 'bg-white dark:bg-gray-900 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                    MONTHLY TREND
                </button>
            </div>

            {/* Conditional Filter Display */}
            {activeTab === 'categories' ? (
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">From</span>
                        <input type="date" value={dateRange.start} onChange={(e) => handleDateChange('start', e.target.value)} className="border dark:border-gray-700 rounded px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">To</span>
                        <input type="date" value={dateRange.end} onChange={(e) => handleDateChange('end', e.target.value)} className="border dark:border-gray-700 rounded px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Select Year</span>
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="border dark:border-gray-700 rounded px-4 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    >
                        {[currentYear, currentYear - 1, currentYear - 2].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Revenue */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded shadow-lg p-6 text-white overflow-hidden relative group">
                <h3 className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Period Revenue</h3>
                {loading ? <Skeleton className="h-10 w-32 bg-white/20" /> : <div className="text-4xl font-black tracking-tighter">₹{data?.totalRevenue.toLocaleString()}</div>}
                <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-[-20deg] translate-x-1/2"></div>
            </div>

            {/* Expenses */}
            <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded shadow-lg p-6 text-white overflow-hidden relative group">
                <h3 className="text-rose-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Period Expenses</h3>
                {loading ? <Skeleton className="h-10 w-32 bg-white/20" /> : <div className="text-4xl font-black tracking-tighter">₹{data?.totalExpenses.toLocaleString()}</div>}
                <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-[-20deg] translate-x-1/2"></div>
            </div>

            {/* Profit */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded shadow-lg p-6 text-white overflow-hidden relative group">
                <h3 className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Net Profit</h3>
                {loading ? <Skeleton className="h-10 w-32 bg-white/20" /> : <div className="text-4xl font-black tracking-tighter">₹{data?.profit.toLocaleString()}</div>}
                <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-[-20deg] translate-x-1/2"></div>
            </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'categories' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 shadow-sm p-8 transition-colors">
                    <h3 className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Revenue Breakdown</h3>
                    {loading ? (
                        <Skeleton className="h-72 w-full" />
                    ) : data?.pieData && data.pieData.length > 0 ? (
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`} outerRadius={90} dataKey="value">
                                        {data.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(val: any) => `₹${Number(val).toLocaleString()}`}
                                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                        itemStyle={{ color: 'var(--foreground)' }}
                                        labelStyle={{ color: 'var(--foreground)' }}
                                    />
                                    <Legend iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-72 flex items-center justify-center text-gray-400 text-sm italic">No records found.</div>
                    )}
                </div>
                <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col transition-colors">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"><h3 className="text-gray-700 dark:text-gray-300 font-bold text-[10px] uppercase tracking-widest">Category List</h3></div>
                    <div className="flex-1 overflow-y-auto max-h-[400px]">
                        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-50 dark:divide-gray-800">
                                {loading ? [1,2,3,4,5].map(i => <tr key={i}><td className="px-6 py-4"><Skeleton className="h-4 w-full" /></td></tr>) : 
                                 data?.pieData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <span className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[120px]">{item.name}</span>
                                                </div>
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">₹{Math.round(item.value).toLocaleString()}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        ) : (
            <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 shadow-sm p-8 animate-in fade-in slide-in-from-bottom-2 duration-500 transition-colors">
                <h3 className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-10">Monthly Performance Trend</h3>
                {loading ? (
                    <Skeleton className="h-80 w-full" />
                ) : data?.monthlyTrend && data.monthlyTrend.length > 0 ? (
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.monthlyTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#9ca3af' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#9ca3af' }} tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`} />
                                <Tooltip 
                                    cursor={{ fill: 'var(--secondary)' }} 
                                    formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Revenue']} 
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)', borderRadius: '4px', fontSize: '12px' }} 
                                    itemStyle={{ color: 'var(--foreground)' }}
                                    labelStyle={{ color: 'var(--foreground)' }}
                                />
                                <Bar dataKey="revenue" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-80 flex items-center justify-center text-gray-400 text-sm italic">Insufficient data for {selectedYear}.</div>
                )}
            </div>
        )}

      </main>
    </div>
  );
}
