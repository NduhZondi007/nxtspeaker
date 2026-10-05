-- ============================================================
-- Speaker public identity — step 2 of 2 (audit H2)
-- ============================================================
-- DEPLOY THE APP FIRST. This drops the policy that let any signed-in user
-- read every ACTIVE speaker's full profiles row — email, phone, company.
-- Discovery, the client dashboard and createBooking read the public copy on
-- speaker_profiles (display_name / display_avatar_url, 20261005140000)
-- from the same release; an older app build still embeds profiles(...) for
-- speakers and would lose their names until the new build is live.
--
-- Who can still read a speaker's profiles row afterwards:
--   * the speaker themselves            ("Users can view own profile")
--   * clients who have booked them      ("Booking counterparties can view each other")
--   * admins                            ("Admins can view all profiles")
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view speaker profiles" ON public.profiles;
