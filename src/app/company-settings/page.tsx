import { Suspense } from "react";
import { CompanySettingsContent } from "./page-content";

export const dynamic = 'force-dynamic';

export default function CompanySettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-slate-400">Loading settings...</p>
      </div>
    }>
      <CompanySettingsContent />
    </Suspense>
  );
}
