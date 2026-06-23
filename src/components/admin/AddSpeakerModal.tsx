"use client";

import { useState, useTransition } from "react";
import { X, Search, Check, Loader2, UserPlus } from "lucide-react";
import { adminSearchUsers, adminCreateSpeaker } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";

interface UserResult {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Props {
  onClose: () => void;
}

const EXPERTISE_OPTIONS = [
  "Leadership", "Innovation", "Entrepreneurship", "DEI & Inclusion",
  "Technology", "AI & Future of Work", "Finance", "Marketing",
  "Wellness", "Motivation", "Education", "Sustainability",
  "Politics", "Media", "Sports", "Entertainment",
];

const LANGUAGE_OPTIONS = ["English", "Zulu", "Xhosa", "Sotho", "Afrikaans", "Tswana", "Venda", "Tsonga"];

export function AddSpeakerModal({ onClose }: Props) {
  const [step, setStep] = useState<"search" | "profile">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [searching, startSearch] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [searchError, setSearchError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [fee, setFee] = useState("");
  const [location, setLocation] = useState("");
  const [level, setLevel] = useState("1");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [virtual, setVirtual] = useState(false);
  const [hybrid, setHybrid] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchError("");
    startSearch(async () => {
      const res = await adminSearchUsers(query);
      if (res.error) { setSearchError(res.error); return; }
      setResults(res.data ?? []);
    });
  }

  function selectUser(u: UserResult) {
    setSelectedUser(u);
    setStep("profile");
  }

  function toggleChip(value: string, list: string[], setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitError("");
    startSubmit(async () => {
      const res = await adminCreateSpeaker(selectedUser.id, {
        title,
        bio,
        speaking_fee_zar: Number(fee),
        expertise,
        languages,
        location,
        level: Number(level),
        available: true,
        virtual_available: virtual,
        hybrid_available: hybrid,
        tags: [],
      });
      if (res.error) { setSubmitError(res.error); return; }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[12px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line sticky top-0 bg-white rounded-t-[12px] z-10">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-secondary" />
            <h2 className="font-archivo font-bold text-primary">Add Speaker</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-[6px] hover:bg-soft transition-colors">
            <X size={16} className="text-muted" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === "search" ? "text-secondary" : "text-success"}`}>
            {step === "profile" ? <Check size={12} /> : <span className="w-4 h-4 rounded-full bg-secondary text-white flex items-center justify-center text-[10px]">1</span>}
            Select user
          </div>
          <div className="h-px w-6 bg-line" />
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === "profile" ? "text-secondary" : "text-muted"}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step === "profile" ? "bg-secondary text-white" : "bg-soft text-muted"}`}>2</span>
            Speaker profile
          </div>
        </div>

        {step === "search" && (
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-muted">Search for an existing user by name or email to create their speaker profile.</p>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                className="flex-1 px-3 py-2 border border-line rounded-[8px] text-sm text-ink placeholder-muted focus:outline-none focus:border-secondary transition-colors"
              />
              <Button type="submit" variant="gold" size="sm" disabled={searching} className="gap-1.5">
                {searching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                Search
              </Button>
            </form>
            {searchError && <p className="text-xs text-danger">{searchError}</p>}
            {results.length > 0 && (
              <div className="border border-line rounded-[8px] overflow-hidden divide-y divide-line">
                {results.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectUser(u)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-soft transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-secondary">{u.full_name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{u.full_name}</p>
                      <p className="text-xs text-muted truncate">{u.email} · {u.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!searching && query && results.length === 0 && (
              <p className="text-xs text-muted text-center py-4">No users found. Try a different search.</p>
            )}
          </div>
        )}

        {step === "profile" && selectedUser && (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-soft rounded-[8px]">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-secondary">{selectedUser.full_name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{selectedUser.full_name}</p>
                <p className="text-xs text-muted truncate">{selectedUser.email}</p>
              </div>
              <button type="button" onClick={() => setStep("search")} className="ml-auto text-xs text-secondary hover:underline">Change</button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Title / Tagline *</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Leadership Coach & Keynote Speaker"
                className="w-full px-3 py-2 border border-line rounded-[8px] text-sm text-ink placeholder-muted focus:outline-none focus:border-secondary transition-colors" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Bio</label>
              <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Brief professional bio…"
                className="w-full px-3 py-2 border border-line rounded-[8px] text-sm text-ink placeholder-muted focus:outline-none focus:border-secondary transition-colors resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Speaking Fee (ZAR) *</label>
                <input required type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="25000"
                  className="w-full px-3 py-2 border border-line rounded-[8px] text-sm text-ink placeholder-muted focus:outline-none focus:border-secondary transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Location</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Johannesburg"
                  className="w-full px-3 py-2 border border-line rounded-[8px] text-sm text-ink placeholder-muted focus:outline-none focus:border-secondary transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Level (1–5)</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-[8px] text-sm text-ink focus:outline-none focus:border-secondary transition-colors">
                {[["1", "Emerging Talent"], ["2", "Rising Professional"], ["3", "Established Expert"], ["4", "Industry Leader"], ["5", "Celebrity Speaker"]].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">Expertise</label>
              <div className="flex flex-wrap gap-1.5">
                {EXPERTISE_OPTIONS.map((opt) => (
                  <button key={opt} type="button" onClick={() => toggleChip(opt, expertise, setExpertise)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${expertise.includes(opt) ? "bg-secondary text-white" : "bg-soft text-ink hover:bg-secondary/20"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">Languages</label>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button key={opt} type="button" onClick={() => toggleChip(opt, languages, setLanguages)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${languages.includes(opt) ? "bg-secondary text-white" : "bg-soft text-ink hover:bg-secondary/20"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={virtual} onChange={(e) => setVirtual(e.target.checked)} className="accent-[#FF5700] rounded" />
                <span className="text-sm text-ink">Virtual</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hybrid} onChange={(e) => setHybrid(e.target.checked)} className="accent-[#FF5700] rounded" />
                <span className="text-sm text-ink">Hybrid</span>
              </label>
            </div>

            {submitError && <p className="text-xs text-danger">{submitError}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep("search")} className="flex-1">Back</Button>
              <Button type="submit" variant="gold" disabled={submitting} className="flex-1 gap-1.5">
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                Create Speaker
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
