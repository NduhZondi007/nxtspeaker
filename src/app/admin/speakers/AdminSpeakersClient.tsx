"use client";

import { useState } from "react";
import { Mic2, Plus, ToggleLeft, ToggleRight, Star, MapPin } from "lucide-react";
import Image from "next/image";
import { adminToggleSpeakerStatus } from "@/app/actions/admin";
import { AddSpeakerModal } from "@/components/admin/AddSpeakerModal";
import { Button } from "@/components/ui/Button";
import { ActionButton } from "@/components/ui/ActionButton";
import { formatZAR } from "@/lib/utils/currency";
import type { SpeakerProfile } from "@/lib/types/database";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-success/15 text-success border border-success/30",
  INACTIVE: "bg-muted/15 text-muted border border-muted/30",
  // Not orange: a status label is not an action. See docs/DESIGN.md.
  PENDING_REVIEW: "bg-secondary/15 text-secondary border border-secondary/30",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  PENDING_REVIEW: "Pending Review",
};

/** Tier chip and top-rule styling from the palette tokens — no orange, no off-palette purple. */
const TIER_STYLES: { chip: string; rule: string }[] = [
  { chip: "bg-secondary/15 text-secondary", rule: "bg-secondary" },
  { chip: "bg-secondary/15 text-secondary", rule: "bg-secondary" },
  { chip: "bg-secondary/15 text-secondary", rule: "bg-secondary" },
  { chip: "bg-primary/10 text-primary", rule: "bg-primary" },
  { chip: "bg-primary/10 text-primary", rule: "bg-primary" },
  { chip: "bg-support text-primary", rule: "bg-primary" },
];
const TIER_LABELS = ["", "Emerging Talent", "Rising Professional", "Established Expert", "Industry Leader", "Celebrity Speaker"];

interface StatusCounts {
  active: number;
  inactive: number;
  pendingReview: number;
}

interface Props {
  speakers: SpeakerProfile[];
  /** Across all pages, not just the speakers on this one. */
  counts: StatusCounts;
}

interface SpeakerAdminCardProps {
  speaker: SpeakerProfile;
}

function SpeakerAdminCard({ speaker }: SpeakerAdminCardProps) {
  const tier = TIER_STYLES[speaker.level] ?? TIER_STYLES[1];
  const isActive = speaker.status === "ACTIVE";
  const name = speaker.profiles?.full_name ?? "Speaker";

  return (
    <div className="bg-white border border-line rounded-[8px] overflow-hidden relative">
      <div className={`h-0.5 w-full ${tier.rule}`} />

      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0">
            {speaker.profiles?.avatar_url ? (
              <Image
                src={speaker.profiles.avatar_url}
                alt={name}
                width={48}
                height={48}
                className="rounded-[8px] object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-[8px] flex items-center justify-center text-lg font-bold text-white bg-primary"
                aria-hidden="true"
              >
                {name.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-archivo font-bold text-primary truncate">{name}</h3>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[speaker.status] ?? ""}`}>
                {STATUS_LABELS[speaker.status] ?? speaker.status}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5 line-clamp-1">{speaker.title}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${tier.chip}`}>
            {TIER_LABELS[speaker.level] ?? "Speaker"}
          </span>
          {(speaker.expertise ?? []).slice(0, 2).map((tag) => (
            <span key={tag} className="px-2 py-0.5 text-[10px] font-medium bg-soft text-ink rounded-full">{tag}</span>
          ))}
          {(speaker.expertise ?? []).length > 2 && (
            <span className="px-2 py-0.5 text-[10px] text-muted">+{speaker.expertise.length - 2}</span>
          )}
        </div>

        {speaker.location && (
          <div className="flex items-center gap-1 text-[10px] text-muted mb-3">
            <MapPin size={9} aria-hidden="true" /> {speaker.location}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-line">
          <div>
            <p className="font-space-mono font-bold text-secondary leading-none">{formatZAR(speaker.speaking_fee_zar)}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Star size={10} className="text-secondary fill-secondary" aria-hidden="true" />
              <span className="text-xs text-ink">
                {speaker.avg_rating > 0 ? Number(speaker.avg_rating).toFixed(1) : "—"}
              </span>
              {speaker.total_events > 0 && (
                <span className="text-[10px] text-muted">({speaker.total_events} events)</span>
              )}
            </div>
          </div>

          <ActionButton
            action={adminToggleSpeakerStatus.bind(null, speaker.id, !isActive)}
            variant="ghost"
            className={isActive ? "text-danger" : "text-secondary"}
            aria-label={`${isActive ? "Deactivate" : "Activate"} ${name}`}
            confirm={
              isActive
                ? { message: `Hide ${name} from clients?`, confirmLabel: "Yes, deactivate" }
                : undefined
            }
          >
            {isActive ? (
              <ToggleRight size={20} className="text-success" aria-hidden="true" />
            ) : (
              <ToggleLeft size={20} className="text-muted" aria-hidden="true" />
            )}
            {isActive ? "Deactivate" : "Activate"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export function AdminSpeakersClient({ speakers, counts }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-3 text-xs font-semibold text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success inline-block" aria-hidden="true" />
            {counts.active} Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted/50 inline-block" aria-hidden="true" />
            {counts.inactive} Inactive
          </span>
          {counts.pendingReview > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary inline-block" aria-hidden="true" />
              {counts.pendingReview} Pending
            </span>
          )}
        </div>
        <Button variant="gold" size="sm" onClick={() => setShowModal(true)} className="gap-1.5">
          <Plus size={14} aria-hidden="true" /> Add Speaker
        </Button>
      </div>

      {speakers.length === 0 ? (
        <div className="bg-white border border-line rounded-[8px] py-20 text-center">
          <Mic2 size={36} className="text-line mx-auto mb-4" aria-hidden="true" />
          <p className="font-archivo font-bold text-muted mb-2">No speakers yet</p>
          <p className="text-sm text-muted mb-6">Add the first speaker to get started.</p>
          <Button variant="outline" size="sm" onClick={() => setShowModal(true)} className="gap-1.5">
            <Plus size={14} aria-hidden="true" /> Add Speaker
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {speakers.map((s) => (
            <SpeakerAdminCard key={s.id} speaker={s} />
          ))}
        </div>
      )}

      {showModal && <AddSpeakerModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
