'use client';

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ClerkThemeWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <>{children}</>;

  return (
    <ClerkProvider
      appearance={{
        baseTheme: resolvedTheme === 'dark' ? dark : undefined,
        variables: { colorPrimary: '#2563eb' },
        elements: {
          card: "shadow-xl border border-gray-200 dark:border-gray-800",
          formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
          footerActionLink: "text-blue-600 hover:text-blue-700",
        }
      }}
    >
      {children}
    </ClerkProvider>
  );
}
