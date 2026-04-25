import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { validateEnv } from "@/lib/env";
import { ClinicProvider } from "@/context/ClinicContext";
import Script from "next/script";
import "./globals.css";

validateEnv();

export const dynamic = 'force-dynamic';

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
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('error', (event) => {
              const msg = event.message || '';
              if (msg.includes('ChunkLoadError') || msg.includes('loading chunk')) {
                console.warn('Critical Next.js chunk error, reloading...', msg);
                window.location.reload();
              }
            }, true);
          `
        }} />
      </head>
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
          <ClinicProvider>
            <ThemeProvider defaultTheme="system">
              <ToastProvider>
                <div className="flex flex-col min-h-screen">
                  <Navbar />
                  <main className="flex-1">
                    {children}
                  </main>
                  <Footer />
                </div>
              </ToastProvider>
            </ThemeProvider>
          </ClinicProvider>
        </ClerkProvider>
        
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-1BJ5E2NT8X"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-1BJ5E2NT8X');
          `}
        </Script>
      </body>
    </html>
  );
}
