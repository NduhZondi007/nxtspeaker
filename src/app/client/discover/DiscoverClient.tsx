"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/layout/TopBar";
import { SpeakerCard } from "@/components/speakers/SpeakerCard";
import { SpeakerModal } from "@/components/speakers/SpeakerModal";
import { SpeakerFilters, type FilterState } from "@/components/speakers/SpeakerFilters";
import { Modal } from "@/components/ui/Modal";
import { BookingForm } from "@/components/bookings/BookingForm";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/layout/AuthProvider";
import { createBooking } from "@/app/actions/bookings";
import {
  getSpeakers,
  getSpeakerReviews,
  filterBySearch,
  DEFAULT_SPEAKER_FILTERS,
  SPEAKER_PAGE_SIZE,
} from "@/lib/data/speakers";
import type { SpeakerProfile, Review, HospitalityRider, Profile } from "@/lib/types/database";
import type { BookingFormData } from "@/components/bookings/BookingForm";
import { createLogger } from "@/lib/logger";

const log = createLogger("discover");

interface DiscoverClientProps {
  initialSpeakers: SpeakerProfile[];
  /** Whether the server's first page was full, so "Load more" is offered. */
  initialHasMore?: boolean;
}

export function DiscoverClient({ initialSpeakers, initialHasMore = false }: DiscoverClientProps) {
  // Seeded from the server-rendered fetch — first paint already has real
  // data, so there's no loading skeleton and no "No speakers found" flash.
  const [speakers, setSpeakers] = useState<SpeakerProfile[]>(initialSpeakers);
  const [hasMore, setHasMore] = useState(initialHasMore);
  // Raw rows consumed so far. Pages are offset by raw rows, not by listable
  // ones, because the in-memory listability check can drop rows from a page.
  const [nextOffset, setNextOffset] = useState(SPEAKER_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_SPEAKER_FILTERS);
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerProfile | null>(null);
  const [speakerReviews, setSpeakerReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  // Identifies the latest review request; an older response that lands late
  // must not overwrite the reviews of the speaker now on screen.
  const reviewRequest = useRef(0);
  const [bookingSpeaker, setBookingSpeaker] = useState<SpeakerProfile | null>(null);
  const [bookingRider, setBookingRider] = useState<HospitalityRider | null>(null);
  // Fallback for when AuthProvider's client-side profile fetch came back empty
  // — see handleBook. Only supplies the name on the hospitality agreement.
  const [bookingClientProfile, setBookingClientProfile] = useState<Profile | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [reviewCache, setReviewCache] = useState<Map<string, Review[]>>(new Map());
  const { profile } = useAuth();
  const { success, error } = useToast();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isFirstRender = useRef(true);

  // Search runs in memory over what is already loaded, so it is excluded
  // from the fetch key: a keystroke must never re-download the speaker table.
  const { search, expertise, available, format, minFee, maxFee, sort } = filters;
  const serverFilters = useMemo<FilterState>(
    () => ({ search: "", expertise, available, format, minFee, maxFee, sort }),
    [expertise, available, format, minFee, maxFee, sort]
  );
  const visibleSpeakers = useMemo(
    () => (search ? filterBySearch(speakers, search) : speakers),
    [speakers, search]
  );

  // Debounced re-fetch — fires only on user-driven filter changes. The
  // server already delivered the default-filter result set on first paint
  // (see page.tsx), so this effect deliberately skips its own first run
  // instead of re-fetching client-side and racing the auth/session bootstrap
  // the way the old implementation did.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let stale = false;

    const timer = setTimeout(async () => {
      if (stale) return;
      setLoading(true);
      const { data, error: speakerFetchError, hasMore: more } = await getSpeakers(
        supabase,
        serverFilters
      );
      if (stale) return;
      if (speakerFetchError) {
        log.error("speaker_profiles fetch failed", { cause: speakerFetchError });
      }
      setSpeakers(data);
      setHasMore(more);
      setNextOffset(SPEAKER_PAGE_SIZE);
      setLoading(false);
    }, 300);

    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [serverFilters, supabase]);

  async function handleLoadMore() {
    setLoadingMore(true);
    const { data, error: speakerFetchError, hasMore: more } = await getSpeakers(
      supabase,
      serverFilters,
      { offset: nextOffset }
    );
    if (speakerFetchError) {
      log.error("speaker_profiles page fetch failed", { cause: speakerFetchError });
      error("Could not load more speakers", "Please try again.");
    } else {
      setSpeakers((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        return [...prev, ...data.filter((s) => !seen.has(s.id))];
      });
      setHasMore(more);
      setNextOffset((offset) => offset + SPEAKER_PAGE_SIZE);
    }
    setLoadingMore(false);
  }

  async function handleSelectSpeaker(speaker: SpeakerProfile) {
    const requestId = ++reviewRequest.current;
    setSelectedSpeaker(speaker);
    const cached = reviewCache.get(speaker.id);
    if (cached) {
      setSpeakerReviews(cached);
      setReviewsLoading(false);
      return;
    }
    // Never show the previous speaker's reviews while this one's load.
    setSpeakerReviews([]);
    setReviewsLoading(true);
    const { data: reviews, error: reviewsError } = await getSpeakerReviews(supabase, speaker.id);
    if (reviewsError) log.error("reviews fetch failed", { cause: reviewsError });
    else setReviewCache((prev) => new Map(prev).set(speaker.id, reviews));
    if (requestId !== reviewRequest.current) return;
    setSpeakerReviews(reviews);
    setReviewsLoading(false);
  }

  async function handleBook(speaker: SpeakerProfile) {
    // Keep the profile modal open (with a loading indicator on the button)
    // until the booking modal is actually ready to replace it — closing
    // selectedSpeaker up front left a beat with neither modal visible,
    // which read as "nothing happened" / a bounce back to the grid.
    setBookingLoading(true);
    let rider: HospitalityRider | null = null;
    try {
      const { data, error: riderError } = await supabase
        .from("hospitality_riders")
        .select("*")
        .eq("speaker_id", speaker.id)
        .maybeSingle();
      if (riderError) {
        // RLS or network failure — don't silently proceed as if the speaker
        // simply has no rider configured; log it, but still open the wizard
        // with rider: null (BookingForm already handles that gracefully)
        // rather than stranding the client with no path forward.
        log.error("hospitality_riders fetch failed", { cause: riderError });
      }
      rider = (data as HospitalityRider) ?? null;
    } catch (err) {
      // The call itself rejecting (network failure, unexpected client
      // exception) — not just resolving with an error — must not leave
      // bookingLoading stuck true forever with the button spinning and the
      // wizard never opening. Same fallback as the error-return path above.
      log.error("hospitality_riders fetch threw", { cause: err });
    }

    // AuthProvider swallows the error from its own profiles fetch, so `profile`
    // can be null for a signed-in client with no trace of why. Re-fetch here so
    // the hospitality agreement still carries the client's real name; if this
    // fails too the wizard still opens, it just says "the client".
    if (!profile) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: freshProfile, error: profileError } = await supabase
            .from("profiles")
            .select("id, role, base_role, full_name, email, phone, company, avatar_url, created_at, updated_at")
            .eq("id", user.id)
            .maybeSingle();
          if (profileError) {
            log.error("profile re-fetch failed", { cause: profileError });
          }
          setBookingClientProfile((freshProfile as Profile) ?? null);
        }
      } catch (err) {
        log.error("profile re-fetch threw", { cause: err });
      }
    }

    setBookingRider(rider);
    setBookingSpeaker(speaker);
    setSelectedSpeaker(null);
    setBookingLoading(false);
  }

  async function handleSubmitBooking(formData: BookingFormData) {
    if (!bookingSpeaker) return;
    try {
      // quoted_fee_zar is looked up server-side — not passed from client
      const result = await createBooking({
        speaker_id: bookingSpeaker.id,
        ...formData,
      });
      if (result.error) {
        error("Booking failed", result.error);
      } else {
        success("Booking request sent!", "The speaker will review and respond within 48 hours.");
        setBookingSpeaker(null);
        // Land the client on the new booking's confirmation page instead of
        // just closing the modal back to the speaker grid — the toast alone
        // fades and leaves no persistent evidence the request went through.
        // Fall back to the list if the insert returned no row: the booking
        // was created either way, and reading `.id` off nothing would throw
        // into the catch below and report a failure that did not happen.
        router.push(result.data?.id ? `/client/bookings/${result.data.id}` : "/client/bookings");
      }
    } catch (err) {
      // The call itself rejecting (network failure, unexpected server
      // action exception) — not just resolving with { error }. BookingForm's
      // own local `finally` still re-enables its submit button either way,
      // but without this catch the user gets no toast at all, success or
      // error, and no idea whether the request went through.
      log.error("createBooking threw", { cause: err });
      error("Booking failed", "Something went wrong — please try again.");
    }
  }

  return (
    <div>
      <TopBar title="Find Speakers" subtitle="Discover world-class speakers for your event" />

      <div className="p-4 sm:p-6 space-y-6">
        <SpeakerFilters filters={filters} onChange={setFilters} />

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 bg-soft rounded-[12px] animate-pulse" />
            ))}
          </div>
        ) : visibleSpeakers.length === 0 ? (
          <div className="text-center py-20">
            <Users size={40} className="text-line mx-auto mb-4" />
            <h3 className="font-archivo font-black text-muted uppercase tracking-tight">No speakers found</h3>
            <p className="text-sm text-muted mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted" aria-live="polite">
              {visibleSpeakers.length} speaker{visibleSpeakers.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleSpeakers.map((speaker) => (
                <SpeakerCard key={speaker.id} speaker={speaker} onClick={handleSelectSpeaker} />
              ))}
            </div>
          </>
        )}

        {!loading && hasMore && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-[22px] py-3 text-sm font-semibold text-primary bg-white border-[1.5px] border-secondary rounded-[3px] hover:bg-secondary/10 transition-colors disabled:opacity-60"
            >
              {loadingMore && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {loadingMore ? "Loading…" : "Load more speakers"}
            </button>
          </div>
        )}
      </div>

      <SpeakerModal
        speaker={selectedSpeaker}
        reviews={speakerReviews}
        reviewsLoading={reviewsLoading}
        onClose={() => setSelectedSpeaker(null)}
        onBook={handleBook}
        bookingLoading={bookingLoading}
      />

      {/* Gated on bookingSpeaker alone. This used to also require `profile`
          from useAuth(), while handleBook closed the speaker card
          unconditionally — so whenever the client-side profile fetch came back
          empty, the card closed and *nothing* opened in its place: no wizard,
          no error, no way forward. The profile is only needed to print a name
          on the hospitality agreement, which has its own fallback. */}
      {bookingSpeaker && (
        <Modal open={!!bookingSpeaker} onClose={() => setBookingSpeaker(null)} maxWidth="2xl">
          <BookingForm
            speaker={bookingSpeaker}
            rider={bookingRider}
            clientProfile={profile ?? bookingClientProfile}
            onSubmit={handleSubmitBooking}
            onCancel={() => setBookingSpeaker(null)}
          />
        </Modal>
      )}
    </div>
  );
}
