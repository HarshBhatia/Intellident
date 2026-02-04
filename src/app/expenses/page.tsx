'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import Skeleton from '@/components/Skeleton';

interface Expense {
    id: number;
    date: string;
    amount: number;
    category: string;
    description: string;
}

export default function ExpensesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Default range: Last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const [dateRange, setDateRange] = useState({
      start: thirtyDaysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
  });

  // Form State
  const [form, setForm] = useState({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      category: '',
      description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch expenses based on current date range
      const [expRes, catRes] = await Promise.all([
          fetch(`/api/expenses?start=${dateRange.start}&end=${dateRange.end}`),
          fetch('/api/expense-categories')
      ]);
      if (expRes.ok) setExpenses(await expRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (e) {
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [dateRange]);

  const filteredExpenses = useMemo(() => {
      return expenses.filter(e => 
          e.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [expenses, searchTerm]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.category) return;

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        showToast('Expense added', 'success');
        setForm({ ...form, amount: '', description: '' });
        fetchData();
      }
    } catch (e) { showToast('Error saving', 'error'); }
  };

  const handleDelete = async (id: number) => {
      if (!confirm('Delete this record?')) return;
      try {
          const res = await fetch('/api/expenses', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id })
          });
          if (res.ok) {
              showToast('Deleted', 'success');
              fetchData();
          }
      } catch (e) { showToast('Error', 'error'); }
  };

  const total = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-12">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10 text-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
             <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
               <div className="bg-red-600 text-white p-1 rounded shadow-sm">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               </div>
               <span className="font-bold text-xl tracking-tight">IntelliDent</span>
               <span className="text-gray-300 hidden sm:inline">|</span>
               <span className="text-gray-500 font-medium hidden sm:inline">Expense Tracker</span>
             </div>
             <button onClick={() => router.push('/')} className="text-sm text-blue-600 font-bold hover:underline tracking-tight">← Back</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Add Form */}
            <div className="lg:col-span-2 bg-white p-6 rounded border border-gray-200 shadow-sm">
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Log New Expense</h2>
                <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 tracking-widest">Date</label>
                        <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-2 border rounded-md text-sm outline-none bg-gray-50 focus:bg-white transition" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 tracking-widest">Category</label>
                        <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-2 border rounded-md text-sm outline-none bg-gray-50 focus:bg-white transition h-[38px] cursor-pointer" required>
                            <option value="">Select Category</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 tracking-widest">Amount (₹)</label>
                        <input type="number" placeholder="0" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full p-2 border rounded-md text-sm outline-none bg-gray-50 focus:bg-white transition h-[38px]" required />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 tracking-widest">Description</label>
                        <input type="text" placeholder="Details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-2 border rounded-md text-sm outline-none bg-gray-50 focus:bg-white transition h-[38px]" />
                    </div>
                    <button type="submit" className="sm:col-span-2 bg-red-600 text-white font-bold py-2.5 rounded shadow hover:bg-red-700 transition uppercase tracking-widest text-[10px]">Add Expense Entry</button>
                </form>
            </div>

            {/* Total Summary */}
            <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded shadow-lg p-8 text-white flex flex-col justify-center items-center text-center">
                <h3 className="text-rose-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Period Expenses</h3>
                {loading ? <Skeleton className="h-10 w-32 bg-white/20" /> : <div className="text-5xl font-black tracking-tighter italic">₹{total.toLocaleString()}</div>}
                <p className="text-rose-100/60 text-[10px] font-bold uppercase tracking-widest mt-4 italic">Filtered selection</p>
            </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full md:max-w-xs">
                <input 
                    type="text"
                    placeholder="Search category or details..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded shadow-sm focus:ring-2 focus:ring-red-500 outline-none text-sm text-gray-900 bg-white transition-all"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">From</span>
                    <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="border rounded px-2 py-1.5 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">To</span>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="border rounded px-2 py-1.5 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-red-500" />
                </div>
            </div>
        </div>

        {/* Expense History Table */}
        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden text-gray-900">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="text-gray-700 font-bold text-[10px] uppercase tracking-widest">Expense Records</h3>
                <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">{filteredExpenses.length} Matches</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-widest text-[9px] font-bold">
                        <tr>
                            <th className="px-6 py-3 text-left">Date</th>
                            <th className="px-6 py-3 text-left">Category</th>
                            <th className="px-6 py-3 text-left">Description</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                            <th className="px-6 py-3 text-center w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {loading ? [1,2,3,4].map(i => <tr key={i}><td colSpan={5} className="px-6 py-4"><Skeleton className="h-4 w-full" /></td></tr>) : 
                         filteredExpenses.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No records matching your filters.</td></tr> :
                         filteredExpenses.map((e) => (
                            <tr key={e.id} className="hover:bg-red-50/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-600">{e.date}</td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-1 rounded border border-gray-200 uppercase tracking-tight">{e.category}</span></td>
                                <td className="px-6 py-4 text-gray-500 italic max-w-xs truncate">{e.description || '—'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-red-600 font-mono">₹{Number(e.amount).toLocaleString()}</td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={() => handleDelete(e.id)} className="text-red-300 hover:text-red-600 transition text-lg leading-none">×</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </main>
    </div>
  );
}