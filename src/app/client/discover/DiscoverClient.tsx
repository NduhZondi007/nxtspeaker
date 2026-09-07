"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
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
import { getSpeakers, DEFAULT_SPEAKER_FILTERS } from "@/lib/data/speakers";
import type { SpeakerProfile, Review, HospitalityRider } from "@/lib/types/database";
import type { BookingFormData } from "@/components/bookings/BookingForm";

interface DiscoverClientProps {
  initialSpeakers: SpeakerProfile[];
}

export function DiscoverClient({ initialSpeakers }: DiscoverClientProps) {
  // Seeded from the server-rendered fetch — first paint already has real
  // data, so there's no loading skeleton and no "No speakers found" flash.
  const [speakers, setSpeakers] = useState<SpeakerProfile[]>(initialSpeakers);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_SPEAKER_FILTERS);
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerProfile | null>(null);
  const [speakerReviews, setSpeakerReviews] = useState<Review[]>([]);
  const [bookingSpeaker, setBookingSpeaker] = useState<SpeakerProfile | null>(null);
  const [bookingRider, setBookingRider] = useState<HospitalityRider | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [reviewCache, setReviewCache] = useState<Map<string, Review[]>>(new Map());
  const { profile } = useAuth();
  const { success, error } = useToast();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isFirstRender = useRef(true);

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
      const { data, error: speakerFetchError } = await getSpeakers(supabase, filters);
      if (stale) return;
      if (speakerFetchError) {
        console.error("[discover] speaker_profiles fetch failed:", speakerFetchError);
      }
      setSpeakers(data);
      setLoading(false);
    }, 300);

    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [filters, supabase]);

  async function handleSelectSpeaker(speaker: SpeakerProfile) {
    setSelectedSpeaker(speaker);
    if (reviewCache.has(speaker.id)) {
      setSpeakerReviews(reviewCache.get(speaker.id)!);
      return;
    }
    const { data: reviews } = await supabase
      .from("reviews")
      .select("*, profiles(*)")
      .eq("speaker_id", speaker.id)
      .order("created_at", { ascending: false });
    const r = (reviews ?? []) as Review[];
    setReviewCache((prev) => new Map(prev).set(speaker.id, r));
    setSpeakerReviews(r);
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
        console.error("[discover] hospitality_riders fetch failed:", riderError);
      }
      rider = (data as HospitalityRider) ?? null;
    } catch (err) {
      // The call itself rejecting (network failure, unexpected client
      // exception) — not just resolving with an error — must not leave
      // bookingLoading stuck true forever with the button spinning and the
      // wizard never opening. Same fallback as the error-return path above.
      console.error("[discover] hospitality_riders fetch threw:", err);
    } finally {
      setBookingRider(rider);
      setBookingSpeaker(speaker);
      setSelectedSpeaker(null);
      setBookingLoading(false);
    }
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
      console.error("[discover] createBooking threw:", err);
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
        ) : speakers.length === 0 ? (
          <div className="text-center py-20">
            <Users size={40} className="text-line mx-auto mb-4" />
            <h3 className="font-archivo font-black text-muted uppercase tracking-tight">No speakers found</h3>
            <p className="text-sm text-muted mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted">
              {speakers.length} speaker{speakers.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {speakers.map((speaker) => (
                <SpeakerCard key={speaker.id} speaker={speaker} onClick={handleSelectSpeaker} />
              ))}
            </div>
          </>
        )}
      </div>

      <SpeakerModal
        speaker={selectedSpeaker}
        reviews={speakerReviews}
        onClose={() => setSelectedSpeaker(null)}
        onBook={handleBook}
        bookingLoading={bookingLoading}
      />

      {bookingSpeaker && profile && (
        <Modal open={!!bookingSpeaker} onClose={() => setBookingSpeaker(null)} maxWidth="2xl">
          <BookingForm
            speaker={bookingSpeaker}
            rider={bookingRider}
            clientProfile={profile}
            onSubmit={handleSubmitBooking}
            onCancel={() => setBookingSpeaker(null)}
          />
        </Modal>
      )}
    </div>
  );
}
