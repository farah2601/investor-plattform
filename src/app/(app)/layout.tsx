"use client";

import { CompanyProvider } from "@/lib/company-context";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CompanyProvider>{children}</CompanyProvider>;
}
