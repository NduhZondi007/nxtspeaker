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
  INACTIVE: "bg-mid-gray/15 text-mid-gray border border-mid-gray/30",
  PENDING_REVIEW: "bg-gold/15 text-gold border border-gold/30",
};

const TIER_COLORS = ["", "#8BA888", "#A8A87C", "#A88C7C", "#8C7CA8", "#C9A96E"];
const TIER_LABELS = ["", "Emerging Talent", "Rising Professional", "Established Expert", "Industry Leader", "Celebrity Speaker"];

interface Props {
  speakers: SpeakerProfile[];
}

function SpeakerAdminCard({ speaker }: { speaker: SpeakerProfile }) {
  const [pending, startTransition] = useTransition();
  const tierColor = TIER_COLORS[speaker.level] ?? "#C9A96E";

  function toggle() {
    startTransition(async () => {
      await adminToggleSpeakerStatus(speaker.id, speaker.status !== "ACTIVE");
    });
  }

  return (
    <div className="bg-white border border-warm-gray rounded-2xl overflow-hidden relative">
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
                className="rounded-xl object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${tierColor}, #0A0A0F)` }}
              >
                {speaker.profiles?.full_name?.charAt(0) ?? "S"}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-cormorant text-base font-semibold text-ink truncate">
                {speaker.profiles?.full_name ?? "Speaker"}
              </h3>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[speaker.status] ?? ""}`}>
                {speaker.status}
              </span>
            </div>
            <p className="text-xs text-mid-gray mt-0.5 line-clamp-1">{speaker.title}</p>
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
            <span key={tag} className="px-2 py-0.5 text-[10px] font-medium bg-warm-gray text-charcoal rounded-full">{tag}</span>
          ))}
          {speaker.expertise.length > 2 && (
            <span className="px-2 py-0.5 text-[10px] text-mid-gray">+{speaker.expertise.length - 2}</span>
          )}
        </div>

        {speaker.location && (
          <div className="flex items-center gap-1 text-[10px] text-mid-gray mb-3">
            <MapPin size={9} /> {speaker.location}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-warm-gray">
          <div>
            <p className="font-cormorant text-base font-bold text-gold leading-none">{formatZAR(speaker.speaking_fee_zar)}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Star size={10} className="text-gold fill-gold" />
              <span className="text-xs text-charcoal">
                {speaker.avg_rating > 0 ? speaker.avg_rating.toFixed(1) : "—"}
              </span>
              {speaker.total_events > 0 && (
                <span className="text-[10px] text-mid-gray">({speaker.total_events} events)</span>
              )}
            </div>
          </div>

          <button
            onClick={toggle}
            disabled={pending}
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            style={{ color: speaker.status === "ACTIVE" ? "#DC2626" : "#6B9E78" }}
          >
            {pending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : speaker.status === "ACTIVE" ? (
              <ToggleRight size={20} className="text-success" />
            ) : (
              <ToggleLeft size={20} className="text-mid-gray" />
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
        <div className="flex gap-3 text-xs font-semibold text-mid-gray">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            {speakers.filter((s) => s.status === "ACTIVE").length} Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-mid-gray/50 inline-block" />
            {speakers.filter((s) => s.status === "INACTIVE").length} Inactive
          </span>
          {speakers.some((s) => s.status === "PENDING_REVIEW") && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gold inline-block" />
              {speakers.filter((s) => s.status === "PENDING_REVIEW").length} Pending
            </span>
          )}
        </div>
        <Button variant="gold" size="sm" onClick={() => setShowModal(true)} className="gap-1.5">
          <Plus size={14} /> Add Speaker
        </Button>
      </div>

      {speakers.length === 0 ? (
        <div className="bg-white border border-warm-gray rounded-2xl py-20 text-center">
          <Mic2 size={36} className="text-warm-gray mx-auto mb-4" />
          <p className="font-cormorant text-xl text-mid-gray mb-2">No speakers yet</p>
          <p className="text-sm text-mid-gray mb-6">Add the first speaker to get started.</p>
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
