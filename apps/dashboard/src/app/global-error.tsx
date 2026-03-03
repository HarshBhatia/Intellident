'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error caught:', error);
    
    // Automatically reload if it's a chunk error
    if (error.message.includes('ChunkLoadError') || error.message.includes('loading chunk')) {
      window.location.reload();
    }
  }, [error]);

  return (
    <html>
      <body className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="text-gray-600 mb-8 max-w-md">The application encountered a critical error. This usually happens after a new update. Please click the button below to refresh.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition active:scale-95"
        >
          Refresh Application
        </button>
      </body>
    </html>
  );
}
