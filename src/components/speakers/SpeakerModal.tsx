"use client";

import Image from "next/image";
import { useState } from "react";
import { Star, MapPin, Globe, Monitor, Calendar, Award, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatZAR } from "@/lib/utils/currency";
import { getEmbedUrl } from "@/lib/utils/media";
import type { SpeakerProfile, Review } from "@/lib/types/database";

const TIER_LABELS = ["", "Emerging Talent", "Rising Professional", "Established Expert", "Industry Leader", "Celebrity Speaker"];

type Tab = "profile" | "reviews" | "booking";

interface SpeakerModalProps {
  speaker: SpeakerProfile | null;
  reviews: Review[];
  onClose: () => void;
  onBook: (speaker: SpeakerProfile) => void;
}

export function SpeakerModal({ speaker, reviews, onClose, onBook }: SpeakerModalProps) {
  const [tab, setTab] = useState<Tab>("profile");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!speaker) return null;

  const tierLabel = TIER_LABELS[speaker.level] ?? "Speaker";
  const speakerName = speaker.profiles?.full_name ?? "Speaker";

  return (
    <Modal open={!!speaker} onClose={onClose} maxWidth="2xl">
      {/* Hero — solid navy */}
      <div className="relative bg-primary px-6 pt-8 pb-5">
        <div className="flex items-end gap-4">
          {speaker.profiles?.avatar_url ? (
            <Image
              src={speaker.profiles.avatar_url}
              alt={speakerName}
              width={80}
              height={80}
              className="rounded-[8px] object-cover border-2 border-white/20 shadow-lg shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-[8px] flex items-center justify-center text-3xl font-archivo font-black text-white/30 bg-white/10 border-2 border-white/20 shrink-0">
              {speakerName.charAt(0)}
            </div>
          )}
          <div className="mb-0.5 min-w-0">
            <h2 className="font-archivo font-black text-white uppercase tracking-tight text-xl leading-tight">
              {speakerName}
            </h2>
            <p className="text-secondary text-sm mt-0.5 leading-snug line-clamp-1">{speaker.title}</p>
            <span className="inline-flex items-center px-2 py-0.5 mt-1.5 rounded-full bg-white/10 text-white/75 font-space-mono text-[10px] uppercase tracking-widest border border-white/20">
              {tierLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 border-b border-line">
        <div className="py-3 px-4 text-center border-r border-line">
          <p className="font-space-mono text-base font-bold text-secondary leading-none">
            {formatZAR(speaker.speaking_fee_zar)}
          </p>
          <p className="text-[10px] text-muted mt-0.5">per event</p>
        </div>
        <div className="py-3 px-4 text-center border-r border-line">
          <div className="flex items-center justify-center gap-1">
            <Star size={13} className="text-accent fill-accent" />
            <p className="font-space-mono text-base font-bold text-ink">
              {speaker.avg_rating > 0 ? speaker.avg_rating.toFixed(1) : "—"}
            </p>
          </div>
          <p className="text-[10px] text-muted">{speaker.total_events} events</p>
        </div>
        <div className="py-3 px-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <span
              className={[
                "w-2 h-2 rounded-full inline-block",
                speaker.available ? "bg-success" : "bg-muted",
              ].join(" ")}
            />
            <p className="text-sm font-semibold text-primary">
              {speaker.available ? "Available" : "Unavailable"}
            </p>
          </div>
          <p className="text-[10px] text-muted">
            {[speaker.virtual_available && "Virtual", speaker.hybrid_available && "Hybrid"]
              .filter(Boolean)
              .join(" · ") || "In-person"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line">
        {(["profile", "reviews", "booking"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex-1 py-3 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-primary",
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
                <h3 className="font-archivo font-bold text-primary mb-2">About</h3>
                <p className="text-sm text-ink leading-relaxed">{speaker.bio}</p>
              </div>
            )}

            {speaker.profile_video_url && getEmbedUrl(speaker.profile_video_url) && (
              <div>
                <h3 className="font-archivo font-bold text-primary mb-2">Introduction Video</h3>
                <div className="aspect-video rounded-[8px] overflow-hidden bg-soft">
                  <iframe
                    src={getEmbedUrl(speaker.profile_video_url)!}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`${speakerName} introduction video`}
                  />
                </div>
              </div>
            )}

            {(speaker.photo_urls ?? []).length > 0 && (
              <div>
                <h3 className="font-archivo font-bold text-primary mb-2">Photos</h3>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(speaker.photo_urls ?? []).map((url, i) => (
                    <button
                      key={url}
                      onClick={() => setLightboxUrl(url)}
                      className="relative w-24 h-24 shrink-0 rounded-[8px] overflow-hidden bg-soft"
                    >
                      <Image
                        src={url}
                        alt={`${speakerName} photo ${i + 1}`}
                        fill
                        sizes="96px"
                        className="object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {speaker.location && (
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-secondary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide">Location</p>
                    <p className="text-sm text-ink">{speaker.location}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Globe size={14} className="text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide">Languages</p>
                  <p className="text-sm text-ink">{speaker.languages.join(", ")}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Monitor size={14} className="text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide">Formats</p>
                  <p className="text-sm text-ink">
                    {["In-person", speaker.virtual_available && "Virtual", speaker.hybrid_available && "Hybrid"]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar size={14} className="text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide">Events Delivered</p>
                  <p className="text-sm text-ink">{speaker.total_events}</p>
                </div>
              </div>
            </div>

            {speaker.expertise.length > 0 && (
              <div>
                <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide mb-2">Expertise</p>
                <div className="flex flex-wrap gap-1.5">
                  {speaker.expertise.map((e) => (
                    <span key={e} className="px-2.5 py-1 text-xs bg-soft text-primary rounded-full">{e}</span>
                  ))}
                </div>
              </div>
            )}

            {speaker.tags.length > 0 && (
              <div>
                <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide mb-2">
                  <Award size={10} className="inline mr-1" />
                  Credentials
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {speaker.tags.map((t) => (
                    <span key={t} className="px-2.5 py-1 text-xs bg-secondary/10 text-secondary border border-secondary/20 rounded-full font-medium">
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
                <Star size={32} className="text-line mx-auto mb-3" />
                <p className="font-archivo font-bold text-muted">No reviews yet</p>
                <p className="text-sm text-muted mt-1">Be the first to review this speaker</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border border-line rounded-[8px] p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        {review.profiles?.full_name ?? "Client"}
                      </p>
                      {review.profiles?.company && (
                        <p className="text-xs text-muted">{review.profiles.company}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < review.rating ? "text-accent fill-accent" : "text-line"}
                        />
                      ))}
                    </div>
                  </div>
                  {review.headline && (
                    <p className="font-archivo font-bold text-primary text-sm mb-1">{review.headline}</p>
                  )}
                  {review.body && <p className="text-sm text-ink leading-relaxed">{review.body}</p>}
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
            <div className="bg-accent/5 border border-accent/20 rounded-[8px] p-4">
              <h3 className="font-archivo font-bold text-primary mb-1">
                Book {speakerName}
              </h3>
              <p className="text-sm text-ink mb-3">
                Speaker fee:{" "}
                <span className="font-space-mono font-bold text-accent">{formatZAR(speaker.speaking_fee_zar)}</span> per event
              </p>
              <p className="text-xs text-muted mb-4">
                Submitting a booking request is free. The speaker will review your event details and respond within 48 hours.
                Chat and hospitality coordination unlock once the booking is confirmed.
              </p>
              <Button variant="gold" className="w-full" onClick={() => onBook(speaker)}>
                Request Booking
              </Button>
            </div>

            <div className="text-xs text-muted text-center">
              All fees displayed in South African Rand (ZAR)
            </div>
          </div>
        )}
      </div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-ink/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightboxUrl}
              alt="Portfolio photo"
              width={800}
              height={600}
              className="rounded-[8px] object-contain w-full h-auto max-h-[80vh]"
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-2 right-2 p-1.5 rounded-[4px] bg-ink/60 text-white hover:bg-ink transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
