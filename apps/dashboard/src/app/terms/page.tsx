export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="mb-4">By using IntelliDent, you agree to the following terms.</p>
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">1. Acceptable Use</h2>
        <p>You agree to use IntelliDent only for legitimate clinical record keeping. You are responsible for ensuring the accuracy of the data you enter.</p>
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">2. Patient Consent</h2>
        <p>You are responsible for obtaining necessary consent from your patients before recording their clinical data and uploading X-rays to the platform.</p>
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">3. Limitation of Liability</h2>
        <p>IntelliDent provides tools for record management but is not responsible for clinical decisions made based on these records.</p>
      </section>
    </div>
  );
}
