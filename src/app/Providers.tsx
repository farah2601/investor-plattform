"use client";

import { UserCompanyProvider } from "@/lib/user-company-context";
import { useTheme } from "@/lib/use-theme";

export function Providers({ children }: { children: React.ReactNode }) {
  useTheme();
  return <UserCompanyProvider>{children}</UserCompanyProvider>;
}
