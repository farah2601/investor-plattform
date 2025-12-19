# MCP Agent — Core Engine

MCP Agent er den autonome motoren i Valyxo / MCP Insights-plattformen.

Den har ansvar for å:
1. Hente inn data (mock først, ekte integrasjoner senere)
2. Beregne KPI-er automatisk
3. Lagre KPI-snapshots i Supabase
4. Generere AI Insights basert på tall + historikk
5. Oppdatere investor-view automatisk
6. Kjøre som en cron-job / scheduled agent
7. Kunne trigges manuelt fra founder dashboard

## Overordnet arkitektur

All kjernelogikk ligger i `lib/agent` og er designet for å være:
- **Ren TypeScript** (ingen Next-spesifikke ting her inne)
- **Side-effect kontrollert** (DB-kall og API-kall er tydelig separert)
- **MCP-vennlig** (funksjoner med klare input/output-signaturer)

### Moduler (fase 3)

Fase 3 brytes ned slik:

- `lib/agent/kpiEngine.ts`
  - `calculateKpis(rawData)`
  - `saveSnapshot(companyId, kpis)`
  - `getLatestKpis(companyId)`
  - Håndterer alt rundt KPI-beregning og snapshots.

- `lib/agent/data/fetchCompanyData.ts`
  - Felles entrypoint for å hente rådata for et selskap.
  - Starter med mock-data (`/api/integrations/mock/fetch`), senere ekte integrasjoner (CRM, Stripe, regnskap osv).

- `lib/agent/ai/insights.ts`
  - `generateInsights(kpis, history)` → returnerer 3–7 punkter med innsikt.
  - Bruker LLM (OpenAI / annen provider) til å lage forklarende tekst basert på KPI-trender.

- `lib/agent/profile/profileAgent.ts`
  - Ansvar for å oppdatere “problem / solution / why now / market / product” basert på LinkedIn + website + KPI-er.
  - Kalles fra `/api/agent/profile`.

- `lib/agent/scheduler.ts`
  - Funksjoner som brukes av cron-jobben:
    - `runAgentForAllCompanies()`
    - `runAgentForCompany(companyId)`
  - Brukes av `/api/agent/cron`.

- `lib/agent/logs.ts` (valgfritt / nice-to-have)
  - Skrive agent-kjøringer til `agent_logs`-tabellen i Supabase.
  - Gjør det mulig å se historikk i admin-panelet.

## Forventet dataflyt

### 1. Cron / Autonom kjøring

1. Vercel cron treffer `POST /api/agent/cron`
2. Route kaller `runAgentForAllCompanies()`
3. For hver bedrift:
   - `fetchCompanyData(companyId)` (mock eller ekte integrasjoner)
   - `calculateKpis(rawData)`
   - `saveSnapshot(companyId, kpis)`
   - Hente KPI-historikk
   - `generateInsights(currentKpis, history)`
   - Lagre innsikt + oppdatere investor-view

### 2. Manuell trigger fra founder dashboard

1. UI-knapp → `POST /api/agent/run` eller lignende
2. Route kaller `runAgentForCompany(companyId)`
3. Samme pipeline som cron, men kun for én bedrift.

## MCP Tool design

Alle nøkkelfunksjoner skal kunne eksponeres som MCP-tools senere.  
Det betyr at de designes slik:

- Klar signatur, f.eks:
  - `async function runAgentForCompany(companyId: string, options?: RunOptions): Promise<AgentRunResult>`
  - `async function generateInsights(kpis: KpiSnapshot, history: KpiSnapshot[]): Promise<Insight[]>`
- Returnerer **serialiserbare** objekter (ingen klasser, ingen store sirkulære referanser).
- Tydelig separasjon mellom:
  - **Rå data** (fra integrasjoner)
  - **Beregnede KPI-er**
  - **Persistert tilstand** (Supabase-rows)
  - **AI-genererte tekster** (insights, profile-tekst)

## Kobling til fase 3 checklist

- 3.1 — KPI Data Foundation  
  Implementeres i `lib/agent/kpiEngine.ts` + Supabase-tabell `kpi_snapshots`.

- 3.2 — Mock Data Integration  
  `lib/agent/data/fetchCompanyData.ts` + `app/api/integrations/mock/fetch`.

- 3.3 — AI Insight Engine  
  `lib/agent/ai/insights.ts` + `app/api/insights/route.ts`.

- 3.4 — Autonom Agent (cron)  
  `lib/agent/scheduler.ts` + `app/api/agent/cron/route.ts`.

- 3.5 — Profile Auto-Refresh  
  `lib/agent/profile/profileAgent.ts` + `app/api/agent/profile/route.ts`.

- 3.6 — UI Feedback  
  Investor-view + company dashboard leser siste agent-run (fra `kpi_snapshots`, `insights`, `agent_logs`).

- 3.7 — Stability  
  Fallbacks og feilhåndtering legges inn i hver modul (spesielt data fetching + AI-kall).

## Videre arbeid

Neste steg (3.1) er å:
- Opprette `kpi_snapshots`-tabell i Supabase
- Lage `lib/agent/kpiEngine.ts` med:
  - `calculateKpis(rawData)`
  - `saveSnapshot(companyId, kpis)`
  - `getLatestKpis(companyId)`
