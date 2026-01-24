"use client";

import { UserCompanyProvider } from "@/lib/user-company-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return <UserCompanyProvider>{children}</UserCompanyProvider>;
}
