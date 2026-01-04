export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#020617] text-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-slate-50">
          Terms of Service
        </h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-slate-300">
          <p className="text-sm sm:text-base">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-4">
              Agreement to Terms
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              By accessing or using Valyxo ("the Service"), you agree to be bound by 
              these Terms of Service. If you disagree with any part of these terms, 
              then you may not access the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-4">
              Use License
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              Permission is granted to temporarily use Valyxo for personal or commercial 
              purposes. This is the grant of a license, not a transfer of title, and under 
              this license you may not:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm sm:text-base ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose without authorization</li>
              <li>Attempt to reverse engineer any software contained in the Service</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-4">
              User Accounts
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              When you create an account with us, you must provide information that is 
              accurate, complete, and current at all times. You are responsible for 
              safeguarding the password and for all activities that occur under your account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-4">
              Prohibited Uses
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              You may not use the Service:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm sm:text-base ml-4">
              <li>In any way that violates any applicable law or regulation</li>
              <li>To transmit any malicious code or viruses</li>
              <li>To impersonate or attempt to impersonate the company or other users</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-4">
              Limitation of Liability
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              In no event shall Valyxo, nor its directors, employees, partners, agents, 
              suppliers, or affiliates, be liable for any indirect, incidental, special, 
              consequential, or punitive damages.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-4">
              Contact Us
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              If you have any questions about these Terms of Service, please contact us.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800">
          <a
            href="/"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Back to home
          </a>
        </div>
      </div>
    </main>
  );
}

