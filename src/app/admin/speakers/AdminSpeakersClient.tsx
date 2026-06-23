"use client";

import { useState, useTransition } from "react";
import { Mic2, Plus, ToggleLeft, ToggleRight, Star, MapPin, Loader2 } from "lucide-react";
import Image from "next/image";
import { adminToggleSpeakerStatus } from "@/app/actions/admin";
import { AddSpeakerModal } from "@/components/admin/AddSpeakerModal";
import { Button } from "@/components/ui/Button";
import { formatZAR } from "@/lib/utils/currency";
import type { SpeakerProfile } from "@/lib/types/database";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-success/15 text-success border border-success/30",
  INACTIVE: "bg-muted/15 text-muted border border-muted/30",
  PENDING_REVIEW: "bg-accent/15 text-accent border border-accent/30",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  PENDING_REVIEW: "Pending Review",
};

const TIER_COLORS = ["", "#629DAB", "#629DAB", "#031E57", "#FF5700", "#6B44B2"];
const TIER_LABELS = ["", "Emerging Talent", "Rising Professional", "Established Expert", "Industry Leader", "Celebrity Speaker"];

interface Props {
  speakers: SpeakerProfile[];
}

function SpeakerAdminCard({ speaker }: { speaker: SpeakerProfile }) {
  const [pending, startTransition] = useTransition();
  const tierColor = TIER_COLORS[speaker.level] ?? "#629DAB";

  function toggle() {
    startTransition(async () => {
      await adminToggleSpeakerStatus(speaker.id, speaker.status !== "ACTIVE");
    });
  }

  return (
    <div className="bg-white border border-line rounded-[12px] overflow-hidden relative">
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${tierColor}, transparent)` }} />

      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0">
            {speaker.profiles?.avatar_url ? (
              <Image
                src={speaker.profiles.avatar_url}
                alt={speaker.profiles.full_name}
                width={48}
                height={48}
                className="rounded-[8px] object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-[8px] flex items-center justify-center text-lg font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${tierColor}, #031E57)` }}
              >
                {speaker.profiles?.full_name?.charAt(0) ?? "S"}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-archivo font-bold text-primary truncate">
                {speaker.profiles?.full_name ?? "Speaker"}
              </h3>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[speaker.status] ?? ""}`}>
                {STATUS_LABELS[speaker.status] ?? speaker.status}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5 line-clamp-1">{speaker.title}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: `${tierColor}20`, color: tierColor }}
          >
            {TIER_LABELS[speaker.level] ?? "Speaker"}
          </span>
          {speaker.expertise.slice(0, 2).map((tag) => (
            <span key={tag} className="px-2 py-0.5 text-[10px] font-medium bg-soft text-ink rounded-full">{tag}</span>
          ))}
          {speaker.expertise.length > 2 && (
            <span className="px-2 py-0.5 text-[10px] text-muted">+{speaker.expertise.length - 2}</span>
          )}
        </div>

        {speaker.location && (
          <div className="flex items-center gap-1 text-[10px] text-muted mb-3">
            <MapPin size={9} /> {speaker.location}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-line">
          <div>
            <p className="font-space-mono font-bold text-secondary leading-none">{formatZAR(speaker.speaking_fee_zar)}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Star size={10} className="text-accent fill-accent" />
              <span className="text-xs text-ink">
                {speaker.avg_rating > 0 ? speaker.avg_rating.toFixed(1) : "—"}
              </span>
              {speaker.total_events > 0 && (
                <span className="text-[10px] text-muted">({speaker.total_events} events)</span>
              )}
            </div>
          </div>

          <button
            onClick={toggle}
            disabled={pending}
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            style={{ color: speaker.status === "ACTIVE" ? "#DC2626" : "#629DAB" }}
          >
            {pending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : speaker.status === "ACTIVE" ? (
              <ToggleRight size={20} className="text-success" />
            ) : (
              <ToggleLeft size={20} className="text-muted" />
            )}
            {speaker.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminSpeakersClient({ speakers }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-3 text-xs font-semibold text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            {speakers.filter((s) => s.status === "ACTIVE").length} Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted/50 inline-block" />
            {speakers.filter((s) => s.status === "INACTIVE").length} Inactive
          </span>
          {speakers.some((s) => s.status === "PENDING_REVIEW") && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent inline-block" />
              {speakers.filter((s) => s.status === "PENDING_REVIEW").length} Pending
            </span>
          )}
        </div>
        <Button variant="gold" size="sm" onClick={() => setShowModal(true)} className="gap-1.5">
          <Plus size={14} /> Add Speaker
        </Button>
      </div>

      {speakers.length === 0 ? (
        <div className="bg-white border border-line rounded-[12px] py-20 text-center">
          <Mic2 size={36} className="text-line mx-auto mb-4" />
          <p className="font-archivo font-bold text-muted mb-2">No speakers yet</p>
          <p className="text-sm text-muted mb-6">Add the first speaker to get started.</p>
          <Button variant="gold" size="sm" onClick={() => setShowModal(true)} className="gap-1.5">
            <Plus size={14} /> Add Speaker
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
