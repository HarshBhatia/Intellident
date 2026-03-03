'use client';

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto py-16 px-6 text-gray-800 dark:text-gray-200">
        <h1 className="text-4xl font-black mb-8 tracking-tight uppercase">Terms of Service</h1>
        
        <section className="mb-10">
          <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">1. Clinical Accuracy</h2>
          <p className="leading-relaxed">IntelliDent provides tools for documentation and mapping. Clinical decisions remain the sole responsibility of the licensed dental practitioner.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">2. Patient Consent</h2>
          <p className="leading-relaxed">By using this platform, you certify that you have obtained necessary patient consent for recording clinical data and uploading radiographic images.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">3. Platform Use</h2>
          <p className="leading-relaxed">IntelliDent reserves the right to suspend accounts that violate medical ethical standards or attempt to bypass security measures.</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
