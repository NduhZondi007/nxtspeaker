"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { Star, MapPin, Globe, Monitor, Calendar, Award, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatZAR } from "@/lib/utils/currency";
import { getEmbedUrl } from "@/lib/utils/media";
import { getTierLabel } from "@/lib/constants/speakers";
import type { SpeakerProfile, Review } from "@/lib/types/database";

type Tab = "profile" | "reviews" | "booking";
const TABS: Tab[] = ["profile", "reviews", "booking"];

interface SpeakerModalProps {
  speaker: SpeakerProfile | null;
  reviews: Review[];
  /** True while the reviews for `speaker` are still being fetched. */
  reviewsLoading?: boolean;
  onClose: () => void;
  onBook: (speaker: SpeakerProfile) => void;
  bookingLoading?: boolean;
}

export function SpeakerModal({ speaker, onClose, ...rest }: SpeakerModalProps) {
  if (!speaker) return null;
  const speakerName = speaker.profiles?.full_name ?? "Speaker";

  return (
    <Modal open={!!speaker} onClose={onClose} maxWidth="2xl" ariaLabel={`${speakerName} — speaker profile`}>
      {/* Keyed by speaker so tab and lightbox state reset when another
          speaker is shown, instead of opening on the previous one's tab. */}
      <SpeakerModalBody key={speaker.id} speaker={speaker} {...rest} />
    </Modal>
  );
}

type BodyProps = Omit<SpeakerModalProps, "speaker" | "onClose"> & { speaker: SpeakerProfile };

function SpeakerModalBody({ speaker, reviews, reviewsLoading = false, onBook, bookingLoading = false }: BodyProps) {
  const [tab, setTab] = useState<Tab>("profile");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const lightboxTrigger = useRef<HTMLButtonElement | null>(null);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const baseId = useId();

  const tierLabel = getTierLabel(speaker.level);
  const speakerName = speaker.profiles?.full_name ?? "Speaker";
  const photos = speaker.photo_urls ?? [];
  const expertise = speaker.expertise ?? [];
  const tags = speaker.tags ?? [];
  const languages = speaker.languages ?? [];
  const avgRating = Number(speaker.avg_rating ?? 0);

  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, current: Tab) {
    const index = TABS.indexOf(current);
    let next: Tab | null = null;
    if (e.key === "ArrowRight") next = TABS[(index + 1) % TABS.length];
    else if (e.key === "ArrowLeft") next = TABS[(index - 1 + TABS.length) % TABS.length];
    else if (e.key === "Home") next = TABS[0];
    else if (e.key === "End") next = TABS[TABS.length - 1];
    if (!next) return;
    e.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  function closeLightbox() {
    setLightboxUrl(null);
    lightboxTrigger.current?.focus();
  }

  return (
    <>
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
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            </p>
          </div>
          <p className="text-[10px] text-muted">{speaker.total_events ?? 0} events</p>
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
      <div className="flex border-b border-line" role="tablist" aria-label="Speaker details">
        {TABS.map((t) => (
          <button
            key={t}
            ref={(el) => {
              tabRefs.current[t] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`${baseId}-panel`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={(e) => onTabKeyDown(e, t)}
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
      <div
        className="p-6"
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${tab}`}
        tabIndex={0}
      >
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

            {photos.length > 0 && (
              <div>
                <h3 className="font-archivo font-bold text-primary mb-2">Photos</h3>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {photos.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      aria-label={`View ${speakerName} photo ${i + 1}`}
                      onClick={(e) => {
                        lightboxTrigger.current = e.currentTarget;
                        setLightboxUrl(url);
                      }}
                      className="relative w-24 h-24 shrink-0 rounded-[8px] overflow-hidden bg-soft"
                    >
                      <Image
                        src={url}
                        alt=""
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
                  <p className="text-sm text-ink">{languages.join(", ") || "—"}</p>
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
                  <p className="text-sm text-ink">{speaker.total_events ?? 0}</p>
                </div>
              </div>
            </div>

            {expertise.length > 0 && (
              <div>
                <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide mb-2">Expertise</p>
                <div className="flex flex-wrap gap-1.5">
                  {expertise.map((e) => (
                    <span key={e} className="px-2.5 py-1 text-xs bg-soft text-primary rounded-full">{e}</span>
                  ))}
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div>
                <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide mb-2">
                  <Award size={10} className="inline mr-1" />
                  Credentials
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
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
            {reviewsLoading ? (
              <p className="text-sm text-muted text-center py-10" role="status">
                Loading reviews…
              </p>
            ) : reviews.length === 0 ? (
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
                    </div>
                    <div className="flex items-center gap-0.5" role="img" aria-label={`${review.rating} out of 5 stars`}>
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
                <span className="font-space-mono font-bold text-secondary">{formatZAR(speaker.speaking_fee_zar)}</span> per event
              </p>
              <p className="text-xs text-muted mb-4">
                Submitting a booking request is free. The speaker will review your event details and respond within 48 hours.
                Chat and hospitality coordination unlock once the booking is confirmed.
              </p>
              <Button
                variant="gold"
                className="w-full"
                loading={bookingLoading}
                onClick={() => onBook(speaker)}
              >
                Request Booking
              </Button>
            </div>

            <div className="text-xs text-muted text-center">
              All fees displayed in South African Rand (ZAR)
            </div>
          </div>
        )}
      </div>

      {lightboxUrl && <Lightbox url={lightboxUrl} alt={`${speakerName} portfolio photo`} onClose={closeLightbox} />}
    </>
  );
}

interface LightboxProps {
  url: string;
  alt: string;
  onClose: () => void;
}

/**
 * Nested inside the profile Modal. It handles its own Escape and Tab and
 * marks them handled (preventDefault), which the Modal's document listener
 * respects — so Escape closes only the photo, not the whole profile.
 */
function Lightbox({ url, alt, onClose }: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === "Tab") {
      // The close button is the only control; keep focus on it.
      e.preventDefault();
      closeRef.current?.focus();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[60] bg-ink/90 flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <Image
          src={url}
          alt={alt}
          width={800}
          height={600}
          sizes="(max-width: 672px) 100vw, 672px"
          className="rounded-[8px] object-contain w-full h-auto max-h-[80vh]"
        />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close photo"
          className="absolute top-2 right-2 p-1.5 rounded-[4px] bg-ink/60 text-white hover:bg-ink transition-colors"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
