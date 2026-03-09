"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { HospitalityRiderView } from "@/components/bookings/HospitalityRiderView";
import { formatZAR } from "@/lib/utils/currency";
import type { SpeakerProfile, HospitalityRider, Profile, EventFormat } from "@/lib/types/database";

interface BookingFormProps {
  speaker: SpeakerProfile;
  rider: HospitalityRider | null;
  clientProfile: Profile;
  onSubmit: (data: BookingFormData) => Promise<void>;
  onCancel: () => void;
}

export interface BookingFormData {
  event_name: string;
  audience_demographics: string;
  exact_location: string;
  event_organiser: string;
  associated_company: string;
  event_date: string;
  event_end_date: string;
  duration_minutes: number;
  event_format: EventFormat;
  estimated_audience: number | undefined;
  client_notes: string;
  hospitality_rider_agreed: boolean;
}

const STEPS = [
  { label: "Event Details" },
  { label: "Demographics" },
  { label: "Hospitality" },
  { label: "Confirm" },
];

const INITIAL: BookingFormData = {
  event_name: "",
  audience_demographics: "",
  exact_location: "",
  event_organiser: "",
  associated_company: "",
  event_date: "",
  event_end_date: "",
  duration_minutes: 60,
  event_format: "in-person",
  estimated_audience: undefined,
  client_notes: "",
  hospitality_rider_agreed: false,
};

export function BookingForm({ speaker, rider, clientProfile, onSubmit, onCancel }: BookingFormProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<BookingFormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const speakerName = speaker.profiles?.full_name ?? "Speaker";

  function update(patch: Partial<BookingFormData>) {
    setData((prev) => ({ ...prev, ...patch }));
    setErrors({});
  }

  function validateStep1(): boolean {
    const e: typeof errors = {};
    if (!data.event_name.trim()) e.event_name = "Event name is required";
    if (!data.exact_location.trim()) e.exact_location = "Location is required";
    if (!data.event_date) e.event_date = "Event date is required";
    if (!data.event_organiser.trim()) e.event_organiser = "Event organiser is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: typeof errors = {};
    if (!data.audience_demographics.trim()) e.audience_demographics = "Audience demographics are required";
    if (!data.associated_company.trim()) e.associated_company = "Associated company is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep3(): boolean {
    if (!data.hospitality_rider_agreed) {
      setErrors({ hospitality_rider_agreed: "You must agree to the Hospitality Rider to proceed" });
      return false;
    }
    return true;
  }

  function nextStep() {
    if (step === 0 && !validateStep1()) return;
    if (step === 1 && !validateStep2()) return;
    if (step === 2 && !validateStep3()) return;
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl w-full">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  i < step
                    ? "bg-gold text-ink"
                    : i === step
                    ? "bg-ink text-gold border-2 border-gold"
                    : "bg-warm-gray text-mid-gray",
                ].join(" ")}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <p className={`text-[10px] mt-1 font-medium ${i === step ? "text-gold" : "text-mid-gray"}`}>
                {s.label}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 mb-4 transition-all ${i < step ? "bg-gold" : "bg-warm-gray"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Event Details */}
      {step === 0 && (
        <div className="space-y-4 animate-[slide-up_0.2s_ease-out]">
          <h3 className="font-cormorant text-xl text-ink font-semibold">Event Details</h3>
          <Input
            label="Event Name *"
            placeholder="e.g. Discovery Innovation Summit 2025"
            value={data.event_name}
            onChange={(e) => update({ event_name: e.target.value })}
            error={errors.event_name}
          />
          <Input
            label="Exact Location *"
            placeholder="e.g. The Forum, 150 Rivonia Road, Sandton"
            value={data.exact_location}
            onChange={(e) => update({ exact_location: e.target.value })}
            error={errors.exact_location}
          />
          <Input
            label="Event Organiser *"
            placeholder="Name of person responsible for the event"
            value={data.event_organiser}
            onChange={(e) => update({ event_organiser: e.target.value })}
            error={errors.event_organiser}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Event Date *"
              value={data.event_date}
              onChange={(e) => update({ event_date: e.target.value })}
              error={errors.event_date}
            />
            <Input
              type="date"
              label="End Date (optional)"
              value={data.event_end_date}
              onChange={(e) => update({ event_end_date: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-charcoal uppercase tracking-wide">
                Event Format *
              </label>
              <select
                value={data.event_format}
                onChange={(e) => update({ event_format: e.target.value as EventFormat })}
                className="px-3 py-2.5 text-sm border border-warm-gray rounded-lg bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold"
              >
                <option value="in-person">In-Person</option>
                <option value="virtual">Virtual</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <Input
              type="number"
              label="Duration (minutes)"
              value={data.duration_minutes}
              onChange={(e) => update({ duration_minutes: Number(e.target.value) })}
              min={15}
              max={480}
            />
          </div>
          <Input
            type="number"
            label="Estimated Audience Size"
            placeholder="e.g. 500"
            value={data.estimated_audience ?? ""}
            onChange={(e) => update({ estimated_audience: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      )}

      {/* Step 2: Demographics */}
      {step === 1 && (
        <div className="space-y-4 animate-[slide-up_0.2s_ease-out]">
          <h3 className="font-cormorant text-xl text-ink font-semibold">Audience & Organisation</h3>
          <Textarea
            label="Audience Demographics *"
            placeholder="Describe who will be in the room: seniority level, industry, job functions, approximate number..."
            value={data.audience_demographics}
            onChange={(e) => update({ audience_demographics: e.target.value })}
            error={errors.audience_demographics}
            hint="e.g. C-suite executives, 350 attendees from Discovery Health, Life and Invest divisions"
          />
          <Input
            label="Associated Company *"
            placeholder="The company or organisation hosting this event"
            value={data.associated_company}
            onChange={(e) => update({ associated_company: e.target.value })}
            error={errors.associated_company}
          />
          <Textarea
            label="Additional Notes"
            placeholder="Any context the speaker should know about the event..."
            value={data.client_notes}
            onChange={(e) => update({ client_notes: e.target.value })}
          />
        </div>
      )}

      {/* Step 3: Hospitality Rider */}
      {step === 2 && (
        <div className="space-y-4 animate-[slide-up_0.2s_ease-out]">
          <h3 className="font-cormorant text-xl text-ink font-semibold">Hospitality Agreement</h3>
          <p className="text-sm text-charcoal">
            Review {speakerName}&apos;s hospitality requirements carefully. You must agree to provide
            all listed items before submitting your booking.
          </p>
          {rider ? (
            <HospitalityRiderView
              rider={rider}
              speakerName={speakerName}
              clientName={clientProfile.full_name}
              companyName={data.associated_company}
              eventName={data.event_name}
              agreed={data.hospitality_rider_agreed}
              onAgree={(v) => update({ hospitality_rider_agreed: v })}
              showAgreement
            />
          ) : (
            <div className="border border-warm-gray rounded-xl p-6 text-center">
              <p className="text-sm text-mid-gray">No hospitality rider has been configured by this speaker.</p>
              <p className="text-xs text-mid-gray mt-1">You may proceed without an agreement.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => update({ hospitality_rider_agreed: true })}
              >
                Acknowledge & Continue
              </Button>
            </div>
          )}
          {errors.hospitality_rider_agreed && (
            <p className="text-xs text-danger">{errors.hospitality_rider_agreed}</p>
          )}
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 3 && (
        <div className="space-y-4 animate-[slide-up_0.2s_ease-out]">
          <h3 className="font-cormorant text-xl text-ink font-semibold">Confirm Booking Request</h3>

          <div className="border border-warm-gray rounded-xl overflow-hidden">
            <div className="bg-ink px-4 py-3">
              <p className="text-sm font-semibold text-gold">Booking Summary</p>
            </div>
            <div className="p-4 space-y-2.5">
              <Row label="Speaker" value={speakerName} />
              <Row label="Event" value={data.event_name} />
              <Row label="Date" value={data.event_date} />
              <Row label="Location" value={data.exact_location} />
              <Row label="Format" value={data.event_format} />
              <Row label="Duration" value={`${data.duration_minutes} minutes`} />
              <Row label="Organiser" value={data.event_organiser} />
              <Row label="Company" value={data.associated_company} />
              <div className="pt-2 border-t border-warm-gray">
                <Row
                  label="Quoted Fee"
                  value={formatZAR(speaker.speaking_fee_zar)}
                  highlight
                />
              </div>
              <Row label="Hospitality Agreed" value={data.hospitality_rider_agreed ? "Yes ✓" : "No"} />
            </div>
          </div>

          <p className="text-xs text-mid-gray text-center">
            By submitting, you send a booking request to {speakerName}. The speaker will review and respond within 48 hours.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-3 mt-8 pt-4 border-t border-warm-gray">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
            Back
          </Button>
        )}
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {step < STEPS.length - 1 ? (
          <Button variant="gold" onClick={nextStep} className="flex-1">
            Continue <ChevronRight size={14} />
          </Button>
        ) : (
          <Button
            variant="gold"
            onClick={handleSubmit}
            loading={submitting}
            className="flex-1"
          >
            Submit Booking Request
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-mid-gray">{label}</span>
      <span className={highlight ? "font-bold text-gold font-cormorant text-base" : "font-medium text-charcoal"}>
        {value}
      </span>
    </div>
  );
}
