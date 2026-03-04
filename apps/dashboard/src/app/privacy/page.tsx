export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 text-gray-800 dark:text-gray-200">
      <h1 className="text-4xl font-black mb-8 tracking-tight uppercase">Privacy Policy</h1>
      
      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">1. Data Ownership</h2>
        <p className="leading-relaxed">All clinical data entered into IntelliDent remains the property of the respective clinic. We act only as a secure storage and processing provider.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">2. AI Note Generation</h2>
        <p className="leading-relaxed">Clinical notes processed via Google Gemini are handled according to Google's Enterprise Privacy standards. Data is used solely for structuring your notes and is not used to train public AI models.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">3. Security</h2>
        <p className="leading-relaxed">We use industry-standard encryption and secure database providers (Neon PostgreSQL) to ensure your patients' sensitive records are protected at all times.</p>
      </section>
    </div>
  );
}
