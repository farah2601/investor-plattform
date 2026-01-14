# PostgREST Schema Reload Guide

Hvis du får feil "Could not find the 'arr' column of 'kpi_snapshots' in the schema cache", betyr det at PostgREST ikke har lastet inn de nye kolonnene.

## Løsning 1: Kjør migrasjonen og reload schema

1. **Kjør migrasjonen:**
   ```sql
   -- Gå til Supabase Dashboard → SQL Editor
   -- Kopier hele innholdet fra: supabase/migrations/20250107_fix_kpi_snapshots_schema.sql
   -- Lim inn og klikk "Run"
   ```

2. **Manuell schema reload (kjør dette i SQL Editor):**
   ```sql
   -- Metode 1: pg_notify
   SELECT pg_notify('pgrst', 'reload schema');
   
   -- Metode 2: NOTIFY
   NOTIFY pgrst, 'reload schema';
   
   -- Vent 2-3 sekunder
   ```

3. **Verifiser at kolonnene eksisterer:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'kpi_snapshots' 
   AND column_name IN ('arr', 'mrr', 'burn_rate', 'churn', 'growth_percent', 'runway_months')
   ORDER BY column_name;
   ```

4. **Restart Next.js dev server:**
   ```bash
   # Stop serveren (Ctrl+C)
   npm run dev
   ```

## Løsning 2: Hvis schema reload ikke fungerer

Hvis du fortsatt får feil etter schema reload:

1. **Sjekk at du bruker riktig Supabase prosjekt:**
   - Verifiser at `NEXT_PUBLIC_SUPABASE_URL` og `SUPABASE_SERVICE_ROLE_KEY` peker til riktig prosjekt

2. **Prøv å vente litt:**
   - PostgREST kan ta noen sekunder til minutter å oppdatere schema cache
   - Vent 30-60 sekunder etter migrasjonen

3. **Kontakt Supabase support:**
   - Hvis problemet vedvarer, kan det være et problem med PostgREST cache
   - Supabase support kan manuelt trigge en full schema reload

## Løsning 3: Verifiser migrasjonen faktisk ble kjørt

```sql
-- Sjekk at kolonnene faktisk eksisterer i databasen
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'kpi_snapshots'
ORDER BY ordinal_position;
```

Du skal se:
- `arr` (numeric)
- `mrr` (numeric)
- `burn_rate` (numeric)
- `churn` (numeric)
- `growth_percent` (numeric)
- `runway_months` (numeric)
- `period_date` (date)

## Test etter migrasjon

```bash
# Test API direkte
curl "http://localhost:3000/api/kpi/snapshots?companyId=<din-company-uuid>"

# Skal returnere 200 OK, ikke "column does not exist"
```
