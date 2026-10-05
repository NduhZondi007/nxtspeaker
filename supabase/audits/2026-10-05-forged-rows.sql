-- READ-ONLY. Run in the Supabase SQL editor BEFORE and after applying
-- 20261005120000_security-hardening.sql. Every query should return 0 rows;
-- anything returned was probably written through a hole that migration
-- closes and needs a human decision (refund, delete, reinstate).

-- 1. Bookings at PAID/COMPLETED with no successful payment (forged status).
SELECT b.id, b.booking_number, b.status, b.quoted_fee_zar, b.created_at
  FROM public.bookings b
 WHERE b.status IN ('PAID', 'COMPLETED')
   AND NOT EXISTS (SELECT 1 FROM public.payments p
                    WHERE p.booking_id = b.id AND p.status IN ('SUCCEEDED', 'REFUNDED'));

-- 2. Bookings whose fee differs from what the speaker charged at the time is
--    not knowable after the fact; flag fees far below the speaker's current fee.
SELECT b.id, b.booking_number, b.status, b.quoted_fee_zar, sp.speaking_fee_zar
  FROM public.bookings b JOIN public.speaker_profiles sp ON sp.id = b.speaker_id
 WHERE b.quoted_fee_zar < sp.speaking_fee_zar * 0.5;

-- 3. Speaker profiles owned by someone whose role is not SPEAKER (self-created).
SELECT sp.id, sp.user_id, p.email, p.role, sp.status, sp.avg_rating, sp.total_events
  FROM public.speaker_profiles sp JOIN public.profiles p ON p.id = sp.user_id
 WHERE p.role <> 'SPEAKER';

-- 4. Payout details marked verified by someone who is not an admin.
SELECT d.speaker_id, d.verified_at, d.verified_by, p.role
  FROM public.speaker_payout_details d LEFT JOIN public.profiles p ON p.id = d.verified_by
 WHERE d.verified_at IS NOT NULL AND COALESCE(p.role, '') <> 'ADMIN';

-- 5. Payouts that exist for bookings that never reached PAID/COMPLETED.
SELECT po.id, po.status, po.amount_cents, b.booking_number, b.status AS booking_status
  FROM public.payouts po JOIN public.bookings b ON b.id = po.booking_id
 WHERE b.status NOT IN ('PAID', 'COMPLETED') AND po.status NOT IN ('CANCELLED');

-- 6. Reviews on bookings that were never paid (enabled by forged COMPLETED).
SELECT r.id, r.speaker_id, r.rating, b.booking_number
  FROM public.reviews r JOIN public.bookings b ON b.id = r.booking_id
 WHERE NOT EXISTS (SELECT 1 FROM public.payments p
                    WHERE p.booking_id = b.id AND p.status IN ('SUCCEEDED', 'REFUNDED'));

-- 7. Profiles whose email no longer matches their auth account.
SELECT p.id, p.email AS profile_email, u.email AS auth_email
  FROM public.profiles p JOIN auth.users u ON u.id = p.id
 WHERE p.email IS DISTINCT FROM u.email;
