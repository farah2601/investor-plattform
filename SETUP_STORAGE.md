# Supabase Storage Setup for Company Logos

## 1. Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `company-logos`
4. Make it **Public** (or use signed URLs if you prefer)
5. File size limit: 2MB
6. Allowed MIME types: `image/png, image/jpeg, image/jpg, image/svg+xml`

## 2. Set Up Storage Policies

Run this SQL in Supabase SQL Editor:

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

## 3. Storage Path Convention

- Files are stored as: `{companyId}/logo.{ext}`
- Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890/logo.png`
- The API handles file extension detection automatically

## 4. Environment Variables

Ensure these are set in your environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)
