"use client";

import Image from "next/image";
import { useState } from "react";
import { Star, MapPin, Globe, Monitor, Calendar, Award } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatZAR } from "@/lib/utils/currency";
import type { SpeakerProfile, Review } from "@/lib/types/database";

const TIER_LABELS = ["", "Emerging Talent", "Rising Professional", "Established Expert", "Industry Leader", "Celebrity Speaker"];
const TIER_COLORS = ["", "#8BA888", "#A8A87C", "#A88C7C", "#8C7CA8", "#C9A96E"];

type Tab = "profile" | "reviews" | "booking";

interface SpeakerModalProps {
  speaker: SpeakerProfile | null;
  reviews: Review[];
  onClose: () => void;
  onBook: (speaker: SpeakerProfile) => void;
}

export function SpeakerModal({ speaker, reviews, onClose, onBook }: SpeakerModalProps) {
  const [tab, setTab] = useState<Tab>("profile");

  if (!speaker) return null;

  const tierColor = TIER_COLORS[speaker.level] ?? "#C9A96E";
  const tierLabel = TIER_LABELS[speaker.level] ?? "Speaker";
  const speakerName = speaker.profiles?.full_name ?? "Speaker";

  return (
    <Modal open={!!speaker} onClose={onClose} maxWidth="2xl">
      {/* Hero */}
      <div className="relative h-32 overflow-hidden" style={{ background: `linear-gradient(135deg, #0A0A0F, ${tierColor}40)` }}>
        <div className="absolute inset-0 flex items-end px-6 pb-4">
          <div className="flex items-end gap-4">
            {speaker.profiles?.avatar_url ? (
              <Image
                src={speaker.profiles.avatar_url}
                alt={speakerName}
                width={80}
                height={80}
                className="rounded-2xl object-cover border-2 border-gold/40 shadow-lg"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg border-2 border-gold/40"
                style={{ background: `linear-gradient(135deg, ${tierColor}, #0A0A0F)` }}
              >
                {speakerName.charAt(0)}
              </div>
            )}
            <div className="mb-1">
              <h2 className="font-cormorant text-2xl font-bold text-white">{speakerName}</h2>
              <p className="text-sm text-white/70">{speaker.title}</p>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1"
                style={{ background: `${tierColor}30`, color: tierColor }}
              >
                {tierLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 border-b border-warm-gray">
        <div className="py-3 px-4 text-center border-r border-warm-gray">
          <p className="font-cormorant text-xl font-bold text-gold">{formatZAR(speaker.speaking_fee_zar)}</p>
          <p className="text-[10px] text-mid-gray">per event</p>
        </div>
        <div className="py-3 px-4 text-center border-r border-warm-gray">
          <div className="flex items-center justify-center gap-1">
            <Star size={14} className="text-gold fill-gold" />
            <p className="font-cormorant text-xl font-bold text-ink">
              {speaker.avg_rating > 0 ? speaker.avg_rating.toFixed(1) : "—"}
            </p>
          </div>
          <p className="text-[10px] text-mid-gray">{speaker.total_events} events</p>
        </div>
        <div className="py-3 px-4 text-center">
          <div className="flex items-center justify-center gap-1">
            {speaker.available ? (
              <span className="w-2 h-2 rounded-full bg-success inline-block" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-mid-gray inline-block" />
            )}
            <p className="text-sm font-semibold text-charcoal">
              {speaker.available ? "Available" : "Unavailable"}
            </p>
          </div>
          <p className="text-[10px] text-mid-gray">
            {[speaker.virtual_available && "Virtual", speaker.hybrid_available && "Hybrid"].filter(Boolean).join(" · ") || "In-person"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-warm-gray">
        {(["profile", "reviews", "booking"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex-1 py-3 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "text-gold border-b-2 border-gold"
                : "text-mid-gray hover:text-charcoal",
            ].join(" ")}
          >
            {t === "reviews" ? `Reviews (${reviews.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {tab === "profile" && (
          <div className="space-y-5">
            {speaker.bio && (
              <div>
                <h3 className="font-cormorant text-lg font-semibold text-ink mb-2">About</h3>
                <p className="text-sm text-charcoal leading-relaxed">{speaker.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {speaker.location && (
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-gold mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide">Location</p>
                    <p className="text-sm text-charcoal">{speaker.location}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Globe size={14} className="text-gold mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide">Languages</p>
                  <p className="text-sm text-charcoal">{speaker.languages.join(", ")}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Monitor size={14} className="text-gold mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide">Formats</p>
                  <p className="text-sm text-charcoal">
                    {["In-person", speaker.virtual_available && "Virtual", speaker.hybrid_available && "Hybrid"]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar size={14} className="text-gold mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide">Events Delivered</p>
                  <p className="text-sm text-charcoal">{speaker.total_events}</p>
                </div>
              </div>
            </div>

            {speaker.expertise.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide mb-2">Expertise</p>
                <div className="flex flex-wrap gap-1.5">
                  {speaker.expertise.map((e) => (
                    <span key={e} className="px-2.5 py-1 text-xs bg-warm-gray text-charcoal rounded-full">{e}</span>
                  ))}
                </div>
              </div>
            )}

            {speaker.tags.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide mb-2">
                  <Award size={10} className="inline mr-1" />
                  Credentials
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {speaker.tags.map((t) => (
                    <span key={t} className="px-2.5 py-1 text-xs bg-gold/10 text-gold-dark border border-gold/20 rounded-full font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "reviews" && (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-10">
                <Star size={32} className="text-warm-gray mx-auto mb-3" />
                <p className="font-cormorant text-lg text-mid-gray">No reviews yet</p>
                <p className="text-sm text-mid-gray mt-1">Be the first to review this speaker</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border border-warm-gray rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-charcoal">
                        {review.profiles?.full_name ?? "Client"}
                      </p>
                      {review.profiles?.company && (
                        <p className="text-xs text-mid-gray">{review.profiles.company}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < review.rating ? "text-gold fill-gold" : "text-warm-gray"}
                        />
                      ))}
                    </div>
                  </div>
                  {review.headline && (
                    <p className="font-cormorant text-base font-semibold text-ink mb-1">{review.headline}</p>
                  )}
                  {review.body && <p className="text-sm text-charcoal leading-relaxed">{review.body}</p>}
                  {review.verified && (
                    <p className="text-[10px] text-success mt-2">✓ Verified booking</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "booking" && (
          <div className="space-y-4">
            <div className="bg-gold/8 border border-gold/20 rounded-xl p-4">
              <h3 className="font-cormorant text-lg font-semibold text-ink mb-1">
                Book {speakerName}
              </h3>
              <p className="text-sm text-charcoal mb-3">
                Speaker fee:{" "}
                <span className="font-bold text-gold">{formatZAR(speaker.speaking_fee_zar)}</span> per event
              </p>
              <p className="text-xs text-mid-gray mb-4">
                Submitting a booking request is free. The speaker will review your event details and respond within 48 hours.
                Chat and hospitality coordination unlock once the booking is confirmed.
              </p>
              <Button variant="gold" className="w-full" onClick={() => onBook(speaker)}>
                Request Booking
              </Button>
            </div>

            <div className="text-xs text-mid-gray text-center">
              All fees displayed in South African Rand (ZAR)
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
