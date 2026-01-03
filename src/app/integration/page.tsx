"use client";

type Integration = {
  title: string;
  category: string;
  description: string;
  status: "Connected" | "Not connected" | "Coming soon";
};

const integrations: Integration[] = [
  {
    title: "Tripletex",
    category: "Accounting",
    description: "Fetch accounting, revenue and costs automatically.",
    status: "Not connected",
  },
  {
    title: "Fiken",
    category: "Accounting",
    description: "Sync invoices, results and balance.",
    status: "Not connected",
  },
  {
    title: "Pipedrive",
    category: "CRM",
    description: "Fetch pipeline, deals and sales data.",
    status: "Not connected",
  },
  {
    title: "HubSpot",
    category: "CRM",
    description: "Sync customers, sales and pipeline automatically.",
    status: "Not connected",
  },
  {
    title: "Google Sheets",
    category: "Sheets",
    description: "Import KPIs directly from spreadsheets.",
    status: "Connected",
  },
  {
    category: "Marketing",
    title: "Excel",
    description: "Import KPIs from Excel spreadsheets.",
    status: "Coming soon",
  },
];

export default function IntegrationsPage() {
  function handleClick(integration: Integration) {
    if (integration.status === "Coming soon") {
      alert("This integration will be available in the next version.");
    } else {
      alert("Integrations will be connected in the next version of the platform.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>

          <p className="text-slate-400 max-w-3xl text-sm">
            Connect accounting, CRM and other systems. Integrations will be available in the next version.
          </p>

          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Available integrations
          </p>

          {/* subtil linje + ekstra luft ned til kortene */}
          <div className="mt-6 h-px w-full bg-slate-800/80" />
        </header>

        {/* Integrations grid */}
        <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {integrations.map((item) => (
            <div
              key={item.title}
              className="border border-white/10 rounded-xl p-6 bg-slate-900/70 shadow-sm backdrop-blur-sm"
            >
              <p className="text-xs uppercase text-slate-400 mb-1">
                {item.category}
              </p>

              <h2 className="text-xl font-semibold mb-1">{item.title}</h2>

              <p className="text-slate-400 text-sm mb-4">
                {item.description}
              </p>

              <div className="flex items-center justify-between mt-4">
                <p
                  className={
                    item.status === "Connected"
                      ? "text-emerald-400 text-sm"
                      : item.status === "Coming soon"
                      ? "text-amber-400 text-sm"
                      : "text-slate-400 text-sm"
                  }
                >
                  Status: {item.status}
                </p>

                <button
                  type="button"
                  onClick={() => handleClick(item)}
                  className="
                    px-3 py-1 rounded-md
                    text-sm font-medium
                    border border-slate-500
                    text-slate-50
                    bg-transparent
                  "
                >
                  {item.status === "Connected"
                    ? "Open"
                    : item.status === "Coming soon"
                    ? "Soon"
                    : "Connect"}
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}