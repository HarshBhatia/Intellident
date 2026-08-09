export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 text-gray-800 dark:text-gray-200">
      <h1 className="text-4xl font-black mb-2 tracking-tight uppercase">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated 9 August 2026. Draft for legal review — not legal advice. Governed by the laws of India.</p>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">1. The service</h2>
        <p className="leading-relaxed">IntelliDent is software for dental clinic staff to manage patients, visits, schedules, and clinic finances. It is not a medical device and does not provide clinical advice.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">2. Clinical responsibility</h2>
        <p className="leading-relaxed">Clinical decisions remain the sole responsibility of the licensed practitioner. You are responsible for the accuracy of records entered by your staff.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">3. Accounts and access</h2>
        <p className="leading-relaxed">Clinic owners control who is invited. You must keep credentials secure and remove staff who leave. We may suspend accounts that abuse the service or attempt to bypass security.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">4. Patient consent</h2>
        <p className="leading-relaxed">By using the platform you certify that you have obtained necessary patient consent to store clinical data and that you will handle data in line with DPDP and applicable professional rules.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">5. Availability and liability</h2>
        <p className="leading-relaxed">The service is provided “as is”. We are not liable for clinical outcomes, lost profits, or data loss beyond what applicable law requires. Keep your own clinical backups if required by your practice.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">6. Contact</h2>
        <p className="leading-relaxed">Questions: privacy@intellident.app. Disputes: courts of India.</p>
      </section>
    </div>
  );
}
