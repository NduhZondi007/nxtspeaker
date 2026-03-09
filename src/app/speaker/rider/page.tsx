"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { updateRider } from "@/app/actions/speakers";
import type { HospitalityRider, AccommodationStandard, MealTiming } from "@/lib/types/database";

export default function SpeakerRiderPage() {
  const [rider, setRider] = useState<HospitalityRider | null>(null);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: sp } = await supabase.from("speaker_profiles").select("id").eq("user_id", user.id).single();
      if (!sp) return;
      const { data: r } = await supabase.from("hospitality_riders").select("*").eq("speaker_id", sp.id).single();
      setRider(r as HospitalityRider);
    }
    load();
  }, []);

  async function handleSave() {
    if (!rider) return;
    setSaving(true);
    const result = await updateRider(rider);
    if (result.error) error("Save failed", result.error);
    else success("Rider saved!", "Your hospitality requirements have been updated.");
    setSaving(false);
  }

  if (!rider) {
    return (
      <div>
        <TopBar title="Hospitality Rider" />
        <div className="p-6">
          <div className="h-96 bg-warm-gray rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Hospitality Rider" subtitle="Set your requirements for event organisers">
        <Button variant="gold" onClick={handleSave} loading={saving}>Save Rider</Button>
      </TopBar>

      <div className="p-6 max-w-2xl space-y-5">
        {/* Water */}
        <Section title="Water & Beverages">
          <CheckRow label="Still water" checked={rider.water_still} onChange={(v) => setRider({ ...rider, water_still: v })} />
          <CheckRow label="Sparkling water" checked={rider.water_sparkling} onChange={(v) => setRider({ ...rider, water_sparkling: v })} />
          <CheckRow label="Room temperature water" checked={rider.water_room_temp} onChange={(v) => setRider({ ...rider, water_room_temp: v })} />
        </Section>

        {/* Catering */}
        <Section title="Catering & Dietary">
          <CheckRow label="Meal required" checked={rider.meal_required} onChange={(v) => setRider({ ...rider, meal_required: v })} />
          <div>
            <label className="text-xs font-semibold text-charcoal uppercase tracking-wide block mb-1.5">Meal timing</label>
            <select
              value={rider.meal_timing}
              onChange={(e) => setRider({ ...rider, meal_timing: e.target.value as MealTiming })}
              className="px-3 py-2 text-sm border border-warm-gray rounded-lg bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold"
            >
              <option value="before">Before the event</option>
              <option value="after">After the event</option>
              <option value="no preference">No preference</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal uppercase tracking-wide block mb-1.5">Dietary restrictions</label>
            <div className="flex flex-wrap gap-2">
              {["vegetarian", "vegan", "halal", "kosher", "gluten-free"].map((d) => (
                <label key={d} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rider.dietary_restrictions?.includes(d) ?? false}
                    onChange={(e) => {
                      const current = rider.dietary_restrictions ?? [];
                      setRider({
                        ...rider,
                        dietary_restrictions: e.target.checked
                          ? [...current, d]
                          : current.filter((r) => r !== d),
                      });
                    }}
                    className="accent-gold"
                  />
                  <span className="text-sm text-charcoal capitalize">{d}</span>
                </label>
              ))}
            </div>
          </div>
          <Textarea
            label="Dietary notes"
            placeholder="Any specific dietary requirements or allergies..."
            value={rider.dietary_notes ?? ""}
            onChange={(e) => setRider({ ...rider, dietary_notes: e.target.value })}
          />
        </Section>

        {/* Green Room */}
        <Section title="Green Room">
          <CheckRow label="Green room required" checked={rider.green_room_required} onChange={(v) => setRider({ ...rider, green_room_required: v })} />
          <Textarea
            label="Green room notes"
            placeholder="e.g. Quiet space 30 minutes before, no visitors..."
            value={rider.green_room_notes ?? ""}
            onChange={(e) => setRider({ ...rider, green_room_notes: e.target.value })}
          />
        </Section>

        {/* Technical */}
        <Section title="Technical Requirements">
          <CheckRow label="Presentation clicker" checked={rider.presentation_clicker} onChange={(v) => setRider({ ...rider, presentation_clicker: v })} />
          <CheckRow label="Confidence monitor" checked={rider.confidence_monitor} onChange={(v) => setRider({ ...rider, confidence_monitor: v })} />
          <Textarea
            label="AV requirements"
            placeholder="e.g. Full HD projector 5000 lumens, dual screens, HDMI..."
            value={rider.av_requirements ?? ""}
            onChange={(e) => setRider({ ...rider, av_requirements: e.target.value })}
          />
        </Section>

        {/* Travel */}
        <Section title="Travel & Accommodation">
          <CheckRow label="Flights required" checked={rider.flights_required} onChange={(v) => setRider({ ...rider, flights_required: v })} />
          <CheckRow label="Accommodation required" checked={rider.accommodation_required} onChange={(v) => setRider({ ...rider, accommodation_required: v })} />
          {rider.accommodation_required && (
            <div>
              <label className="text-xs font-semibold text-charcoal uppercase tracking-wide block mb-1.5">Accommodation standard</label>
              <select
                value={rider.accommodation_standard}
                onChange={(e) => setRider({ ...rider, accommodation_standard: e.target.value as AccommodationStandard })}
                className="px-3 py-2 text-sm border border-warm-gray rounded-lg bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold"
              >
                <option value="three_star">3-Star Hotel</option>
                <option value="four_star">4-Star Hotel</option>
                <option value="five_star">5-Star Hotel</option>
              </select>
            </div>
          )}
        </Section>

        {/* Additional */}
        <Section title="Additional Requests">
          <Textarea
            placeholder="Any other requirements not covered above..."
            value={rider.additional_requests ?? ""}
            onChange={(e) => setRider({ ...rider, additional_requests: e.target.value })}
          />
        </Section>

        <div className="pb-6">
          <Button variant="gold" size="lg" className="w-full" onClick={handleSave} loading={saving}>
            Save Hospitality Rider
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-warm-gray rounded-2xl p-5">
      <h2 className="font-cormorant text-lg font-semibold text-ink mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-gold"
      />
      <span className="text-sm text-charcoal">{label}</span>
    </label>
  );
}
