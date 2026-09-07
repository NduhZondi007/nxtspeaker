-- ============================================================
-- RLS & data-integrity fixes
-- ============================================================
-- Every UPDATE policy in this schema was written with a USING clause and no
-- WITH CHECK. Postgres then reuses USING as the WITH CHECK, which answers
-- "may this row be updated?" but never "is the *new* row acceptable?" — so a
-- user who is allowed to touch a row is allowed to put anything in it. This
-- migration closes the resulting holes and fixes two visibility bugs.
-- ============================================================


-- ------------------------------------------------------------
-- 1. profiles: a user could promote themselves to ADMIN
-- ------------------------------------------------------------
-- "Users can update own profile" / "Admins can update any profile" both
-- permit `auth.uid() = id`, and neither constrains the new row. A plain
-- PATCH to /rest/v1/profiles?id=eq.<self> with {"role":"ADMIN"} therefore
-- succeeded. RLS itself reads the role from the JWT app_metadata claim (so
-- table-level RLS was not directly bypassed), but `assertAdmin()` in
-- src/app/actions/admin.ts authorises the whole admin portal off
-- profiles.role — and that portal then acts with the service-role key.
-- Self-promotion was a full privilege escalation.
--
-- Fix: role and base_role become immutable to everyone except a real admin
-- (identified by the JWT claim, which only the service role can write) and
-- the service role itself.

CREATE OR REPLACE FUNCTION public.enforce_profile_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- auth.uid() is NULL for the service role (admin Server Actions), which is
  -- the sanctioned path for changing a role.
  IF auth.uid() IS NULL
     OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Role cannot be changed'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.base_role IS DISTINCT FROM OLD.base_role THEN
    RAISE EXCEPTION 'Base role cannot be changed'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- The primary key must not be repointed at another auth user either.
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Profile id cannot be changed'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_update_rules ON public.profiles;
CREATE TRIGGER enforce_profile_update_rules
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_update_rules();


-- ------------------------------------------------------------
-- 2. profiles: speakers could not see the clients who booked them
-- ------------------------------------------------------------
-- The three SELECT policies cover: your own row, any *active speaker's* row,
-- and (for admins) everything. A speaker reading a client's profile matched
-- none of them, so every embedded `profiles(*)` join on the speaker side
-- came back NULL — the bookings list, the booking detail page and the chat
-- thread all rendered the literal fallbacks "Client" and "Participant"
-- instead of the organiser's name and company.
--
-- Fix: the two parties to a booking can see each other's profile. Scoped to
-- an existing bookings row, so it exposes nothing before a booking exists.
--
-- The lookup lives in a SECURITY DEFINER function rather than inline in the
-- policy, for the same reason 20260622194851 moved the admin checks out:
-- `bookings` has a policy that queries `profiles`, so a `profiles` policy
-- that queries `bookings` closes a cycle and every authenticated request
-- fails with 42P17 (infinite recursion). A definer function runs as the
-- owner and does not re-enter RLS.

CREATE OR REPLACE FUNCTION public.shares_booking_with(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.speaker_profiles sp ON sp.id = b.speaker_id
    WHERE
      -- caller is the speaker, target row is their client
      (sp.user_id = auth.uid() AND b.client_id = target_profile_id)
      -- caller is the client, target row is their speaker
      OR (b.client_id = auth.uid() AND sp.user_id = target_profile_id)
  );
$$;

REVOKE ALL ON FUNCTION public.shares_booking_with(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shares_booking_with(UUID) TO authenticated;

DROP POLICY IF EXISTS "Booking counterparties can view each other" ON public.profiles;
CREATE POLICY "Booking counterparties can view each other"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.shares_booking_with(profiles.id)
  );


-- ------------------------------------------------------------
-- 3. bookings: any party could rewrite any column, including status and fee
-- ------------------------------------------------------------
-- "Clients and speakers can update their bookings" has no WITH CHECK, so a
-- client could PATCH their own booking to status = 'CONFIRMED' (or
-- 'COMPLETED'), rewrite quoted_fee_zar, or reassign speaker_id — all without
-- going near the Server Actions that were supposed to gate those changes.
--
-- Fix: a trigger that pins the commercial columns and enforces the same
-- state machine the application uses (src/lib/utils/booking.ts).

CREATE OR REPLACE FUNCTION public.enforce_booking_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  acting_client  BOOLEAN;
  acting_speaker BOOLEAN;
BEGIN
  -- Service role (admin Server Actions) and platform admins are unrestricted.
  IF auth.uid() IS NULL
     OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  -- Identity columns and the agreed price are immutable after creation.
  IF NEW.id            IS DISTINCT FROM OLD.id
     OR NEW.booking_number IS DISTINCT FROM OLD.booking_number
     OR NEW.client_id  IS DISTINCT FROM OLD.client_id
     OR NEW.speaker_id IS DISTINCT FROM OLD.speaker_id
     OR NEW.quoted_fee_zar IS DISTINCT FROM OLD.quoted_fee_zar
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Booking identity and fee cannot be changed'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  acting_client := OLD.client_id = auth.uid();
  acting_speaker := EXISTS (
    SELECT 1 FROM public.speaker_profiles sp
    WHERE sp.id = OLD.speaker_id AND sp.user_id = auth.uid()
  );

  IF NOT (acting_client OR acting_speaker) THEN
    RAISE EXCEPTION 'Not a party to this booking'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- A speaker responds to a request; they do not rewrite the organiser's
  -- event brief. Only status and internal_notes are theirs to change.
  IF acting_speaker AND NOT acting_client THEN
    IF NEW.event_name             IS DISTINCT FROM OLD.event_name
       OR NEW.audience_demographics IS DISTINCT FROM OLD.audience_demographics
       OR NEW.exact_location      IS DISTINCT FROM OLD.exact_location
       OR NEW.event_organiser     IS DISTINCT FROM OLD.event_organiser
       OR NEW.associated_company  IS DISTINCT FROM OLD.associated_company
       OR NEW.event_date          IS DISTINCT FROM OLD.event_date
       OR NEW.event_end_date      IS DISTINCT FROM OLD.event_end_date
       OR NEW.duration_minutes    IS DISTINCT FROM OLD.duration_minutes
       OR NEW.event_format        IS DISTINCT FROM OLD.event_format
       OR NEW.estimated_audience  IS DISTINCT FROM OLD.estimated_audience
       OR NEW.client_notes        IS DISTINCT FROM OLD.client_notes
       OR NEW.hospitality_rider_agreed IS DISTINCT FROM OLD.hospitality_rider_agreed
       OR NEW.hospitality_agreed_at    IS DISTINCT FROM OLD.hospitality_agreed_at THEN
      RAISE EXCEPTION 'A speaker cannot edit the event details of a booking'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Status transitions: mirror canSpeakerTransition / canClientCancel.
  IF acting_speaker THEN
    IF NOT (
      (OLD.status = 'PENDING'      AND NEW.status IN ('CONFIRMED', 'DECLINED'))
      OR (OLD.status = 'CONFIRMED'    AND NEW.status IN ('DEPOSIT_PAID', 'COMPLETED'))
      OR (OLD.status = 'DEPOSIT_PAID' AND NEW.status = 'COMPLETED')
    ) THEN
      RAISE EXCEPTION 'Invalid booking status transition % -> % for a speaker', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    -- The client's only status action is withdrawing a live booking.
    IF NOT (
      NEW.status = 'CANCELLED'
      AND OLD.status IN ('PENDING', 'CONFIRMED', 'DEPOSIT_PAID')
    ) THEN
      RAISE EXCEPTION 'Invalid booking status transition % -> % for a client', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_booking_update_rules ON public.bookings;
CREATE TRIGGER enforce_booking_update_rules
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_update_rules();


-- ------------------------------------------------------------
-- 4. speaker_profiles: a speaker could rewrite their own standing
-- ------------------------------------------------------------
-- "Speakers can update own profile" likewise has no WITH CHECK, so a speaker
-- could set avg_rating = 5, inflate total_events, or flip status back to
-- 'ACTIVE' after an admin deactivated them — the deactivation in
-- adminToggleSpeakerStatus was trivially undone from the browser.

CREATE OR REPLACE FUNCTION public.enforce_speaker_profile_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.avg_rating IS DISTINCT FROM OLD.avg_rating
     OR NEW.total_events IS DISTINCT FROM OLD.total_events THEN
    RAISE EXCEPTION 'Speaker status and reputation are managed by the platform'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_speaker_profile_update_rules ON public.speaker_profiles;
CREATE TRIGGER enforce_speaker_profile_update_rules
  BEFORE UPDATE ON public.speaker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_speaker_profile_update_rules();


-- ------------------------------------------------------------
-- 5. reviews: a review could be attributed to the wrong speaker
-- ------------------------------------------------------------
-- "Clients can submit reviews for completed bookings" checks the booking
-- belongs to the reviewer and is COMPLETED, but never that
-- reviews.speaker_id is *that booking's* speaker. A client could therefore
-- post a genuine, verified 1-star review against any speaker on the
-- platform, and the update_speaker_rating trigger would fold it into that
-- speaker's public avg_rating.

DROP POLICY IF EXISTS "Clients can submit reviews for completed bookings" ON public.reviews;
CREATE POLICY "Clients can submit reviews for completed bookings"
  ON public.reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = reviews.booking_id
        AND b.client_id = auth.uid()
        AND b.status = 'COMPLETED'
        AND b.speaker_id = reviews.speaker_id
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'CLIENT'
        )
    )
  );


-- ------------------------------------------------------------
-- 6. messages: chat stayed writable on a cancelled booking
-- ------------------------------------------------------------
-- The INSERT policy excluded only PENDING and DECLINED, but `canChat()`
-- (src/lib/utils/booking.ts) also treats CANCELLED as locked — the UI showed
-- the thread as closed while the API still accepted messages into it.

DROP POLICY IF EXISTS "Participants can send messages when booking is not pending" ON public.messages;
CREATE POLICY "Participants can send messages when booking is open"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND b.status NOT IN ('PENDING', 'DECLINED', 'CANCELLED')
        AND (
          b.client_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.speaker_profiles sp
            WHERE sp.id = b.speaker_id AND sp.user_id = auth.uid()
          )
        )
    )
  );


-- ------------------------------------------------------------
-- 7. speaker_profiles.total_events counted reviews, not events
-- ------------------------------------------------------------
-- update_speaker_rating set total_events to the number of *reviews*, so a
-- speaker who had delivered twenty events but been reviewed twice was shown
-- to clients as "2 events". Count completed bookings instead, and recompute
-- on every event that can change either number (previously the function ran
-- only on review INSERT, so deleting or editing a review left a stale
-- rating, and completing a booking never updated the count at all).

CREATE OR REPLACE FUNCTION public.refresh_speaker_stats(target_speaker_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.speaker_profiles
  SET
    avg_rating = COALESCE(
      (SELECT AVG(rating)::NUMERIC(3,2) FROM public.reviews WHERE speaker_id = target_speaker_id),
      0.00
    ),
    total_events = (
      SELECT COUNT(*) FROM public.bookings
      WHERE speaker_id = target_speaker_id AND status = 'COMPLETED'
    )
  WHERE id = target_speaker_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_speaker_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_speaker_stats(OLD.speaker_id);
    RETURN OLD;
  END IF;

  PERFORM public.refresh_speaker_stats(NEW.speaker_id);
  IF TG_OP = 'UPDATE' AND OLD.speaker_id IS DISTINCT FROM NEW.speaker_id THEN
    PERFORM public.refresh_speaker_stats(OLD.speaker_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_inserted ON public.reviews;
CREATE TRIGGER on_review_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_speaker_rating();

CREATE OR REPLACE FUNCTION public.update_speaker_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  PERFORM public.refresh_speaker_stats(NEW.speaker_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_status_changed ON public.bookings;
CREATE TRIGGER on_booking_status_changed
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_speaker_events();

-- Backfill the counts that were wrong under the old definition.
UPDATE public.speaker_profiles sp
SET total_events = (
      SELECT COUNT(*) FROM public.bookings b
      WHERE b.speaker_id = sp.id AND b.status = 'COMPLETED'
    ),
    avg_rating = COALESCE(
      (SELECT AVG(r.rating)::NUMERIC(3,2) FROM public.reviews r WHERE r.speaker_id = sp.id),
      0.00
    );


-- ------------------------------------------------------------
-- 8. Storage: size and type limits existed only in the browser
-- ------------------------------------------------------------
-- The 5 MB / 3 MB caps and the image-only MIME allowlist were enforced in
-- the upload handlers alone; the buckets themselves accepted anything a
-- direct storage API call sent, of any size, because the bucket policies
-- only check the folder name. Declaring them on the bucket makes the limit
-- real for every client.

UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'speaker-avatars';

UPDATE storage.buckets
SET file_size_limit = 3145728, -- 3 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'speaker-photos';
