'use client';

import { useState, useEffect } from 'react';
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
      const [expRes, catRes] = await Promise.all([
          fetch('/api/expenses'),
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

  useEffect(() => { fetchData(); }, []);

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

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-12">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
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
             <button onClick={() => router.push('/')} className="text-sm text-blue-600 font-bold hover:underline">← Back</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Quick Add and Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Add Form */}
            <div className="lg:col-span-2 bg-white p-6 rounded border border-gray-200 shadow-sm">
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Log New Expense</h2>
                <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Date</label>
                        <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-2 border rounded-md text-sm outline-none bg-gray-50" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Category</label>
                        <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-2 border rounded-md text-sm outline-none bg-gray-50" required>
                            <option value="">Select Category</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Amount (₹)</label>
                        <input type="number" placeholder="0" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full p-2 border rounded-md text-sm outline-none bg-gray-50" required />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Description (Optional)</label>
                        <input type="text" placeholder="Details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-2 border rounded-md text-sm outline-none bg-gray-50" />
                    </div>
                    <button type="submit" className="sm:col-span-2 bg-red-600 text-white font-bold py-2 rounded shadow hover:bg-red-700 transition uppercase tracking-widest text-xs mt-2">Add Expense</button>
                </form>
            </div>

            {/* Total Summary */}
            <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded shadow-lg p-8 text-white flex flex-col justify-center items-center text-center">
                <h3 className="text-rose-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Logged Expenses</h3>
                {loading ? <Skeleton className="h-10 w-32 bg-white/20" /> : <div className="text-5xl font-black tracking-tighter italic">₹{total.toLocaleString()}</div>}
                <p className="text-rose-100/60 text-[10px] font-bold uppercase tracking-widest mt-4 italic">Lifetime total</p>
            </div>
        </div>

        {/* Expense History Table */}
        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="text-gray-700 font-bold text-[10px] uppercase tracking-widest">Recent Expenses</h3>
                <span className="text-[10px] font-bold text-gray-400">{expenses.length} Records</span>
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
                        {loading ? [1,2,3].map(i => <tr key={i}><td colSpan={5} className="px-6 py-4"><Skeleton className="h-4 w-full" /></td></tr>) : 
                         expenses.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No expenses recorded yet.</td></tr> :
                         expenses.map((e) => (
                            <tr key={e.id} className="hover:bg-red-50/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-600">{e.date}</td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-tight">{e.category}</span></td>
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
