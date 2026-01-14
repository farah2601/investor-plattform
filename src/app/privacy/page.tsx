export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen text-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-slate-50">
          Privacy Policy
        </h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-slate-300">
          <p className="text-sm sm:text-base">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-4">
              Introduction
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              Valyxo ("we," "our," or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard 
              your information when you use our service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-4">
              Information We Collect
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm sm:text-base ml-4">
              <li>Account information (email, password)</li>
              <li>Company information and metrics</li>
              <li>Communication data</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-4">
              How We Use Your Information
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm sm:text-base ml-4">
              <li>Provide and maintain our service</li>
              <li>Process your transactions</li>
              <li>Send you updates and communications</li>
              <li>Improve our service and user experience</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-4">
              Data Security
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              We implement appropriate technical and organizational measures to protect 
              your personal information against unauthorized access, alteration, disclosure, 
              or destruction.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-4">
              Contact Us
            </h2>
            <p className="text-sm sm:text-base leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us.
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

