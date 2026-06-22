-- Add photo_urls column to speaker_profiles for portfolio images.
-- DEFAULT '{}' ensures existing rows get an empty array (never NULL).

ALTER TABLE public.speaker_profiles
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

-- Create speaker-photos storage bucket for portfolio images.

INSERT INTO storage.buckets (id, name, public)
VALUES ('speaker-photos', 'speaker-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "speaker-photos: public read" ON storage.objects;
CREATE POLICY "speaker-photos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'speaker-photos');

DROP POLICY IF EXISTS "speaker-photos: owner upload" ON storage.objects;
CREATE POLICY "speaker-photos: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'speaker-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "speaker-photos: owner update" ON storage.objects;
CREATE POLICY "speaker-photos: owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'speaker-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "speaker-photos: owner delete" ON storage.objects;
CREATE POLICY "speaker-photos: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'speaker-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
