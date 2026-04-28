import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "IntelliDent — Smart Dental Practice Management",
  description:
    "Keep patient records, track payments, and write notes with your voice. Simple clinic management for Indian dentists.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline theme script — runs before paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('intellident-theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(s==='dark'||(s==null&&d)){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body className={jakarta.variable}>{children}</body>
    </html>
  );
}
