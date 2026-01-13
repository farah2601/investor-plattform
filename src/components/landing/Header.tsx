"use client";

import { useState } from "react";
import Link from "next/link";
import { ValyxoLogo } from "../brand/ValyxoLogo";

export function Header() {
  const [isNavHovered, setIsNavHovered] = useState(false);

  return (
    <>
      {/* Dark overlay that dims content below when hovering over navigation */}
      {isNavHovered && (
        <div
          className="fixed inset-0 top-[68px] bg-black/50 backdrop-blur-sm pointer-events-none transition-opacity duration-200"
          style={{ zIndex: 15 }}
        />
      )}

      <header className="fixed z-20 w-full bg-dark px-2 text-white">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between py-2 text-sm lg:py-0">
        <Link href="/" aria-label="Homepage" className="lg:flex-1 lg:py-2">
          <ValyxoLogo size={28} priority />
        </Link>
        <nav
          className="hidden lg:block"
          onMouseEnter={() => setIsNavHovered(true)}
          onMouseLeave={() => setIsNavHovered(false)}
        >
          <div className="relative flex">
            {/* For Founders Dropdown */}
            <div className="group peer">
              <button className="relative flex items-center gap-2 px-3 py-4 text-sm font-normal after:absolute after:-left-8 after:-right-8 after:bottom-2 after:z-10 after:hidden after:h-6 after:[transform:perspective(8px)_rotateX(20deg)] group-hover:font-medium after:group-hover:block">
                <div className="relative">
                  <div className="invisible font-medium">For Founders</div>
                  <div className="absolute inset-0">For Founders</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 13 12" className="inline-flex shrink-0 size-3">
                  <path d="M5.824 9.842.967 4.984a.854.854 0 0 1 0-1.21l.807-.807a.854.854 0 0 1 1.21 0L6.429 6.41 9.87 2.967a.854.854 0 0 1 1.21 0l.807.807a.853.853 0 0 1 0 1.21L7.031 9.842a.85.85 0 0 1-1.207 0Z" />
                </svg>
              </button>
              <div className="absolute left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-gradient-to-l from-dark/70 to-neutral-900 shadow-lg backdrop-blur-[2px] group-hover:block w-[800px]" role="menu">
                <div className="grid auto-cols-fr grid-flow-col gap-x-8 gap-y-2 px-10 py-8 grid-rows-1" role="none">
                  <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <g>
                        <path d="M9.376 7.031H21.75v1.814H9.376V7.03zM9.191 10.383h11.846v1.814H9.19v-1.814zM9.227 24.96l-1.045-1.1 5.227-5.503 5.227 4.402 3.137-4.402 1.045 1.1-4.182 5.503-5.227-4.402-4.182 4.402zM18.674 13.738H8.809v1.813h9.865v-1.813z" />
                        <path d="M25.208 2H5.792C4.802 2 4 2.845 4 3.886v25.228C4 30.155 4.802 31 5.792 31h19.416c.99 0 1.792-.845 1.792-1.886V15.55h-1.792V29.19H5.792V3.814h19.416V15.55H27V3.886C27 2.844 26.198 2 25.208 2z" />
                      </g>
                    </svg>
                    <div>
                      <div className="text-sm text-white">Investor Updates</div>
                      <div className="mt-2 text-sm text-gray-50">Report to investors</div>
                    </div>
                  </Link>
                  <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <path d="M21 12v-2h-4V7h-2v3h-2a2.002 2.002 0 0 0-2 2v3a2.002 2.002 0 0 0 2 2h6v3h-8v2h4v3h2v-3h2a2.002 2.002 0 0 0 2-2v-3a2.002 2.002 0 0 0-2-2h-6v-3Z" />
                      <path d="M16 4A12 12 0 1 1 4 16 12.035 12.035 0 0 1 16 4m0-2a14 14 0 1 0 14 14A14.041 14.041 0 0 0 16 2Z" />
                      <path d="M0 0h32v32H0z" fill="none" />
                    </svg>
                    <div>
                      <div className="text-sm text-white">Fundraising</div>
                      <div className="mt-2 text-sm text-gray-50">Manage a capital raise</div>
                    </div>
                  </Link>
                  <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <path d="M27 28V6h-8v22h-4V14H7v14H4V2H2v26a2 2 0 0 0 2 2h26v-2Zm-14 0H9V16h4Zm12 0h-4V8h4Z" />
                      <path d="M0 0h32v32H0z" fill="none" />
                    </svg>
                    <div>
                      <div className="text-sm text-white">Metric Tracking</div>
                      <div className="mt-2 text-sm text-gray-50">Track company KPIs</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* For Investors Dropdown */}
            <div className="group peer">
              <button className="relative flex items-center gap-2 px-3 py-4 text-sm font-normal after:absolute after:-left-8 after:-right-8 after:bottom-2 after:z-10 after:hidden after:h-6 after:[transform:perspective(8px)_rotateX(20deg)] group-hover:font-medium after:group-hover:block">
                <div className="relative">
                  <div className="invisible font-medium">For Investors</div>
                  <div className="absolute inset-0">For Investors</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 13 12" className="inline-flex shrink-0 size-3">
                  <path d="M5.824 9.842.967 4.984a.854.854 0 0 1 0-1.21l.807-.807a.854.854 0 0 1 1.21 0L6.429 6.41 9.87 2.967a.854.854 0 0 1 1.21 0l.807.807a.853.853 0 0 1 0 1.21L7.031 9.842a.85.85 0 0 1-1.207 0Z" />
                </svg>
              </button>
              <div className="absolute left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-gradient-to-l from-dark/70 to-neutral-900 shadow-lg backdrop-blur-[2px] group-hover:block w-[800px]" role="menu">
                <div className="grid auto-cols-fr grid-flow-col gap-x-8 gap-y-2 px-10 py-8 grid-rows-1" role="none">
                  <Link href="/company-dashboard?role=investor" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <path d="M30 3.414 28.586 2 15.293 15.293a1 1 0 0 0 1.414 1.414l4.18-4.18A5.996 5.996 0 1 1 16 10V8a8.011 8.011 0 1 0 6.316 3.098l2.847-2.847A11.881 11.881 0 0 1 28 16 12 12 0 1 1 16 4V2a14 14 0 1 0 14 14 13.857 13.857 0 0 0-3.422-9.164Z" />
                      <path d="M0 0h32v32H0z" fill="none" />
                    </svg>
                    <div>
                      <div className="text-sm text-white">Portfolio Monitoring</div>
                      <div className="mt-2 text-sm text-gray-50">Monitor portfolio performance</div>
                    </div>
                  </Link>
                  <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <g>
                        <path d="M26 21H24V26H26V21Z" fill="currentColor" />
                        <path d="M22 16H20V26H22V16Z" fill="currentColor" />
                        <path d="M11 26C9.6744 25.9984 8.40353 25.4712 7.46619 24.5338C6.52885 23.5965 6.00156 22.3256 6 21H8C8 21.5933 8.17595 22.1734 8.50559 22.6667C8.83524 23.1601 9.30377 23.5446 9.85195 23.7716C10.4001 23.9987 11.0033 24.0581 11.5853 23.9424C12.1672 23.8266 12.7018 23.5409 13.1213 23.1213C13.5409 22.7018 13.8266 22.1672 13.9424 21.5853C14.0581 21.0033 13.9987 20.4001 13.7716 19.8519C13.5446 19.3038 13.1601 18.8352 12.6667 18.5056C12.1734 18.1759 11.5933 18 11 18V16C12.3261 16 13.5979 16.5268 14.5355 17.4645C15.4732 18.4021 16 19.6739 16 21C16 22.3261 15.4732 23.5979 14.5355 24.5355C13.5979 25.4732 12.3261 26 11 26Z" fill="currentColor" />
                        <path d="M28 2H4C3.46973 2.00053 2.96133 2.21141 2.58637 2.58637C2.21141 2.96133 2.00053 3.46973 2 4V28C2.00061 28.5302 2.21152 29.0386 2.58646 29.4135C2.9614 29.7885 3.46975 29.9994 4 30H28C28.5302 29.9993 29.0385 29.7883 29.4134 29.4134C29.7883 29.0385 29.9993 28.5302 30 28V4C29.9994 3.46975 29.7885 2.9614 29.4135 2.58646C29.0386 2.21152 28.5302 2.00061 28 2ZM28 11H14V4H28V11ZM12 4V11H4V4H12ZM4 28V13H28.0007L28.002 28H4Z" fill="currentColor" />
                      </g>
                    </svg>
                    <div>
                      <div className="text-sm text-white">Portfolio Insights</div>
                      <div className="mt-2 text-sm text-gray-50">Uncover insights</div>
                    </div>
                  </Link>
                  <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <path d="M25.708 1.5H6.292c-.99 0-1.792.845-1.792 1.886v25.228c0 1.041.802 1.886 1.792 1.886h19.416c.99 0 1.792-.845 1.792-1.886V3.386c0-1.042-.802-1.886-1.792-1.886zm0 13.551V28.69H6.292V3.314h19.416V15.05zM22 13v2H10v-2h12zm-2-2V9H10v2h10zm2 10v2H10v-2h12zm-2-2v-2H10v2h10z" />
                    </svg>
                    <div>
                      <div className="text-sm text-white">LP Reporting</div>
                      <div className="mt-2 text-sm text-gray-50">Scale LP reporting</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Resources Dropdown */}
            <div className="group peer">
              <button className="relative flex items-center gap-2 px-3 py-4 text-sm font-normal after:absolute after:-left-8 after:-right-8 after:bottom-2 after:z-10 after:hidden after:h-6 after:[transform:perspective(8px)_rotateX(20deg)] group-hover:font-medium after:group-hover:block">
                <div className="relative">
                  <div className="invisible font-medium">Resources</div>
                  <div className="absolute inset-0">Resources</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 13 12" className="inline-flex shrink-0 size-3">
                  <path d="M5.824 9.842.967 4.984a.854.854 0 0 1 0-1.21l.807-.807a.854.854 0 0 1 1.21 0L6.429 6.41 9.87 2.967a.854.854 0 0 1 1.21 0l.807.807a.853.853 0 0 1 0 1.21L7.031 9.842a.85.85 0 0 1-1.207 0Z" />
                </svg>
              </button>
              <div className="absolute left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-gradient-to-l from-dark/70 to-neutral-900 shadow-lg backdrop-blur-[2px] group-hover:block w-[800px]" role="menu">
                <div className="grid auto-cols-fr grid-flow-col gap-x-8 gap-y-2 px-10 py-8 grid-rows-1" role="none">
                  <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <path d="M27 3H5a2.002 2.002 0 0 0-2 2v22a2.002 2.002 0 0 0 2 2h22a2.002 2.002 0 0 0 2-2V5a2.002 2.002 0 0 0-2-2ZM5 5h22v4H5Zm22 22H5V11h22Z" />
                      <path d="M10 13H7v2h3v-2ZM10 18H7v2h3v-2ZM10 23H7v2h3v-2Z" />
                    </svg>
                    <div>
                      <div className="text-sm text-white">Templates</div>
                    </div>
                  </Link>
                  <Link href="https://help.valyxo.com/" target="_blank" rel="noopener" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 25 25" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <path fill="currentColor" d="M12.5 20.313a7.812 7.812 0 1 1 0-15.626 7.812 7.812 0 0 1 0 15.624Zm0-14.063a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5Zm-.782 9.375h1.563v1.563h-1.563v-1.563Zm0-6.25h1.563a1.562 1.562 0 1 1 0 3.125v1.563h-1.563V10.5a.782.782 0 0 1 .782-.781 1 1 0 1 0 0-2h-1.563V6.594h1.563a2.344 2.344 0 0 1 0 4.688Z" />
                    </svg>
                    <div>
                      <div className="text-sm text-white">Help Center</div>
                    </div>
                  </Link>
                  <Link href="https://updates.valyxo.com/" target="_blank" rel="noopener" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <path fill="currentColor" d="M16 23a1 1 0 0 1-.707-.293l-4-4 1.414-1.414L16 20.586l3.293-3.293 1.414 1.414-4 4A1 1 0 0 1 16 23Z" />
                      <path fill="currentColor" d="M16 21a1 1 0 0 1-.707-.293l-4-4 1.414-1.414L16 18.586l3.293-3.293 1.414 1.414-4 4A1 1 0 0 1 16 21ZM2 4v24a2 2 0 0 0 2 2h10v-2H4V6h24v8h2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                      <path fill="currentColor" d="M28 30h-7a2.002 2.002 0 0 1-2-2v-7a2.002 2.002 0 0 1 2-2h7a2.002 2.002 0 0 1 2 2v7a2.002 2.002 0 0 1-2 2Zm-7-9v7h7v-7Z" />
                    </svg>
                    <div>
                      <div className="text-sm text-white">Product Updates</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Pricing Dropdown */}
            <div className="group peer">
              <button className="relative flex items-center gap-2 px-3 py-4 text-sm font-normal after:absolute after:-left-8 after:-right-8 after:bottom-2 after:z-10 after:hidden after:h-6 after:[transform:perspective(8px)_rotateX(20deg)] group-hover:font-medium after:group-hover:block">
                <div className="relative">
                  <div className="invisible font-medium">Pricing</div>
                  <div className="absolute inset-0">Pricing</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 13 12" className="inline-flex shrink-0 size-3">
                  <path d="M5.824 9.842.967 4.984a.854.854 0 0 1 0-1.21l.807-.807a.854.854 0 0 1 1.21 0L6.429 6.41 9.87 2.967a.854.854 0 0 1 1.21 0l.807.807a.853.853 0 0 1 0 1.21L7.031 9.842a.85.85 0 0 1-1.207 0Z" />
                </svg>
              </button>
              <div className="absolute left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-gradient-to-l from-dark/70 to-neutral-900 shadow-lg backdrop-blur-[2px] group-hover:block w-[704px]" role="menu">
                <div className="grid auto-cols-fr grid-flow-col gap-x-8 gap-y-2 px-10 py-8 grid-rows-1" role="none">
                  <Link href="/pricing" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <path d="M8 8h2v4H8zm0 6h2v4H8zm6-6h2v4h-2zm0 6h2v4h-2zm-6 6h2v4H8zm6 0h2v4h-2z" />
                      <path d="M30 14a2 2 0 0 0-2-2h-6V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v26h28ZM4 4h16v24H4Zm18 24V14h6v14Z" />
                      <path d="M0 0h32v32H0z" fill="none" />
                    </svg>
                    <div>
                      <div className="text-sm text-white">Founder Pricing</div>
                      <div className="mt-2 text-sm text-gray-50">Plans & features for founders</div>
                    </div>
                  </Link>
                  <Link href="/investor-pricing" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <path d="M2 28h28v2H2zm25-17a1 1 0 0 0 1-1V7a1 1 0 0 0-.66-.94l-11-4a1 1 0 0 0-.68 0l-11 4A1 1 0 0 0 4 7v3a1 1 0 0 0 1 1h1v13H4v2h24v-2h-2V11ZM6 7.7l10-3.64L26 7.7V9H6ZM18 24h-4V11h4ZM8 11h4v13H8Zm16 13h-4V11h4Z" />
                      <path d="M0 0h32v32H0z" fill="none" />
                    </svg>
                    <div>
                      <div className="text-sm text-white">Investor Pricing</div>
                      <div className="mt-2 text-sm text-gray-50">Plans & features for investors</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Navigation */}
        <nav className="lg:hidden">
          <input type="checkbox" id="hamburger" className="peer hidden" />
          <label htmlFor="hamburger" className="flex h-10 w-14 cursor-pointer items-center justify-center peer-checked:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 16" className="inline-flex shrink-0 h-4 w-5 text-gray-50">
              <rect width="20" height="2" rx="1" />
              <rect width="20" height="2" y="7" rx="1" />
              <rect width="20" height="2" y="14" rx="1" />
            </svg>
          </label>
          <label htmlFor="hamburger" className="hidden h-10 w-14 cursor-pointer items-center justify-center peer-checked:flex">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="inline-flex shrink-0 size-8 text-gray-50">
              <path d="M17.414 16 24 9.414 22.586 8 16 14.586 9.414 8 8 9.414 14.586 16 8 22.586 9.414 24 16 17.414 22.586 24 24 22.586 17.414 16z" />
              <path d="M0 0h32v32H0z" fill="none" />
            </svg>
          </label>
          <div className="fixed inset-0 top-[68px] hidden w-screen space-y-4 overflow-y-auto bg-dark px-6 py-8 text-white peer-checked:block">
            <div>
              <input type="checkbox" id="toggle-For Founders" className="peer hidden" />
              <label htmlFor="toggle-For Founders" className="group flex cursor-pointer items-center justify-between gap-2 py-2 text-sm font-normal peer-checked:font-medium">
                For Founders
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 13 12" className="inline-flex shrink-0 size-3 peer-checked:group-[]:rotate-180">
                  <path d="M5.824 9.842.967 4.984a.854.854 0 0 1 0-1.21l.807-.807a.854.854 0 0 1 1.21 0L6.429 6.41 9.87 2.967a.854.854 0 0 1 1.21 0l.807.807a.853.853 0 0 1 0 1.21L7.031 9.842a.85.85 0 0 1-1.207 0Z" />
                </svg>
              </label>
              <div className="hidden peer-checked:block" role="menu" tabIndex={-1}>
                <hr className="mt-4" />
                <div className="mt-4 space-y-2" role="none">
                  <Link href="/login" className="text-white text-base font-normal hover:font-medium py-2 block">Investor Updates</Link>
                  <Link href="/login" className="text-white text-base font-normal hover:font-medium py-2 block">Fundraising</Link>
                  <Link href="/login" className="text-white text-base font-normal hover:font-medium py-2 block">Metric Tracking</Link>
                </div>
              </div>
            </div>
            <hr />
            <div>
              <input type="checkbox" id="toggle-For Investors" className="peer hidden" />
              <label htmlFor="toggle-For Investors" className="group flex cursor-pointer items-center justify-between gap-2 py-2 text-sm font-normal peer-checked:font-medium">
                For Investors
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 13 12" className="inline-flex shrink-0 size-3 peer-checked:group-[]:rotate-180">
                  <path d="M5.824 9.842.967 4.984a.854.854 0 0 1 0-1.21l.807-.807a.854.854 0 0 1 1.21 0L6.429 6.41 9.87 2.967a.854.854 0 0 1 1.21 0l.807.807a.853.853 0 0 1 0 1.21L7.031 9.842a.85.85 0 0 1-1.207 0Z" />
                </svg>
              </label>
              <div className="hidden peer-checked:block" role="menu" tabIndex={-1}>
                <hr className="mt-4" />
                <div className="mt-4 space-y-2" role="none">
                  <Link href="/company-dashboard?role=investor" className="text-white text-base font-normal hover:font-medium py-2 block">Portfolio Monitoring</Link>
                  <Link href="/login" className="text-white text-base font-normal hover:font-medium py-2 block">Portfolio Insights</Link>
                  <Link href="/login" className="text-white text-base font-normal hover:font-medium py-2 block">LP Reporting</Link>
                </div>
              </div>
            </div>
            <hr />
            <div>
              <input type="checkbox" id="toggle-Product" className="peer hidden" />
              <label htmlFor="toggle-Product" className="group flex cursor-pointer items-center justify-between gap-2 py-2 text-sm font-normal peer-checked:font-medium">
                Product
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 13 12" className="inline-flex shrink-0 size-3 peer-checked:group-[]:rotate-180">
                  <path d="M5.824 9.842.967 4.984a.854.854 0 0 1 0-1.21l.807-.807a.854.854 0 0 1 1.21 0L6.429 6.41 9.87 2.967a.854.854 0 0 1 1.21 0l.807.807a.853.853 0 0 1 0 1.21L7.031 9.842a.85.85 0 0 1-1.207 0Z" />
                </svg>
              </label>
              <div className="hidden peer-checked:block" role="menu" tabIndex={-1}>
                <hr className="mt-4" />
                <div className="mt-4 space-y-2" role="none">
                  <Link href="/login" className="text-white text-base font-normal hover:font-medium py-2 block">Features</Link>
                  <Link href="/login" className="text-white text-base font-normal hover:font-medium py-2 block">Integrations</Link>
                  <Link href="/login" className="text-white text-base font-normal hover:font-medium py-2 block">AI Insights</Link>
                </div>
              </div>
            </div>
            <hr />
            <div>
              <input type="checkbox" id="toggle-Resources" className="peer hidden" />
              <label htmlFor="toggle-Resources" className="group flex cursor-pointer items-center justify-between gap-2 py-2 text-sm font-normal peer-checked:font-medium">
                Resources
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 13 12" className="inline-flex shrink-0 size-3 peer-checked:group-[]:rotate-180">
                  <path d="M5.824 9.842.967 4.984a.854.854 0 0 1 0-1.21l.807-.807a.854.854 0 0 1 1.21 0L6.429 6.41 9.87 2.967a.854.854 0 0 1 1.21 0l.807.807a.853.853 0 0 1 0 1.21L7.031 9.842a.85.85 0 0 1-1.207 0Z" />
                </svg>
              </label>
              <div className="hidden peer-checked:block" role="menu" tabIndex={-1}>
                <hr className="mt-4" />
                <div className="mt-4 space-y-2" role="none">
                  <Link href="/login" className="text-white text-base font-normal hover:font-medium py-2 block">Templates</Link>
                  <Link href="https://help.valyxo.com/" target="_blank" rel="noopener" className="text-white text-base font-normal hover:font-medium py-2 block">Help Center</Link>
                  <Link href="https://updates.valyxo.com/" target="_blank" rel="noopener" className="text-white text-base font-normal hover:font-medium py-2 block">Product Updates</Link>
                </div>
              </div>
            </div>
            <hr />
            <div>
              <input type="checkbox" id="toggle-Pricing" className="peer hidden" />
              <label htmlFor="toggle-Pricing" className="group flex cursor-pointer items-center justify-between gap-2 py-2 text-sm font-normal peer-checked:font-medium">
                Pricing
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 13 12" className="inline-flex shrink-0 size-3 peer-checked:group-[]:rotate-180">
                  <path d="M5.824 9.842.967 4.984a.854.854 0 0 1 0-1.21l.807-.807a.854.854 0 0 1 1.21 0L6.429 6.41 9.87 2.967a.854.854 0 0 1 1.21 0l.807.807a.853.853 0 0 1 0 1.21L7.031 9.842a.85.85 0 0 1-1.207 0Z" />
                </svg>
              </label>
              <div className="hidden peer-checked:block" role="menu" tabIndex={-1}>
                <hr className="mt-4" />
                <div className="mt-4 space-y-2" role="none">
                  <Link href="/pricing" className="text-white text-base font-normal hover:font-medium py-2 block">Founder Pricing</Link>
                  <Link href="/investor-pricing" className="text-white text-base font-normal hover:font-medium py-2 block">Investor Pricing</Link>
                </div>
              </div>
            </div>
            <hr />
            <div className="flex gap-4 py-8">
              <Link href="/login" className="px-3 py-2 text-white border rounded text-base hover:bg-gray-700 transition-colors ease-in text-sm">
                Sign In
              </Link>
              <Link href="/login" className="px-3 py-2 text-dark bg-white border rounded text-lg hover:bg-transparent hover:text-white transition-colors ease-in text-sm">
                Get Valyxo Free
              </Link>
            </div>
          </div>
        </nav>

        <div className="hidden flex-1 items-center justify-end gap-2 lg:flex">
          <Link
            href="/login"
            className="px-3 py-2 text-white border rounded text-base hover:bg-gray-700 transition-colors ease-in text-sm [&:not(:hover)]:border-transparent"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="relative z-10 rounded border border-emerald-500/40 px-3 py-2 text-base text-white before:absolute before:inset-0 before:-z-20 before:rounded before:bg-gradient-to-r before:from-black before:from-35% before:opacity-0 before:transition-opacity before:duration-300 before:ease-in hover:before:opacity-100 after:absolute after:inset-0 after:-z-10 after:rounded after:bg-gradient-to-b after:from-black after:opacity-0 after:transition-opacity after:duration-500 after:ease-in hover:after:opacity-100 transition-colors ease-in before:to-brand-blue after:to-brand-blue text-sm"
          >
            Get Valyxo Free
          </Link>
        </div>
      </div>
    </header>
    </>
  );
}
