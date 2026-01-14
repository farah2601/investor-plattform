export function SecuritySection() {
  return (
    <section className="mt-16 lg:mt-32">
      <div className="mx-auto max-w-screen-xl lg:px-4">
        <div className="relative flex flex-col gap-8 bg-gradient-to-b from-black/80 to-black/40 p-8 lg:flex-row lg:rounded-lg lg:p-16 lg:gap-12 overflow-hidden">
          
          <div className="relative lg:w-1/2">
            <div className="inline-flex shrink-0 flex size-16">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 348 348" className="w-full h-full">
                <g clipPath="url(#security-clip)">
                  <circle cx="173.87" cy="173.87" r="134.92" fill="#231F20" />
                  {/* Premium shield with checkmark - Enterprise security */}
                  <g filter="url(#shield-glow)">
                    {/* Main shield body */}
                    <path
                      d="M173.87 45 L115 75 L115 140 C115 210 145 260 173.87 290 C202.74 260 232.74 210 232.74 140 L232.74 75 Z"
                      fill="url(#shield-gradient)"
                      stroke="url(#shield-stroke-gradient)"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    {/* Inner shield highlight */}
                    <path
                      d="M173.87 55 L125 80 L125 140 C125 200 150 245 173.87 270 C197.74 245 222.74 200 222.74 140 L222.74 80 Z"
                      fill="url(#shield-inner-gradient)"
                      opacity="0.3"
                    />
                    {/* Shield checkmark */}
                    <path
                      d="M150 165 L165 180 L198 145"
                      stroke="url(#shield-check-gradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </g>
                </g>
                <defs>
                  {/* Premium sølv gradient for shield */}
                  <linearGradient id="shield-gradient" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#F5F5F5" />
                    <stop offset="20%" stopColor="#E0E0E0" />
                    <stop offset="40%" stopColor="#C8C8C8" />
                    <stop offset="60%" stopColor="#B0B0B0" />
                    <stop offset="80%" stopColor="#C8C8C8" />
                    <stop offset="100%" stopColor="#E8E8E8" />
                  </linearGradient>
                  <linearGradient id="shield-stroke-gradient" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                    <stop offset="50%" stopColor="#D8D8D8" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="shield-inner-gradient" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
                  </linearGradient>
                  <linearGradient id="shield-check-gradient" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#2AA381" />
                    <stop offset="100%" stopColor="#248d70" />
                  </linearGradient>
                  {/* Glow effect for premium look */}
                  <filter id="shield-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <linearGradient id="security-gradient" x1="0" x2="347.75" y1="173.87" y2="173.87" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#231F20" />
                    <stop offset=".69" stopColor="#464647" />
                    <stop offset="1" stopColor="#58595B" />
                  </linearGradient>
                  <clipPath id="security-clip">
                    <path fill="#fff" d="M0 0h347.75v347.75H0z" />
                  </clipPath>
                </defs>
              </svg>
            </div>
            <div className="mt-6 text-xs uppercase tracking-[0.15em] text-slate-400">SECURITY</div>
            <h3 className="font-dark mt-2 text-4xl font-medium text-white">Security by default</h3>
            <div className="mt-3 h-px w-16 bg-gradient-to-r from-brand-blue/50 to-transparent" />
            <p className="mt-4 text-lg text-slate-300 leading-relaxed">Enterprise-grade security built into every layer of Valyxo.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:w-1/2 lg:gap-6">
            <div className="group flex flex-col gap-3 p-4 rounded-lg transition-all duration-300 hover:bg-white/5 hover:shadow-lg hover:shadow-brand-blue/10 hover:-translate-y-0.5">
              <div className="inline-flex shrink-0 size-14 text-brand-blue">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 63 63" className="w-full h-full">
                  <rect width="60.372" height="60.372" x="1.086" y="1.517" stroke="currentColor" strokeOpacity=".18" strokeWidth="1.628" rx="7.186" />
                  <rect x="17.837" y="14.447" width="27" height="21" rx="4" fill="currentColor" fillOpacity=".1" />
                  <circle cx="31" cy="25" r="3" fill="currentColor" />
                  <path stroke="currentColor" strokeWidth="1.5" d="M25 32h12" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-medium text-white">Data encryption</div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  TLS 1.2+ in transit · AES-256 at rest
                </p>
              </div>
            </div>
            <div className="group flex flex-col gap-3 p-4 rounded-lg transition-all duration-300 hover:bg-white/5 hover:shadow-lg hover:shadow-brand-green/10 hover:-translate-y-0.5">
              <div className="inline-flex shrink-0 size-14 text-brand-green">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 63 63" className="w-full h-full">
                  <rect width="60.372" height="60.372" x="1.086" y="1.634" stroke="currentColor" strokeOpacity=".18" strokeWidth="1.628" rx="7.186" />
                  <circle cx="31" cy="32" r="8" fill="currentColor" fillOpacity=".1" />
                  <path stroke="currentColor" strokeWidth="1.5" d="M31 24v16M23 32h16" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-medium text-white">Access control</div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Role-based permissions · MFA for internal access
                </p>
              </div>
            </div>
            <div className="group flex flex-col gap-3 p-4 rounded-lg transition-all duration-300 hover:bg-white/5 hover:shadow-lg hover:shadow-brand-purple/10 hover:-translate-y-0.5">
              <div className="inline-flex shrink-0 size-14 text-brand-purple">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 63 63" className="w-full h-full">
                  <rect width="60.372" height="60.372" x="1.086" y="1.72" stroke="currentColor" strokeOpacity=".18" strokeWidth="1.628" rx="7.186" />
                  <rect x="20" y="20" width="22" height="22" rx="4" fill="currentColor" fillOpacity=".1" />
                  <path stroke="currentColor" strokeWidth="1.5" d="M28 28h6M28 32h6M28 36h4" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-medium text-white">Secure infrastructure</div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Isolated environments · Separate backups
                </p>
              </div>
            </div>
            <div className="group flex flex-col gap-3 p-4 rounded-lg transition-all duration-300 hover:bg-white/5 hover:shadow-lg hover:shadow-brand-blue/10 hover:-translate-y-0.5">
              <div className="inline-flex shrink-0 size-14 text-brand-blue">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 63 63" className="w-full h-full">
                  <rect width="60.372" height="60.372" x="1.086" y="1.517" stroke="currentColor" strokeOpacity=".18" strokeWidth="1.628" rx="7.186" />
                  <rect x="17" y="17" width="28" height="28" rx="4" fill="currentColor" fillOpacity=".1" />
                  <circle cx="24" cy="24" r="2" fill="currentColor" />
                  <circle cx="31" cy="24" r="2" fill="currentColor" />
                  <circle cx="38" cy="24" r="2" fill="currentColor" />
                  <circle cx="24" cy="31" r="2" fill="currentColor" />
                  <circle cx="31" cy="31" r="2" fill="currentColor" />
                  <circle cx="38" cy="31" r="2" fill="currentColor" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-medium text-white">Data isolation</div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Customer data logically isolated · No cross-customer access
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
