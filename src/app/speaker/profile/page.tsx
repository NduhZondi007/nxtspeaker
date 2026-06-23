"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import { Camera, XCircle, X, Loader2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { updateSpeakerProfile, saveAvatarUrl, saveSpeakerPhotoUrl, removeSpeakerPhoto } from "@/app/actions/speakers";
import { getEmbedUrl } from "@/lib/utils/media";
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
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhotoUrl, setRemovingPhotoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
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
      setVideoUrl((s as SpeakerProfile)?.profile_video_url ?? "");
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
      profile_video_url: videoUrl.trim() || null,
    });
    if (result.error) error("Save failed", result.error);
    else success("Profile saved!", "Your profile has been updated.");
    setSaving(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = "";

    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      error("Upload failed", "Only JPG, PNG, WebP, or GIF images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error("Upload failed", "Image must be under 5 MB");
      return;
    }

    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { error("Upload failed", "Not authenticated"); setUploading(false); return; }

    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("speaker-avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      error("Upload failed", uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("speaker-avatars").getPublicUrl(path);
    const urlWithBust = `${urlData.publicUrl}?t=${Date.now()}`;

    const result = await saveAvatarUrl(urlWithBust);
    if (result.error) error("Save failed", result.error);
    else {
      success("Profile photo updated!");
      setProfile((prev) => prev ? { ...prev, avatar_url: urlWithBust } : prev);
    }
    setUploading(false);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || !sp) return;
    e.target.value = "";

    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { error("Upload failed", "Not authenticated"); return; }

    setUploadingPhoto(true);

    let currentUrls = [...(sp.photo_urls ?? [])];
    let uploaded = 0;
    let firstError: string | null = null;

    for (const file of files) {
      if (currentUrls.length >= 5) {
        if (!firstError) firstError = `Maximum 5 photos reached — ${files.length - uploaded} file(s) skipped.`;
        break;
      }
      if (!ALLOWED.includes(file.type)) {
        if (!firstError) firstError = "Only JPG, PNG, WebP, or GIF images are allowed";
        continue;
      }
      if (file.size > 3 * 1024 * 1024) {
        if (!firstError) firstError = "Each photo must be under 3 MB";
        continue;
      }

      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("speaker-photos")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (uploadError) {
        if (!firstError) firstError = uploadError.message;
        continue;
      }

      const { data: urlData } = supabase.storage.from("speaker-photos").getPublicUrl(path);
      const result = await saveSpeakerPhotoUrl(urlData.publicUrl);

      if (result.error) {
        // Roll back the storage upload if DB save failed
        await supabase.storage.from("speaker-photos").remove([path]);
        if (!firstError) firstError = result.error;
      } else if (result.url) {
        currentUrls = [...currentUrls, result.url];
        uploaded++;
      }
    }

    setSp({ ...sp, photo_urls: currentUrls });
    if (firstError) error("Upload issue", firstError);
    if (uploaded > 0) success(uploaded === 1 ? "Photo added!" : `${uploaded} photos added!`);
    setUploadingPhoto(false);
  }

  async function handleRemovePhoto(photoUrl: string) {
    if (!sp) return;
    setRemovingPhotoUrl(photoUrl);
    const result = await removeSpeakerPhoto(photoUrl);
    if (result.error) error("Remove failed", result.error);
    else {
      setSp({ ...sp, photo_urls: (sp.photo_urls ?? []).filter((u) => u !== photoUrl) });
      success("Photo removed");
    }
    setRemovingPhotoUrl(null);
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
        {/* Visibility status banner — only shown when not the normal active state */}
        {sp.status === "INACTIVE" && (
          <div className="flex items-start gap-3 bg-mid-gray/10 border border-mid-gray/30 rounded-2xl p-4">
            <XCircle size={18} className="text-mid-gray shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-mid-gray">Your profile has been deactivated</p>
              <p className="text-xs text-charcoal mt-0.5">
                Clients cannot see your profile. Contact support if you believe this is an error.
              </p>
            </div>
          </div>
        )}

        {/* Avatar */}
        <div className="bg-white border border-warm-gray rounded-2xl p-5">
          <h2 className="font-cormorant text-lg font-semibold text-ink mb-4">Profile Photo</h2>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="relative group shrink-0"
              title="Click to change photo"
            >
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="Avatar" width={80} height={80} className="rounded-2xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-warm-gray flex items-center justify-center text-2xl font-bold text-mid-gray">
                  {profile?.full_name?.charAt(0) ?? "S"}
                </div>
              )}
              <div className="absolute inset-0 rounded-2xl bg-ink/50 flex items-center justify-center opacity-0 group-hover:opacity-100 group-disabled:opacity-100 transition-opacity">
                {uploading
                  ? <Loader2 size={20} className="text-white animate-spin" />
                  : <Camera size={20} className="text-white" />}
              </div>
            </button>
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

        {/* Introduction Video */}
        <div className="bg-white border border-warm-gray rounded-2xl p-5 space-y-3">
          <h2 className="font-cormorant text-lg font-semibold text-ink">Introduction Video</h2>
          <p className="text-xs text-mid-gray">
            Paste a YouTube or Vimeo URL. Shown to clients so they can see you in action before booking.
          </p>
          <Input
            label="Video URL"
            placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
          {videoUrl && getEmbedUrl(videoUrl) && (
            <div className="aspect-video rounded-xl overflow-hidden bg-warm-gray">
              <iframe
                src={getEmbedUrl(videoUrl)!}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video preview"
              />
            </div>
          )}
        </div>

        {/* Portfolio Photos */}
        <div className="bg-white border border-warm-gray rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-cormorant text-lg font-semibold text-ink">Portfolio Photos</h2>
            <span className="text-xs text-mid-gray">{(sp.photo_urls ?? []).length} / 5</span>
          </div>
          <p className="text-xs text-mid-gray">
            On-stage shots, event photos, or headshots. JPG, PNG up to 3 MB each.
          </p>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoUpload}
          />

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {(sp.photo_urls ?? []).map((url) => (
              <div key={url} className="relative aspect-square">
                <Image src={url} alt="Portfolio photo" fill className="rounded-xl object-cover" />
                {removingPhotoUrl === url ? (
                  <div className="absolute inset-0 bg-ink/50 rounded-xl flex items-center justify-center">
                    <Loader2 size={16} className="text-white animate-spin" />
                  </div>
                ) : (
                  <button
                    onClick={() => handleRemovePhoto(url)}
                    className="absolute top-1 right-1 w-5 h-5 bg-ink/70 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="Remove photo"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
            {(sp.photo_urls ?? []).length < 5 && (
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto || !!removingPhotoUrl}
                className="aspect-square rounded-xl border-2 border-dashed border-warm-gray flex flex-col items-center justify-center gap-1 text-mid-gray hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Camera size={18} />
                    <span className="text-[10px]">Add photo</span>
                  </>
                )}
              </button>
            )}
          </div>
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
