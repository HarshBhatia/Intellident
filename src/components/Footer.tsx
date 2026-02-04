'use client';

import Link from 'next/link';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-auto border-t border-gray-100 dark:border-gray-900 bg-white dark:bg-gray-950 transition-colors">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest text-center sm:text-left">
                        © {currentYear} IntelliDent Platform. Built for Excellence.
                    </p>
                    
                    <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest">
                        <span>v0.2.0</span>
                        <span className="w-1 h-1 bg-gray-200 dark:bg-gray-800 rounded-full"></span>
                        <Link href="/privacy" className="hover:text-blue-600 transition">Privacy Policy</Link>
                        <span className="w-1 h-1 bg-gray-200 dark:bg-gray-800 rounded-full"></span>
                        <Link href="/terms" className="hover:text-blue-600 transition">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}