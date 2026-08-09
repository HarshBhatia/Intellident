export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 text-gray-800 dark:text-gray-200">
      <h1 className="text-4xl font-black mb-2 tracking-tight uppercase">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated 9 August 2026. Draft for legal review — not legal advice.</p>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">1. Who we are</h2>
        <p className="leading-relaxed mb-3">IntelliDent (“we”, “us”) provides clinic management software to dental practices in India. For patient records, the <strong>clinic is the data fiduciary</strong> under the Digital Personal Data Protection Act, 2023 (DPDP). IntelliDent acts as a <strong>data processor</strong> on the clinic’s instructions.</p>
        <p className="leading-relaxed">Contact: privacy@intellident.app. Grievance officer: IntelliDent, India (email: privacy@intellident.app).</p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">2. What we store</h2>
        <p className="leading-relaxed mb-3">On behalf of a clinic we may store: staff identity and login (via Clerk); clinic profile; patient identity (name, age, gender, phone); clinical notes, odontogram charts, visit history; billing amounts and expense records; membership/roles.</p>
        <p className="leading-relaxed">We do not sell personal data. We do not use clinical content to train public AI models. AI note features are off unless a clinic explicitly enables them.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">3. Purpose and retention</h2>
        <p className="leading-relaxed">Data is processed to provide the dashboard: records, appointments, billing summaries, and access control. Records are kept while the clinic account is active and for a short backup window after deletion. Clinics may request export or erasure of their tenant data.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">4. Your rights (DPDP)</h2>
        <p className="leading-relaxed">Data principals may request access, correction, erasure, and nomination through their clinic. Clinics can contact us to fulfil those requests. You may also complain to the Data Protection Board of India.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">5. Subprocessors</h2>
        <ul className="list-disc pl-5 leading-relaxed space-y-1">
          <li>Clerk — authentication</li>
          <li>Neon — PostgreSQL database (configure region ap-south-1 / Mumbai)</li>
          <li>Vercel — application hosting (bom1 / Mumbai)</li>
          <li>Google Analytics — optional product/marketing events without patient identifiers</li>
          <li>Google Gemini — only if the clinic enables AI features</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">6. Security and cookies</h2>
        <p className="leading-relaxed">Traffic is served over TLS. Clinic data is isolated by clinic_id and membership checks. We use a clinic session cookie (httpOnly). Analytics, if enabled, does not send patient IDs in page paths.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">7. Patient consent</h2>
        <p className="leading-relaxed">The clinic warrants that it has obtained any consent required to record clinical data in IntelliDent. IntelliDent does not treat patients as its customers.</p>
      </section>
    </div>
  );
}
