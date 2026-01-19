# Quick Setup Guide: Company Logos Storage

## Step 1: Create Storage Bucket (2 minutter)

1. Gå til Supabase Dashboard: https://supabase.com/dashboard
2. Velg ditt prosjekt
3. Gå til **Storage** i venstre meny
4. Klikk **"New bucket"** knappen
5. Fyll ut:
   - **Name:** `company-logos`
   - **Public bucket:** ✅ Sjekk av denne (viktig!)
   - **File size limit:** 2 MB
   - **Allowed MIME types:** `image/png, image/jpeg, image/jpg, image/svg+xml`
6. Klikk **"Create bucket"**

## Step 2: Set Up Storage Policies (1 minutt)

1. Gå til **SQL Editor** i Supabase Dashboard
2. Kopier og lim inn følgende SQL:

```sql
-- Allow authenticated users to upload logos for their companies
CREATE POLICY "Company owners can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies WHERE owner_id = auth.uid()
  )
);

-- Allow public read access to logos
CREATE POLICY "Public can read company logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Allow company owners to delete their logos
CREATE POLICY "Company owners can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies WHERE owner_id = auth.uid()
  )
);

-- Allow company owners to update their logos
CREATE POLICY "Company owners can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies WHERE owner_id = auth.uid()
  )
);
```

3. Klikk **"Run"** for å kjøre SQL-en

## Step 3: Test Upload

1. Gå tilbake til Company Settings → Branding i appen
2. Prøv å laste opp en logo igjen
3. Det skal nå fungere! 🎉

## Troubleshooting

**Hvis du får "policy already exists" feil:**
- Det betyr at policies allerede er opprettet. Det er ok, bare fortsett.

**Hvis bucket allerede eksisterer:**
- Du trenger ikke opprette den igjen. Sjekk bare at den er satt som "Public".

**Hvis upload fortsatt feiler:**
- Sjekk at bucket-navnet er nøyaktig `company-logos` (små bokstaver, med bindestrek)
- Sjekk at bucket er satt som "Public"
- Sjekk browser console (F12) for detaljerte feilmeldinger
