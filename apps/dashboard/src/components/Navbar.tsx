'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { useEffect, useState } from 'react';

export default function Navbar({ activePage }: { activePage?: string }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    document.cookie = 'auth_token=; Max-Age=0; path=/;';
    router.push('/login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 text-gray-900 dark:text-gray-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
             <div className="bg-blue-600 text-white p-1.5 rounded shadow-sm">
               <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.5 2h-13C4.1 2 3 4.1 3 6.5c0 2.5 1.5 4.5 3 6v7c0 1.4 1.1 2.5 2.5 2.5h1c1.1 0 2-0.9 2-2v-4h1v4c0 1.1 0.9 2 2 2h1c1.4 0 2.5-1.1 2.5-2.5v-7c1.5-1.5 3-3.5 3-6 0-2.4-1.1-4.5-2.5-4.5z" />
               </svg>
             </div>
            <span className="font-bold text-xl tracking-tight">IntelliDent</span>
            {activePage && (
              <>
                <span className="text-gray-300 dark:text-gray-700 hidden sm:inline mx-1">|</span>
                <span className="text-gray-500 dark:text-gray-400 font-medium hidden sm:inline">{activePage}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors h-9 w-9 flex items-center justify-center"
              title="Toggle Theme"
            >
              {mounted ? (
                theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h1M4 12H3m15.364-6.364l.707-.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                )
              ) : (
                <div className="w-5 h-5" /> // Placeholder to prevent mismatch
              )}
            </button>
            <button 
              onClick={() => router.push('/earnings')} 
              className="text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 text-sm font-medium transition flex items-center gap-1"
              title="Earnings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span className="hidden md:inline">Earnings</span>
            </button>
            <button 
              onClick={() => router.push('/expenses')} 
              className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-sm font-medium transition flex items-center gap-1"
              title="Expenses"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span className="hidden md:inline">Expenses</span>
            </button>
            <button 
              onClick={() => router.push('/settings')} 
              className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium transition flex items-center gap-1"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <span className="hidden md:inline">Settings</span>
            </button>
            <button 
              onClick={handleLogout} 
              className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-sm font-medium transition flex items-center gap-1"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}