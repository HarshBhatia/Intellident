export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="mb-4">Your privacy is important to us. This policy explains how we collect, use, and protect your clinical data.</p>
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">1. Data Collection</h2>
        <p>We collect patient names, contact details, and clinical history solely for the purpose of helping dental clinics manage their records.</p>
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">2. AI Processing</h2>
        <p>Clinical notes are processed using Google Gemini. Data sent to the AI service is used only for structuring notes and is not used for training models by IntelliDent.</p>
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">3. Data Security</h2>
        <p>Your data is stored securely using Neon PostgreSQL and is protected by industry-standard encryption and authentication via Clerk.</p>
      </section>
    </div>
  );
}
