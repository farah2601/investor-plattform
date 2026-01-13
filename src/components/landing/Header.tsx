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
              <div className="absolute left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-gradient-to-l from-dark/70 to-neutral-900 shadow-lg backdrop-blur-[2px] group-hover:block w-[704px]" role="menu">
                <div className="grid auto-cols-fr grid-flow-col gap-x-8 gap-y-2 px-10 py-8" role="none">
                  <div className="mt-3 lg:mt-0">
                    <div className="pl-3 text-sm font-medium text-white">Solutions</div>
                    <ul className="mt-2 space-y-1">
                      <li>
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
                      </li>
                      <li>
                        <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                            <path d="M21 12v-2h-4V7h-2v3h-2a2.002 2.002 0 0 0-2 2v3a2.002 2.002 0 0 0 2 2h6v3h-8v2h4v3h2v-3h2a2.002 2.002 0 0 0 2-2v-3a2.002 2.002 0 0 0-2-2h-6v-3Z" />
                            <path d="M16 4A12 12 0 1 1 4 16 12.035 12.035 0 0 1 16 4m0-2a14 14 0 1 0 14 14A14.041 14.041 0 0 0 16 2Z" />
                            <path d="M0 0h32v32H0z" fill="none" />
                          </svg>
                          <div>
                            <div className="text-sm text-white">Venture Fundraising</div>
                            <div className="mt-2 text-sm text-gray-50">Manage a capital raise</div>
                          </div>
                        </Link>
                      </li>
                      <li>
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
                      </li>
                    </ul>
                  </div>
                  <div className="mt-3 lg:mt-0">
                    <div className="pl-3 text-sm font-medium text-white">Features</div>
                    <ul className="mt-2 space-y-1">
                      <li>
                        <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 items-center px-3 py-2" role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                            <g>
                              <path d="M9.376 7.031H21.75v1.814H9.376V7.03zM9.191 10.383h11.846v1.814H9.19v-1.814zM9.227 24.96l-1.045-1.1 5.227-5.503 5.227 4.402 3.137-4.402 1.045 1.1-4.182 5.503-5.227-4.402-4.182 4.402zM18.674 13.738H8.809v1.813h9.865v-1.813z" />
                              <path d="M25.208 2H5.792C4.802 2 4 2.845 4 3.886v25.228C4 30.155 4.802 31 5.792 31h19.416c.99 0 1.792-.845 1.792-1.886V15.55h-1.792V29.19H5.792V3.814h19.416V15.55H27V3.886C27 2.844 26.198 2 25.208 2z" />
                            </g>
                          </svg>
                          <div>
                            <div className="text-sm text-white">Update Editor</div>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 items-center px-3 py-2" role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                            <path fill="currentColor" d="M26 28H6a2.002 2.002 0 0 1-2-2V11a2.002 2.002 0 0 1 2-2h5.666c.433 0 .854.141 1.201.4l3.466 2.6H26a2.002 2.002 0 0 1 2 2v12a2.002 2.002 0 0 1-2 2ZM11.666 11H5.998L6 26h20V14H15.666l-4-3ZM28 9H17.666l-4-3H6V4h7.666c.433 0 .854.141 1.201.4L18.333 7H28v2Z" />
                          </svg>
                          <div>
                            <div className="text-sm text-white">Data Rooms</div>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 items-center px-3 py-2" role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 25 25" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                            <g fill="currentColor">
                              <path d="M13.282 7.813h-1.563v6.25h1.563v-6.25Zm3.906 3.125h-1.562v3.124h1.562v-3.124ZM9.375 9.375H7.813v4.688h1.562V9.375Z" />
                              <path d="M19.532 3.125h-6.25V1.562h-1.563v1.563H5.47a1.563 1.563 0 0 0-1.562 1.563v10.937a1.563 1.563 0 0 0 1.562 1.563h6.25v4.687H8.594v1.563h7.813v-1.563h-3.125v-4.688h6.25a1.563 1.563 0 0 0 1.562-1.562V4.687a1.563 1.563 0 0 0-1.562-1.562Zm0 12.5H5.469V4.687h14.063v10.938Z" />
                            </g>
                          </svg>
                          <div>
                            <div className="text-sm text-white">Decks</div>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 items-center px-3 py-2" role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 34 35" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                            <g className="funnel">
                              <path fill="currentColor" fillRule="evenodd" d="M7.769 4.972c-.916 0-1.73.75-1.73 1.864V9.97c0 .223.082.589.27 1.006.183.41.427.777.667 1.016a.87.87 0 0 1 .018.019l5.188 5.458.049.055c.354.432.675 1.001.91 1.589.233.583.41 1.26.41 1.91v7.228c0 1.348 1.546 2.181 2.696 1.478l1.896-1.224.013-.008.01-.006c.138-.084.337-.292.506-.617.166-.32.243-.638.243-.853v-1h2v1c0 .61-.192 1.244-.469 1.776-.272.522-.684 1.06-1.228 1.395l-1.895 1.223-.016.01c-2.39 1.477-5.755-.147-5.755-3.174v-7.229c0-.31-.093-.727-.268-1.167a4.29 4.29 0 0 0-.58-1.037l-5.152-5.42c-.444-.449-.811-1.03-1.069-1.603-.255-.569-.443-1.223-.443-1.825V6.836c0-2.155 1.645-3.864 3.729-3.864h18.023a3.74 3.74 0 0 1 3.73 3.729v3c0 .736-.226 1.496-.52 2.139-.294.645-.697 1.261-1.138 1.702l-.707.707-1.414-1.414.707-.707c.235-.236.514-.639.733-1.119.22-.482.339-.952.339-1.309v-3a1.74 1.74 0 0 0-1.73-1.728H7.77Zm9.189 14.28a5.324 5.324 0 1 1 9.728 2.99l.085.086 1.351 1.351.707.708-1.414 1.414-.707-.707-1.351-1.352-.085-.085a5.324 5.324 0 0 1-8.314-4.405Zm5.323-3.323a3.324 3.324 0 1 0 0 6.647 3.324 3.324 0 0 0 0-6.647Z" className="Union" clipRule="evenodd" />
                            </g>
                          </svg>
                          <div>
                            <div className="text-sm text-white">Pipelines</div>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 items-center px-3 py-2" role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                            <g>
                              <path d="M26 21H24V26H26V21Z" fill="currentColor" />
                              <path d="M22 16H20V26H22V16Z" fill="currentColor" />
                              <path d="M11 26C9.6744 25.9984 8.40353 25.4712 7.46619 24.5338C6.52885 23.5965 6.00156 22.3256 6 21H8C8 21.5933 8.17595 22.1734 8.50559 22.6667C8.83524 23.1601 9.30377 23.5446 9.85195 23.7716C10.4001 23.9987 11.0033 24.0581 11.5853 23.9424C12.1672 23.8266 12.7018 23.5409 13.1213 23.1213C13.5409 22.7018 13.8266 22.1672 13.9424 21.5853C14.0581 21.0033 13.9987 20.4001 13.7716 19.8519C13.5446 19.3038 13.1601 18.8352 12.6667 18.5056C12.1734 18.1759 11.5933 18 11 18V16C12.3261 16 13.5979 16.5268 14.5355 17.4645C15.4732 18.4021 16 19.6739 16 21C16 22.3261 15.4732 23.5979 14.5355 24.5355C13.5979 25.4732 12.3261 26 11 26Z" fill="currentColor" />
                              <path d="M28 2H4C3.46973 2.00053 2.96133 2.21141 2.58637 2.58637C2.21141 2.96133 2.00053 3.46973 2 4V28C2.00061 28.5302 2.21152 29.0386 2.58646 29.4135C2.9614 29.7885 3.46975 29.9994 4 30H28C28.5302 29.9993 29.0385 29.7883 29.4134 29.4134C29.7883 29.0385 29.9993 28.5302 30 28V4C29.9994 3.46975 29.7885 2.9614 29.4135 2.58646C29.0386 2.21152 28.5302 2.00061 28 2ZM28 11H14V4H28V11ZM12 4V11H4V4H12ZM4 28V13H28.0007L28.002 28H4Z" fill="currentColor" />
                            </g>
                          </svg>
                          <div>
                            <div className="text-sm text-white">Dashboards</div>
                          </div>
                        </Link>
                      </li>
                    </ul>
                  </div>
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
              <div className="absolute left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-gradient-to-l from-dark/70 to-neutral-900 shadow-lg backdrop-blur-[2px] group-hover:block w-[1024px]" role="menu">
                <div className="grid auto-cols-fr grid-flow-col gap-x-8 gap-y-2 px-10 py-8" role="none">
                  <div className="mt-3 lg:mt-0">
                    <div className="pl-3 text-sm font-medium text-white">Solutions</div>
                    <ul className="mt-2 space-y-1">
                      <li>
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
                      </li>
                      <li>
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
                      </li>
                      <li>
                        <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                            <path d="M25.708 1.5H6.292c-.99 0-1.792.845-1.792 1.886v25.228c0 1.041.802 1.886 1.792 1.886h19.416c.99 0 1.792-.845 1.792-1.886V3.386c0-1.042-.802-1.886-1.792-1.886zm0 13.551V28.69H6.292V3.314h19.416V15.05zM22 13v2H10v-2h12zm-2-2V9H10v2h10zm2 10v2H10v-2h12zm-2-2v-2H10v2h10z" />
                          </svg>
                          <div>
                            <div className="text-sm text-white">LP Reporting</div>
                            <div className="mt-2 text-sm text-gray-50">Scale LP reporting</div>
                          </div>
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="mt-3 lg:mt-0">
                    <div className="pl-3 text-sm font-medium text-white">Valyxo AI</div>
                    <ul className="mt-2 space-y-1">
                      <li>
                        <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                            <path d="M20,21H12a2,2,0,0,1-2-2V17a2,2,0,0,1,2-2h8a2,2,0,0,1,2,2v2A2,2,0,0,1,20,21Zm-8-4v2h8V17Z" />
                            <path d="M28,4H4A2,2,0,0,0,2,6v4a2,2,0,0,0,2,2V28a2,2,0,0,0,2,2H26a2,2,0,0,0,2-2V12a2,2,0,0,0,2-2V6A2,2,0,0,0,28,4ZM26,28H6V12H26Zm2-18H4V6H28v4Z" />
                          </svg>
                          <div>
                            <div className="text-sm text-white">AI Inbox</div>
                            <div className="mt-2 text-sm text-gray-50">Turn email into insights</div>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                            <path d="M30 13A11 11 0 0 0 19 2h-8a9 9 0 0 0-9 9v3a5 5 0 0 0 5 5h1.1a5 5 0 0 0 4.9 4h1.38l4 7 1.73-1-4-6.89A2 2 0 0 0 14.38 21H13a3 3 0 0 1 0-6h1v-2h-1a5 5 0 0 0-4.9 4H7a3 3 0 0 1-3-3v-2h2a3 3 0 0 0 3-3V8H7v1a1 1 0 0 1-1 1H4.08A7 7 0 0 1 11 4h6v2a1 1 0 0 1-1 1h-2v2h2a3 3 0 0 0 3-3V4a9 9 0 0 1 8.05 5H26a3 3 0 0 0-3 3v1h2v-1a1 1 0 0 1 1-1h1.77a8.76 8.76 0 0 1 .23 2v1a5 5 0 0 1-5 5h-3v2h3a7 7 0 0 0 3-.68V21a3 3 0 0 1-3 3h-1v2h1a5 5 0 0 0 5-5v-2.11A7 7 0 0 0 30 14Z" />
                            <path d="M0 0h32v32H0z" fill="none" />
                          </svg>
                          <div>
                            <div className="text-sm text-white">AI Updates</div>
                            <div className="mt-2 text-sm text-gray-50">Streamline investor updates</div>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 p-3" role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 19" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                            <path fill="currentColor" d="M9.019.75a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm3.694 4.375h-1.524a9.53 9.53 0 0 0-.495-2.725 3.756 3.756 0 0 1 2.019 2.725Zm-3.68 4.374h-.005c-.238-.075-.818-1.138-.924-3.124h1.83c-.105 1.985-.683 3.048-.901 3.124Zm-.93-4.374c.107-1.985.684-3.048.902-3.124h.005c.238.075.818 1.138.924 3.124h-1.83ZM7.344 2.4a9.529 9.529 0 0 0-.494 2.725H5.325A3.756 3.756 0 0 1 7.344 2.4ZM5.326 6.375H6.85c.03.928.198 1.846.494 2.725a3.755 3.755 0 0 1-2.018-2.725ZM10.694 9.1c.297-.88.464-1.797.495-2.725h1.524A3.755 3.755 0 0 1 10.694 9.1ZM16.519 18.25h-15A1.251 1.251 0 0 1 .269 17v-3.75A1.251 1.251 0 0 1 1.519 12h15a1.251 1.251 0 0 1 1.25 1.25V17a1.25 1.25 0 0 1-1.25 1.25Zm-15-5V17h15v-3.75h-15Z" />
                            <path fill="currentColor" d="M3.394 15.75a.625.625 0 1 0 0-1.25.625.625 0 0 0 0 1.25Z" />
                          </svg>
                          <div>
                            <div className="text-sm text-white">AI MCP Server</div>
                            <div className="mt-2 text-sm text-gray-50">Access your data</div>
                          </div>
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="mt-3 lg:mt-0">
                    <div className="pl-3 text-sm font-medium text-white">By Role</div>
                    <ul className="mt-2 space-y-1">
                      <li>
                        <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 items-center px-3 py-2" role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                            <path d="M20 20h10v2H20zM20 24h10v2H20zM20 28h10v2H20zM16 20a3.912 3.912 0 0 1-4-4 3.912 3.912 0 0 1 4-4 3.912 3.912 0 0 1 4 4h2a6 6 0 1 0-6 6Z" />
                            <path d="M12 4a5 5 0 1 1-5 5 5 5 0 0 1 5-5m0-2a7 7 0 1 0 7 7 7 7 0 0 0-7-7ZM22 30h-2v-5a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v5H2v-5a7 7 0 0 1 7-7h6a7 7 0 0 1 7 7Z" />
                          </svg>
                          <div>
                            <div className="text-sm text-white">Ops Teams</div>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 items-center px-3 py-2" role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 25 25" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                            <path d="M12.5 14.062a4.687 4.687 0 1 0 0-9.374 4.687 4.687 0 0 0 0 9.375Zm0-7.812a3.125 3.125 0 1 1 0 6.25 3.125 3.125 0 0 1 0-6.25Zm7.031 10.156H5.47a3.131 3.131 0 0 0-3.125 3.126v3.906h1.563v-3.907a1.564 1.564 0 0 1 1.562-1.562h14.063a1.564 1.564 0 0 1 1.562 1.562v3.907h1.563v-3.907a3.131 3.131 0 0 0-3.126-3.125Z" />
                          </svg>
                          <div>
                            <div className="text-sm text-white">Limited Partners</div>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 items-center px-3 py-2" role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 25 25" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                            <path d="M18.75 7.813a3.906 3.906 0 1 0 0-7.813 3.906 3.906 0 0 0 0 7.813Zm0-6.25a2.344 2.344 0 1 1 0 4.688 2.344 2.344 0 0 1 0-4.688ZM6.25 7.813a3.906 3.906 0 1 0 0-7.813 3.906 3.906 0 0 0 0 7.813Zm0-6.25a2.344 2.344 0 1 1 0 4.688 2.344 2.344 0 0 1 0-4.688Zm6.25 17.968a3.906 3.906 0 1 0 0-7.812 3.906 3.906 0 0 0 0 7.812Zm0-6.25a2.344 2.344 0 1 1 0 4.689 2.344 2.344 0 0 1 0-4.688Zm6.25 11.72H6.25a3.91 3.91 0 0 1-3.906-3.907v-.781h1.562v.78a2.347 2.347 0 0 0 2.344 2.345h12.5a2.347 2.347 0 0 0 2.344-2.344v-.781h1.562v.781A3.91 3.91 0 0 1 18.75 25Zm3.125-15.625h-1.563v-.781A2.347 2.347 0 0 0 18 6.25H7a2.347 2.347 0 0 0-2.344 2.344v.78H3.125v-.78A3.91 3.91 0 0 1 7 4.687h11a3.91 3.91 0 0 1 3.906 3.907v.781h-.031Z" />
                          </svg>
                          <div>
                            <div className="text-sm text-white">Deal Teams</div>
                          </div>
                        </Link>
                      </li>
                    </ul>
                  </div>
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
              <div className="absolute left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-gradient-to-l from-dark/70 to-neutral-900 shadow-lg backdrop-blur-[2px] group-hover:block w-[500px]" role="menu">
                <div className="flex flex-col px-10 py-8 gap-2" role="none">
                  <Link href="https://updates.valyxo.com/" target="_blank" rel="noopener" className="group flex gap-2 rounded-md hover:bg-gray-700 items-center px-3 py-2" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <path fill="currentColor" d="M16 23a1 1 0 0 1-.707-.293l-4-4 1.414-1.414L16 20.586l3.293-3.293 1.414 1.414-4 4A1 1 0 0 1 16 23Z" />
                      <path fill="currentColor" d="M16 21a1 1 0 0 1-.707-.293l-4-4 1.414-1.414L16 18.586l3.293-3.293 1.414 1.414-4 4A1 1 0 0 1 16 21ZM2 4v24a2 2 0 0 0 2 2h10v-2H4V6h24v8h2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                      <path fill="currentColor" d="M28 30h-7a2.002 2.002 0 0 1-2-2v-7a2.002 2.002 0 0 1 2-2h7a2.002 2.002 0 0 1 2 2v7a2.002 2.002 0 0 1-2 2Zm-7-9v7h7v-7Z" />
                    </svg>
                    <div>
                      <div className="text-sm text-white">Product Updates</div>
                    </div>
                  </Link>
                  <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 items-center px-3 py-2" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <path d="M27 3H5a2.002 2.002 0 0 0-2 2v22a2.002 2.002 0 0 0 2 2h22a2.002 2.002 0 0 0 2-2V5a2.002 2.002 0 0 0-2-2ZM5 5h22v4H5Zm22 22H5V11h22Z" />
                      <path d="M10 13H7v2h3v-2ZM10 18H7v2h3v-2ZM10 23H7v2h3v-2Z" />
                    </svg>
                    <div>
                      <div className="text-sm text-white">Templates</div>
                    </div>
                  </Link>
                  <Link href="/login" className="group flex gap-2 rounded-md hover:bg-gray-700 items-center px-3 py-2" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 19 19" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <path fill="currentColor" d="M15.75 17.75h-1.5V8.062A.562.562 0 0 0 13.687 7.5h-3.374V1.562A.562.562 0 0 0 9.75 1h-8.5A.562.562 0 0 0 .687 1.562v16.187c0 .311.25.563.563.563h1.5v-1.5h-.75V2.313h7v5.625c0 .31.25.562.563.562h3.374v9.25h-.75v1.5h3.563a.562.562 0 0 0 .563-.563V10.5h-1.5v7.25Zm-8.063-7h-4.5a.562.562 0 0 0-.562.563v6.75c0 .31.25.562.563.562h4.5a.562.562 0 0 0 .562-.563v-6.75a.562.562 0 0 0-.563-.562Zm-.562 6.75h-3.375v-5.625h3.375V17.5Zm10.125-9h-1.5v2.625H13.125v1.5h2.625V15.5h1.5v-2.625H19.5v-1.5h-2.25V8.75Z" />
                    </svg>
                    <div>
                      <div className="text-sm text-white">Integrations</div>
                    </div>
                  </Link>
                  <Link href="https://help.valyxo.com/" target="_blank" rel="noopener" className="group flex gap-2 rounded-md hover:bg-gray-700 items-center px-3 py-2" role="menuitem">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 25 25" className="inline-flex shrink-0 mt-0.5 size-5 text-gray-400">
                      <path fill="currentColor" d="M12.5 20.313a7.812 7.812 0 1 1 0-15.626 7.812 7.812 0 0 1 0 15.624Zm0-14.063a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5Zm-.782 9.375h1.563v1.563h-1.563v-1.563Zm0-6.25h1.563a1.562 1.562 0 1 1 0 3.125v1.563h-1.563V10.5a.782.782 0 0 1 .782-.781 1 1 0 1 0 0-2h-1.563V6.594h1.563a2.344 2.344 0 0 1 0 4.688Z" />
                    </svg>
                    <div>
                      <div className="text-sm text-white">Help Center</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <Link href="/pricing" className="flex items-center gap-2 px-3 py-4 text-sm font-normal hover:font-medium">
              Pricing
            </Link>
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
                <div className="mt-4" role="none">
                  <Link href="/login" className="text-white text-base font-normal hover:font-medium py-2 block">For Founders</Link>
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
                <div className="mt-4" role="none">
                  <Link href="/login" className="text-white text-base font-normal hover:font-medium py-2 block">For Investors</Link>
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
                <div className="mt-4" role="none">
                  <Link href="/login" className="text-white text-base font-normal hover:font-medium py-2 block">Resources</Link>
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
                <div className="mt-4" role="none">
                  <Link href="/pricing" className="text-white text-base font-normal hover:font-medium py-2 block">Pricing</Link>
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
