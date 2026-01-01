"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg" | "xl";

type NavItem = {
  label: string;
  href: string;
};

function Logo({ size = "lg" }: { size?: LogoSize }) {
  const cfg =
    size === "sm"
      ? { w: 110, h: 28, className: "h-6" }
      : size === "md"
      ? { w: 130, h: 34, className: "h-7" }
      : size === "xl"
      ? { w: 170, h: 46, className: "h-9" }
      : { w: 140, h: 40, className: "h-8" }; // lg default

  return (
    <div className="flex items-center gap-3">
      <Image
        src="/brand/valyxo-logo-white.png"
        alt="Valyxo"
        width={cfg.w}
        height={cfg.h}
        priority
        className={cn(cfg.className, "w-auto")}
      />
    </div>
  );
}

export function AppShell({
  title,
  children,
  logoSize = "lg",
  nav = [
    { label: "Dashboard", href: "/company-dashboard" },
    { label: "Profile", href: "/company-profile" },
    { label: "Investor View", href: "/investor" },
  ],
  showNav = true,
  rightSlot,
}: {
  title?: string;
  children: React.ReactNode;
  logoSize?: LogoSize;
  nav?: NavItem[];
  showNav?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_600px_at_20%_0%,rgba(43,116,255,0.10),transparent_55%),radial-gradient(900px_500px_at_80%_20%,rgba(43,116,255,0.06),transparent_60%)]" />

      {/* header */}
      <header className="sticky top-0 z-50 border-b border-slate-900/70 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-10">
              <Link href="/" className="shrink-0">
                <Logo size={logoSize} />
              </Link>

              {showNav && (
                <nav className="hidden md:flex items-center gap-6">
                  {nav.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/" && pathname?.startsWith(item.href + "/"));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "text-sm font-medium transition-colors",
                          active
                            ? "text-slate-100"
                            : "text-slate-400 hover:text-slate-200"
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>

            <div className="flex items-center gap-3">
              {rightSlot ? rightSlot : title ? (
                <div className="text-sm text-slate-400">{title}</div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* content */}
      <main className="relative mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}