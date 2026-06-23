import { Droplets, Utensils, Home, Monitor, Plane } from "lucide-react";
import type { HospitalityRider } from "@/lib/types/database";

const ACCOMMODATION_LABELS = {
  three_star: "3-Star Hotel",
  four_star: "4-Star Hotel",
  five_star: "5-Star Hotel",
};

interface HospitalityRiderViewProps {
  rider: HospitalityRider;
  speakerName?: string;
  clientName?: string;
  companyName?: string;
  eventName?: string;
  agreed?: boolean;
  onAgree?: (agreed: boolean) => void;
  showAgreement?: boolean;
}

export function HospitalityRiderView({
  rider,
  speakerName,
  clientName,
  companyName,
  eventName,
  agreed = false,
  onAgree,
  showAgreement = false,
}: HospitalityRiderViewProps) {
  return (
    <div className="space-y-4">
      <div className="bg-secondary/5 border border-secondary/20 rounded-[8px] p-4 mb-4">
        <h3 className="font-archivo font-bold text-primary mb-1">
          Hospitality Rider
        </h3>
        {speakerName && (
          <p className="text-sm text-muted">
            Requirements for <span className="font-semibold text-ink">{speakerName}</span>
          </p>
        )}
      </div>

      <Section icon={Droplets} title="Water & Beverages">
        <div className="space-y-1.5">
          <CheckItem label="Still water" checked={rider.water_still} />
          <CheckItem label="Sparkling water" checked={rider.water_sparkling} />
          <CheckItem label="Room temperature water" checked={rider.water_room_temp} />
          {rider.dietary_notes && (
            <Note label="Notes" value={rider.dietary_notes} />
          )}
        </div>
      </Section>

      <Section icon={Utensils} title="Catering & Dietary">
        <div className="space-y-1.5">
          <CheckItem label="Meal required" checked={rider.meal_required} />
          {rider.meal_required && rider.meal_timing && rider.meal_timing !== "no preference" && (
            <Note label="Meal timing" value={`${rider.meal_timing.charAt(0).toUpperCase()}${rider.meal_timing.slice(1)} the event`} />
          )}
          {rider.dietary_restrictions && rider.dietary_restrictions.length > 0 && (
            <div>
              <p className="text-xs text-muted mb-1">Dietary requirements:</p>
              <div className="flex flex-wrap gap-1.5">
                {rider.dietary_restrictions.map((r) => (
                  <span key={r} className="px-2 py-0.5 text-xs bg-secondary/10 text-secondary border border-secondary/20 rounded-full capitalize">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section icon={Home} title="Green Room">
        <div className="space-y-1.5">
          <CheckItem label="Green room required" checked={rider.green_room_required} />
          {rider.green_room_notes && <Note label="Notes" value={rider.green_room_notes} />}
        </div>
      </Section>

      <Section icon={Monitor} title="Technical Requirements">
        <div className="space-y-1.5">
          <CheckItem label="Presentation clicker" checked={rider.presentation_clicker} />
          <CheckItem label="Confidence monitor" checked={rider.confidence_monitor} />
          {rider.av_requirements && <Note label="AV requirements" value={rider.av_requirements} />}
        </div>
      </Section>

      <Section icon={Plane} title="Travel & Accommodation">
        <div className="space-y-1.5">
          <CheckItem label="Flights required" checked={rider.flights_required} />
          <CheckItem label="Accommodation required" checked={rider.accommodation_required} />
          {rider.accommodation_required && (
            <Note label="Accommodation standard" value={ACCOMMODATION_LABELS[rider.accommodation_standard]} />
          )}
        </div>
      </Section>

      {rider.additional_requests && (
        <Section icon={Droplets} title="Additional Requests">
          <p className="text-sm text-ink leading-relaxed">{rider.additional_requests}</p>
        </Section>
      )}

      {showAgreement && onAgree && (
        <div className="mt-6 border border-secondary/30 rounded-[8px] p-4 bg-secondary/5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => onAgree(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#FF5700] cursor-pointer"
            />
            <span className="text-sm text-ink leading-relaxed">
              I, <strong>{clientName ?? "the client"}</strong> representing{" "}
              <strong>{companyName ?? "the company"}</strong>, confirm that I will provide all
              items listed in this Hospitality Rider for{" "}
              <strong>{speakerName ?? "the speaker"}</strong>&apos;s appearance at{" "}
              <strong>{eventName ?? "the event"}</strong>.
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Droplets;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-line rounded-[8px] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-secondary" />
        <h4 className="text-xs font-semibold text-ink uppercase tracking-wide">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${checked ? "bg-success/20 text-success" : "bg-soft text-muted"}`}>
        {checked ? "✓" : "–"}
      </span>
      <span className={`text-sm ${checked ? "text-ink" : "text-muted line-through"}`}>{label}</span>
    </div>
  );
}

function Note({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1">
      <span className="text-[10px] text-muted uppercase tracking-wide">{label}: </span>
      <span className="text-xs text-ink">{value}</span>
    </div>
  );
}
