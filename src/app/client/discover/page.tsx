"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { SpeakerProfile, Review, HospitalityRider } from "@/lib/types/database";
import type { BookingFormData } from "@/components/bookings/BookingForm";

const DEFAULT_FILTERS: FilterState = {
  search: "",
  expertise: [],
  available: null,
  format: "",
  minFee: 0,
  maxFee: 200000,
  sort: "rating_desc",
};

export default function DiscoverPage() {
  const [speakers, setSpeakers] = useState<SpeakerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerProfile | null>(null);
  const [speakerReviews, setSpeakerReviews] = useState<Review[]>([]);
  const [bookingSpeaker, setBookingSpeaker] = useState<SpeakerProfile | null>(null);
  const [bookingRider, setBookingRider] = useState<HospitalityRider | null>(null);
  const [reviewCache, setReviewCache] = useState<Map<string, Review[]>>(new Map());
  const { profile, user, loading: authLoading } = useAuth();
  const { success, error } = useToast();
  const supabase = useMemo(() => createClient(), []);

  // Debounced fetch — 300 ms delay prevents a query on every keystroke.
  // The `stale` flag cancels in-flight results if filters change again before the fetch completes.
  useEffect(() => {
    let stale = false;

    const timer = setTimeout(async () => {
      if (stale) return;
      if (authLoading) return;
      if (!user) { setLoading(false); return; }
      setLoading(true);

      let query = supabase
        .from("speaker_profiles")
        .select("*, profiles(*)")
        .eq("status", "ACTIVE");

      if (filters.available !== null) query = query.eq("available", filters.available);
      if (filters.minFee > 0)         query = query.gte("speaking_fee_zar", filters.minFee);
      if (filters.maxFee < 200000)    query = query.lte("speaking_fee_zar", filters.maxFee);
      if (filters.expertise.length > 0) query = query.overlaps("expertise", filters.expertise);
      if (filters.format === "virtual") query = query.eq("virtual_available", true);
      else if (filters.format === "hybrid") query = query.eq("hybrid_available", true);

      switch (filters.sort) {
        case "fee_asc":     query = query.order("speaking_fee_zar", { ascending: true });  break;
        case "fee_desc":    query = query.order("speaking_fee_zar", { ascending: false }); break;
        case "events_desc": query = query.order("total_events",     { ascending: false }); break;
        default:            query = query.order("avg_rating",        { ascending: false });
      }

      const { data, error: speakerFetchError } = await query;
      if (speakerFetchError) {
        console.error("[discover] speaker_profiles fetch failed:", speakerFetchError.message, speakerFetchError.code);
        if (!stale) setLoading(false);
        return;
      }
      if (stale) return;

      let results = (data ?? []) as SpeakerProfile[];
      if (filters.search) {
        const q = filters.search.toLowerCase();
        results = results.filter(
          (sp) =>
            sp.profiles?.full_name?.toLowerCase().includes(q) ||
            sp.title?.toLowerCase().includes(q) ||
            sp.expertise?.some((e) => e.toLowerCase().includes(q)) ||
            sp.bio?.toLowerCase().includes(q)
        );
      }

      setSpeakers(results);
      setLoading(false);
    }, 300);

    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [filters, supabase, user, authLoading]);

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
    setSelectedSpeaker(null);
    const { data: rider } = await supabase
      .from("hospitality_riders")
      .select("*")
      .eq("speaker_id", speaker.id)
      .single();
    setBookingRider((rider as HospitalityRider) ?? null);
    setBookingSpeaker(speaker);
  }

  async function handleSubmitBooking(formData: BookingFormData) {
    if (!bookingSpeaker) return;
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
