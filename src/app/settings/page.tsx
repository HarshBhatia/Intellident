'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

interface Item {
  id: number;
  name: string;
}

// Reusable Manager Component moved outside to prevent re-mounting
const Manager = ({ title, apiEndpoint }: { title: string, apiEndpoint: string }) => {
    const { showToast } = useToast();
    const [items, setItems] = useState<Item[]>([]);
    const [newItem, setNewItem] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchItems = async () => {
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
        } else {
          showToast('Failed to add', 'error');
        }
      } catch (error) { console.error(error); }
    };

    const handleDelete = async (id: number) => {
      if (!confirm('Are you sure you want to remove this item?')) return;
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
       <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">{title}</h2>
          <form onSubmit={handleAdd} className="flex gap-4 mb-6">
              <input 
                  type="text" 
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder={`Add new ${title.toLowerCase()}...`}
                  className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Add</button>
          </form>
          {loading ? <div className="text-gray-500">Loading...</div> : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                  {items.length === 0 && <p className="text-gray-400 text-sm">No items found.</p>}
                  {items.map((t) => (
                      <div key={t.id} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50 group">
                          <span className="text-gray-800 font-medium">{t.name}</span>
                          <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                      </div>
                  ))}
              </div>
          )}
       </div>
    );
};

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
             <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
               <span className="font-bold text-xl text-gray-800">IntelliDent</span>
               <span className="text-gray-400">|</span>
               <span className="text-gray-600 font-medium">Settings</span>
             </div>
             <button onClick={() => router.push('/')} className="text-sm text-blue-600 hover:underline">
                Back to Dashboard
             </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Manager title="Treatments" apiEndpoint="/api/treatments" />
            <Manager title="Doctors" apiEndpoint="/api/doctors" />
         </div>
      </main>
    </div>
  );
}