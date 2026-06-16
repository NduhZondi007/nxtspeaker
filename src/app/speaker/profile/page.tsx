"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { updateSpeakerProfile, uploadAvatar } from "@/app/actions/speakers";
import type { SpeakerProfile, Profile } from "@/lib/types/database";

const EXPERTISE_OPTIONS = [
  "Leadership", "AI", "Digital Transformation", "Sustainability", "ESG",
  "Innovation", "Future of Work", "Neuroscience", "High Performance",
  "Strategy", "Entrepreneurship", "Change Management", "Finance",
  "Marketing", "Sales", "Technology", "Healthcare", "Education",
];

const LANGUAGE_OPTIONS = ["English", "Afrikaans", "Zulu", "Xhosa", "Sotho", "Tswana", "French", "Portuguese", "Swahili"];

export default function SpeakerProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sp, setSp] = useState<SpeakerProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("speaker_profiles").select("*, profiles(*)").eq("user_id", user.id).single(),
      ]);
      setProfile(p as Profile);
      setSp(s as SpeakerProfile);
    }
    load();
  }, [supabase]);

  async function handleSave() {
    if (!sp) return;
    setSaving(true);
    const result = await updateSpeakerProfile({
      title: sp.title,
      bio: sp.bio ?? "",
      expertise: sp.expertise,
      languages: sp.languages,
      location: sp.location ?? "",
      speaking_fee_zar: sp.speaking_fee_zar,
      level: sp.level,
      available: sp.available,
      virtual_available: sp.virtual_available,
      hybrid_available: sp.hybrid_available,
      tags: sp.tags,
    });
    if (result.error) error("Save failed", result.error);
    else success("Profile saved!", "Your profile has been updated.");
    setSaving(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadAvatar(file);
    if (result.error) error("Upload failed", result.error);
    else {
      success("Photo uploaded!");
      setProfile((prev) => prev ? { ...prev, avatar_url: result.url ?? null } : prev);
    }
    setUploading(false);
  }

  function toggleExpertise(tag: string) {
    if (!sp) return;
    const current = sp.expertise ?? [];
    setSp({
      ...sp,
      expertise: current.includes(tag) ? current.filter((e) => e !== tag) : [...current, tag],
    });
  }

  function toggleLanguage(lang: string) {
    if (!sp) return;
    const current = sp.languages ?? [];
    setSp({
      ...sp,
      languages: current.includes(lang) ? current.filter((l) => l !== lang) : [...current, lang],
    });
  }

  if (!sp) {
    return (
      <div>
        <TopBar title="My Profile" />
        <div className="p-6">
          <div className="h-96 bg-warm-gray rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="My Profile" subtitle="Manage your public speaker profile">
        <Button variant="gold" onClick={handleSave} loading={saving}>Save Changes</Button>
      </TopBar>

      <div className="p-4 sm:p-6 max-w-2xl space-y-6">
        {/* Avatar */}
        <div className="bg-white border border-warm-gray rounded-2xl p-5">
          <h2 className="font-cormorant text-lg font-semibold text-ink mb-4">Profile Photo</h2>
          <div className="flex items-center gap-5">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="Avatar" width={80} height={80} className="rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-warm-gray flex items-center justify-center text-2xl font-bold text-mid-gray">
                {profile?.full_name?.charAt(0) ?? "S"}
              </div>
            )}
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
                <Camera size={14} /> {uploading ? "Uploading..." : "Upload Photo"}
              </Button>
              <p className="text-xs text-mid-gray mt-1">JPG, PNG up to 5MB</p>
            </div>
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-white border border-warm-gray rounded-2xl p-5 space-y-4">
          <h2 className="font-cormorant text-lg font-semibold text-ink">Basic Information</h2>
          <Input
            label="Speaker Title / Tagline"
            placeholder="e.g. AI & Digital Transformation for African Enterprises"
            value={sp.title}
            onChange={(e) => setSp({ ...sp, title: e.target.value })}
          />
          <Textarea
            label="Biography"
            placeholder="Tell clients about your background, expertise, and what makes your presentations unique..."
            value={sp.bio ?? ""}
            onChange={(e) => setSp({ ...sp, bio: e.target.value })}
            className="min-h-[120px]"
          />
          <Input
            label="Location"
            placeholder="e.g. Johannesburg, South Africa"
            value={sp.location ?? ""}
            onChange={(e) => setSp({ ...sp, location: e.target.value })}
          />
          <Input
            type="number"
            label="Speaking Fee (ZAR)"
            placeholder="e.g. 85000"
            value={sp.speaking_fee_zar}
            onChange={(e) => setSp({ ...sp, speaking_fee_zar: Number(e.target.value) })}
          />
        </div>

        {/* Expertise */}
        <div className="bg-white border border-warm-gray rounded-2xl p-5">
          <h2 className="font-cormorant text-lg font-semibold text-ink mb-3">Expertise</h2>
          <div className="flex flex-wrap gap-2">
            {EXPERTISE_OPTIONS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleExpertise(tag)}
                className={[
                  "px-3 py-1.5 text-xs rounded-full border transition-colors",
                  sp.expertise?.includes(tag)
                    ? "bg-gold/15 border-gold text-gold-dark font-semibold"
                    : "border-warm-gray text-charcoal hover:border-gold",
                ].join(" ")}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="bg-white border border-warm-gray rounded-2xl p-5">
          <h2 className="font-cormorant text-lg font-semibold text-ink mb-3">Languages</h2>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang}
                onClick={() => toggleLanguage(lang)}
                className={[
                  "px-3 py-1.5 text-xs rounded-full border transition-colors",
                  sp.languages?.includes(lang)
                    ? "bg-gold/15 border-gold text-gold-dark font-semibold"
                    : "border-warm-gray text-charcoal hover:border-gold",
                ].join(" ")}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className="bg-white border border-warm-gray rounded-2xl p-5">
          <h2 className="font-cormorant text-lg font-semibold text-ink mb-3">Availability</h2>
          <div className="space-y-3">
            {[
              { label: "Available for bookings", key: "available" as const },
              { label: "Available for virtual events", key: "virtual_available" as const },
              { label: "Available for hybrid events", key: "hybrid_available" as const },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sp[opt.key]}
                  onChange={(e) => setSp({ ...sp, [opt.key]: e.target.checked })}
                  className="w-4 h-4 accent-gold"
                />
                <span className="text-sm text-charcoal">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pb-6">
          <Button variant="gold" size="lg" className="w-full" onClick={handleSave} loading={saving}>
            Save Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
