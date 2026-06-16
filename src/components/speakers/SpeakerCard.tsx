"use client";

import Image from "next/image";
import { Star, MapPin, Globe, Monitor } from "lucide-react";
import { formatZAR } from "@/lib/utils/currency";
import type { SpeakerProfile } from "@/lib/types/database";

const TIER_LABELS = [
  "",
  "Emerging Talent",
  "Rising Professional",
  "Established Expert",
  "Industry Leader",
  "Celebrity Speaker",
];

const TIER_COLORS = [
  "",
  "#8BA888",
  "#A8A87C",
  "#A88C7C",
  "#8C7CA8",
  "#C9A96E",
];

interface SpeakerCardProps {
  speaker: SpeakerProfile;
  onClick: (speaker: SpeakerProfile) => void;
}

export function SpeakerCard({ speaker, onClick }: SpeakerCardProps) {
  const tierColor = TIER_COLORS[speaker.level] ?? "#C9A96E";
  const tierLabel = TIER_LABELS[speaker.level] ?? "Speaker";

  return (
    <div
      onClick={() => onClick(speaker)}
      className="group relative bg-white border border-warm-gray rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-[3px]"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 8px 32px rgba(201,169,110,0.18), 0 0 0 1px rgba(201,169,110,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
      }}
    >
      {/* Gold top border */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${tierColor}, transparent)`,
        }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            {speaker.profiles?.avatar_url ? (
              <Image
                src={speaker.profiles.avatar_url}
                alt={speaker.profiles.full_name}
                width={56}
                height={56}
                className="rounded-xl object-cover"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${tierColor}, #0A0A0F)` }}
              >
                {speaker.profiles?.full_name?.charAt(0) ?? "S"}
              </div>
            )}
            {/* Availability pulse */}
            {speaker.available && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="animate-[pulse-dot_2s_cubic-bezier(0.4,0,0.6,1)_infinite] absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-success border-2 border-white" />
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-cormorant text-base font-semibold text-ink leading-tight truncate">
              {speaker.profiles?.full_name ?? "Speaker"}
            </h3>
            <p className="text-xs text-mid-gray mt-0.5 line-clamp-2 leading-snug">
              {speaker.title}
            </p>
          </div>
        </div>

        {/* Tier badge */}
        <div className="mb-3">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: `${tierColor}20`, color: tierColor }}
          >
            {tierLabel}
          </span>
        </div>

        {/* Expertise chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {speaker.expertise.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[10px] font-medium bg-warm-gray text-charcoal rounded-full"
            >
              {tag}
            </span>
          ))}
          {speaker.expertise.length > 3 && (
            <span className="px-2 py-0.5 text-[10px] font-medium text-mid-gray">
              +{speaker.expertise.length - 3}
            </span>
          )}
        </div>

        {/* Location + format */}
        <div className="flex items-center gap-3 text-[10px] text-mid-gray mb-4">
          {speaker.location && (
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              {speaker.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            {speaker.virtual_available && <Globe size={10} />}
            {speaker.hybrid_available && <Monitor size={10} />}
            {speaker.virtual_available && "Virtual"}
            {speaker.virtual_available && speaker.hybrid_available && " · "}
            {speaker.hybrid_available && "Hybrid"}
          </span>
        </div>

        {/* Footer: fee + rating */}
        <div className="flex items-center justify-between pt-3 border-t border-warm-gray">
          <div>
            <p className="font-cormorant text-lg font-bold text-gold leading-none">
              {formatZAR(speaker.speaking_fee_zar)}
            </p>
            <p className="text-[9px] text-mid-gray">per event</p>
          </div>
          <div className="flex items-center gap-1">
            <Star size={12} className="text-gold fill-gold" />
            <span className="text-sm font-semibold text-charcoal">
              {speaker.avg_rating > 0 ? speaker.avg_rating.toFixed(1) : "—"}
            </span>
            {speaker.total_events > 0 && (
              <span className="text-[10px] text-mid-gray">({speaker.total_events})</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
