import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import Footer from "@/components/Footer";
import { validateEnv } from "@/lib/env";
import "./globals.css";

validateEnv();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | IntelliDent",
    default: "IntelliDent",
  },
  description: "Dental Patient Management Platform",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IntelliDent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider
          appearance={{
            baseTheme: dark,
            variables: { colorPrimary: '#2563eb' },
            elements: {
              card: "shadow-xl border border-gray-200 dark:border-gray-800",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
              footerActionLink: "text-blue-600 hover:text-blue-700",
            }
          }}
        >
          <ThemeProvider defaultTheme="system">
            <ToastProvider>
              <div className="flex flex-col min-h-screen">
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
            </ToastProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
