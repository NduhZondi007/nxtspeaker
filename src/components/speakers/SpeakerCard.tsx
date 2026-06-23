"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import { formatZAR } from "@/lib/utils/currency";
import type { SpeakerProfile } from "@/lib/types/database";

interface SpeakerCardProps {
  speaker: SpeakerProfile;
  onClick: (speaker: SpeakerProfile) => void;
}

export function SpeakerCard({ speaker, onClick }: SpeakerCardProps) {
  const primaryCategory = speaker.expertise[0] ?? "Speaker";
  const name = speaker.profiles?.full_name ?? "Speaker";

  return (
    <div
      onClick={() => onClick(speaker)}
      className="group relative bg-white border border-line rounded-[8px] overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-[3px]"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 8px 32px rgba(98,157,171,0.20), 0 0 0 1px rgba(98,157,171,0.25)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
      }}
    >
      {/* Speaker image */}
      <div className="relative w-full aspect-[4/3] bg-soft overflow-hidden">
        {speaker.profiles?.avatar_url ? (
          <Image
            src={speaker.profiles.avatar_url}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <span className="text-5xl font-archivo font-black text-primary/20 uppercase">
              {name.charAt(0)}
            </span>
          </div>
        )}

        {/* Availability dot */}
        {speaker.available && (
          <span className="absolute top-3 right-3 flex h-3.5 w-3.5">
            <span className="animate-[pulse-dot_2s_cubic-bezier(0.4,0,0.6,1)_infinite] absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-success border-2 border-white" />
          </span>
        )}

        {/* Location overlay */}
        {speaker.location && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/40 rounded-full backdrop-blur-sm">
            <MapPin size={9} className="text-white/80" />
            <span className="text-[9px] text-white/90 font-space-mono">{speaker.location}</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        {/* Category chip */}
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-space-mono uppercase tracking-widest bg-support text-primary">
          {primaryCategory}
        </span>

        {/* Name */}
        <h3 className="font-archivo font-black text-primary text-lg uppercase tracking-tight leading-tight line-clamp-1">
          {name}
        </h3>

        {/* Title / topic */}
        <p className="text-sm text-ink leading-snug line-clamp-1">
          {speaker.title}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-line">
          <div>
            <p className="font-space-mono text-base font-bold text-secondary leading-none">
              {formatZAR(speaker.speaking_fee_zar)}
            </p>
            <p className="text-[9px] text-muted font-space-mono mt-0.5">per event</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(speaker); }}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent-hover rounded-[3px] transition-colors"
          >
            Book
          </button>
        </div>
      </div>
    </div>
  );
}
