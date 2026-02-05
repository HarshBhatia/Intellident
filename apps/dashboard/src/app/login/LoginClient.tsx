'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginClient() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      router.push('/');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-800 dark:from-blue-900 dark:to-gray-950 transition-colors">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-10 rounded shadow-2xl w-full max-w-sm transform transition-all hover:scale-[1.01] border border-white/20 dark:border-gray-800">
        <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-4 rounded mb-4 shadow-inner">
                <svg className="w-12 h-12 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.5 2h-13C4.1 2 3 4.1 3 6.5c0 2.5 1.5 4.5 3 6v7c0 1.4 1.1 2.5 2.5 2.5h1c1.1 0 2-0.9 2-2v-4h1v4c0 1.1 0.9 2 2 2h1c1.4 0 2.5-1.1 2.5-2.5v-7c1.5-1.5 3-3.5 3-6 0-2.4-1.1-4.5-2.5-4.5z" />
                </svg>
            </div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-900 dark:from-blue-400 dark:to-blue-200">
                IntelliDent
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 uppercase tracking-widest font-bold opacity-70">Dental Excellence Platform</p>
        </div>

        {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 mb-6 rounded-r">
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ml-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 bg-white dark:bg-gray-800"
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 bg-white dark:bg-gray-800"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2.5 rounded shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98] mt-2"
          >
            Sign In
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600">
            &copy; {new Date().getFullYear()} IntelliDent Systems
        </div>
      </div>
    </div>
  );
}
