import { supabase } from "./lib/supabaseClient";

type Company = {
  id: string;
  name: string;
  industry: string | null;
  growth_status: string | null;
  runway_months: number | null;
};

export default async function Home() {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: true });

  const companies = (data as Company[]) || [];

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white/90 rounded-xl p-6 shadow max-w-xl w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Investorplattform – test
        </h1>

        {error && (
          <p className="text-red-500 mb-4">
            Feil: {error.message}
          </p>
        )}

        {companies.length === 0 && (
          <p>Ingen selskaper funnet.</p>
        )}

        {companies.length > 0 && (
          <ul className="space-y-2">
            {companies.map((c) => (
              <li key={c.id} className="border rounded-lg px-4 py-2">
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm text-gray-600">
                  Bransje: {c.industry ?? "ukjent"} · Runway:{" "}
                  {c.runway_months ?? "?"} mnd · Status:{" "}
                  {c.growth_status}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
