"use client";

import { useId, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { updateRider } from "@/app/actions/speakers";
import type { AccommodationStandard, MealTiming } from "@/lib/types/database";
import type { RiderPreferences } from "./defaults";

const DIETARY_OPTIONS = ["vegetarian", "vegan", "halal", "kosher", "gluten-free"];

interface RiderFormProps {
  initialRider: RiderPreferences;
  /** No rider row exists yet; the first save creates it. */
  isNew: boolean;
}

export function RiderForm({ initialRider, isNew }: RiderFormProps) {
  const [rider, setRider] = useState<RiderPreferences>(initialRider);
  const [saved, setSaved] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();
  const id = useId();

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateRider(rider);
      if (result.error) {
        error("Save failed", result.error);
      } else {
        setSaved(true);
        success("Rider saved!", "Your hospitality requirements have been updated.");
      }
    } catch {
      error("Save failed", "Something went wrong — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <TopBar title="Hospitality Rider" subtitle="Set your requirements for event organisers">
        <Button variant="gold" onClick={handleSave} loading={saving}>Save Rider</Button>
      </TopBar>

      <div className="p-4 sm:p-6 max-w-2xl space-y-5">
        {!saved && (
          <div role="status" className="bg-support/40 border border-support rounded-[12px] p-4">
            <p className="text-sm font-semibold text-primary">You haven&apos;t set up your rider yet</p>
            <p className="text-xs text-ink mt-1">
              We&apos;ve filled in common defaults. Adjust them and save so organisers see your requirements.
            </p>
          </div>
        )}

        {/* Water */}
        <Section title="Water & Beverages">
          <CheckRow label="Still water"            checked={rider.water_still}     onChange={(v) => setRider({ ...rider, water_still: v })} />
          <CheckRow label="Sparkling water"        checked={rider.water_sparkling} onChange={(v) => setRider({ ...rider, water_sparkling: v })} />
          <CheckRow label="Room temperature water" checked={rider.water_room_temp} onChange={(v) => setRider({ ...rider, water_room_temp: v })} />
        </Section>

        {/* Catering */}
        <Section title="Catering & Dietary">
          <CheckRow label="Meal required" checked={rider.meal_required} onChange={(v) => setRider({ ...rider, meal_required: v })} />
          <div>
            <label htmlFor={`${id}-meal-timing`} className="text-xs font-space-mono font-semibold text-muted uppercase tracking-wide block mb-1.5">Meal timing</label>
            <select
              id={`${id}-meal-timing`}
              value={rider.meal_timing}
              onChange={(e) => setRider({ ...rider, meal_timing: e.target.value as MealTiming })}
              className="px-3 py-2 text-sm border border-line rounded-[6px] bg-white text-ink focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
            >
              <option value="before">Before the event</option>
              <option value="after">After the event</option>
              <option value="no preference">No preference</option>
            </select>
          </div>
          <fieldset>
            <legend className="text-xs font-space-mono font-semibold text-muted uppercase tracking-wide block mb-1.5">Dietary restrictions</legend>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((d) => (
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
                    className="accent-accent"
                  />
                  <span className="text-sm text-ink capitalize">{d}</span>
                </label>
              ))}
            </div>
          </fieldset>
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
          <CheckRow label="Confidence monitor"   checked={rider.confidence_monitor}   onChange={(v) => setRider({ ...rider, confidence_monitor: v })} />
          <Textarea
            label="AV requirements"
            placeholder="e.g. Full HD projector 5000 lumens, dual screens, HDMI..."
            value={rider.av_requirements ?? ""}
            onChange={(e) => setRider({ ...rider, av_requirements: e.target.value })}
          />
        </Section>

        {/* Travel */}
        <Section title="Travel & Accommodation">
          <CheckRow label="Flights required"       checked={rider.flights_required}       onChange={(v) => setRider({ ...rider, flights_required: v })} />
          <CheckRow label="Accommodation required" checked={rider.accommodation_required} onChange={(v) => setRider({ ...rider, accommodation_required: v })} />
          {rider.accommodation_required && (
            <div>
              <label htmlFor={`${id}-accommodation`} className="text-xs font-space-mono font-semibold text-muted uppercase tracking-wide block mb-1.5">Accommodation standard</label>
              <select
                id={`${id}-accommodation`}
                value={rider.accommodation_standard}
                onChange={(e) => setRider({ ...rider, accommodation_standard: e.target.value as AccommodationStandard })}
                className="px-3 py-2 text-sm border border-line rounded-[6px] bg-white text-ink focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
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
            aria-label="Additional requests"
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
    <div className="bg-white border border-line rounded-[12px] p-5">
      <h2 className="font-archivo font-bold text-primary mb-4">{title}</h2>
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
        className="w-4 h-4 accent-accent"
      />
      <span className="text-sm text-ink">{label}</span>
    </label>
  );
}
