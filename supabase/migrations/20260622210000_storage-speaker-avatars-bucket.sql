-- Create speaker-avatars storage bucket with RLS policies.
-- ON CONFLICT DO NOTHING makes this safe if the bucket was created manually.
-- DROP POLICY IF EXISTS before each CREATE makes the migration idempotent.

INSERT INTO storage.buckets (id, name, public)
VALUES ('speaker-avatars', 'speaker-avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "speaker-avatars: public read" ON storage.objects;
CREATE POLICY "speaker-avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'speaker-avatars');

DROP POLICY IF EXISTS "speaker-avatars: owner upload" ON storage.objects;
CREATE POLICY "speaker-avatars: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'speaker-avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "speaker-avatars: owner update" ON storage.objects;
CREATE POLICY "speaker-avatars: owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'speaker-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "speaker-avatars: owner delete" ON storage.objects;
CREATE POLICY "speaker-avatars: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'speaker-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
