'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

interface Item {
  id: number;
  name: string;
}

const Manager = ({ title, apiEndpoint }: { title: string, apiEndpoint: string }) => {
    const { showToast } = useToast();
    const [items, setItems] = useState<Item[]>([]);
    const [newItem, setNewItem] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchItems = async () => {
      setLoading(true);
      try {
        const res = await fetch(apiEndpoint);
        if (res.ok) {
          setItems(await res.json());
        }
      } catch (error) {
        showToast(`Failed to load ${title}`, 'error');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => { fetchItems(); }, [apiEndpoint, title]);

    const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItem.trim()) return;
      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newItem }),
        });
        if (res.ok) {
          showToast(`${title} added`, 'success');
          setNewItem('');
          fetchItems();
        }
      } catch (error) { console.error(error); }
    };

    const handleDelete = async (id: number) => {
      if (!confirm('Are you sure?')) return;
      try {
          const res = await fetch(apiEndpoint, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id }),
          });
          if (res.ok) {
              showToast(`${title} removed`, 'success');
              fetchItems();
          }
      } catch (error) { console.error(error); }
    };

    return (
       <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded border border-blue-100 uppercase tracking-widest">{items.length} Records</span>
          </div>

          <form onSubmit={handleAdd} className="flex gap-3 mb-10 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
              <input 
                  type="text" 
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder={`New ${title.toLowerCase()} name...`}
                  className="flex-1 p-2 bg-transparent outline-none text-gray-900 text-sm font-medium"
              />
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-sm">Add</button>
          </form>

          {loading ? (
              <div className="space-y-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-md"></div>)}
              </div>
          ) : (
              <div className="grid grid-cols-1 gap-3">
                  {items.length === 0 && <p className="text-gray-400 text-sm italic py-10 text-center border-2 border-dashed rounded-lg">No entries found.</p>}
                  {items.map((t) => (
                      <div key={t.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-lg hover:shadow-md transition group">
                          <span className="text-gray-800 font-semibold">{t.name}</span>
                          <button onClick={() => handleDelete(t.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                      </div>
                  ))}
              </div>
          )}
       </div>
    );
};

const ClinicProfile = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        clinic_name: '',
        owner_name: '',
        phone: '',
        address: '',
        email: ''
    });

    useEffect(() => {
        fetch('/api/clinic-info')
            .then(res => res.json())
            .then(data => {
                if (data.clinic_name !== undefined) setForm(data);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/clinic-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) showToast('Profile updated', 'success');
        } catch (e) { showToast('Update failed', 'error'); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg"></div>)}</div>;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Clinic Profile</h2>
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-900">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 tracking-widest">Clinic Name</label>
                        <input value={form.clinic_name} onChange={e => setForm({...form, clinic_name: e.target.value})} className="w-full p-2.5 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition" placeholder="e.g. Smile Dental Care" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 tracking-widest">Owner / Head Doctor</label>
                        <input value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} className="w-full p-2.5 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition" placeholder="Dr. Name" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 tracking-widest">Phone Number</label>
                        <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2.5 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition" placeholder="+91 ..." />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 tracking-widest">Email Address</label>
                        <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full p-2.5 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition" placeholder="clinic@example.com" />
                    </div>
                    <div className="sm:col-span-2 text-gray-900">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 tracking-widest">Clinic Address</label>
                        <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={3} className="w-full p-2.5 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition" placeholder="Full address..." />
                    </div>
                </div>
                <div className="pt-4 border-t flex justify-end">
                    <button type="submit" disabled={saving} className="bg-blue-600 text-white px-8 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-md disabled:opacity-50">
                        {saving ? 'Saving...' : 'Update Profile'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'profile' | 'treatments' | 'doctors' | 'expenses'>('profile');

  const menuItems = [
      { id: 'profile', label: 'Clinic Profile', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H5a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg> },
      { id: 'treatments', label: 'Treatments', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg> },
      { id: 'doctors', label: 'Doctors', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> },
      { id: 'expenses', label: 'Expense Categories', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> }
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
             <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
               <div className="bg-blue-600 text-white p-1 rounded shadow-sm">
                 <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 2h-13C4.1 2 3 4.1 3 6.5c0 2.5 1.5 4.5 3 6v7c0 1.4 1.1 2.5 2.5 2.5h1c1.1 0 2-0.9 2-2v-4h1v4c0 1.1 0.9 2 2 2h1c1.4 0 2.5-1.1 2.5-2.5v-7c1.5-1.5 3-3.5 3-6 0-2.4-1.1-4.5-2.5-4.5z" /></svg>
               </div>
               <span className="font-bold text-xl tracking-tight text-gray-900">IntelliDent</span>
               <span className="text-gray-300">|</span>
               <span className="text-gray-500 font-medium">Settings</span>
             </div>
             <button onClick={() => router.push('/')} className="text-sm text-blue-600 font-bold hover:underline tracking-tight">← Back to Dashboard</button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-200 pt-8 px-4 hidden md:block">
            <nav className="space-y-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id as any)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${
                            activeSection === item.id 
                            ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm' 
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}
            </nav>
        </aside>

        {/* Mobile Tab Bar */}
        <div className="md:hidden flex bg-white border-b border-gray-200 overflow-x-auto scrollbar-hide">
            {menuItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id as any)}
                    className={`flex-1 px-4 py-3 text-[9px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${
                        activeSection === item.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-400'
                    }`}
                >
                    {item.label}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <main className="flex-1 py-8 px-4 sm:px-10 lg:px-16 max-w-4xl">
            {activeSection === 'profile' && <ClinicProfile />}
            {activeSection === 'treatments' && <Manager title="Treatments" apiEndpoint="/api/treatments" />}
            {activeSection === 'doctors' && <Manager title="Doctors" apiEndpoint="/api/doctors" />}
            {activeSection === 'expenses' && <Manager title="Expense Categories" apiEndpoint="/api/expense-categories" />}
        </main>
      </div>
    </div>
  );
}