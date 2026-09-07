import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validateBookingDates } from "@/lib/utils/booking";

const BookingSchema = z.object({
  speaker_id: z.string().uuid(),
  event_name: z.string().trim().min(1, "Event name is required").max(200),
  audience_demographics: z.string().trim().min(1, "Audience demographics are required").max(2000),
  exact_location: z.string().trim().min(1, "Location is required").max(300),
  event_organiser: z.string().trim().min(1, "Event organiser is required").max(200),
  associated_company: z.string().trim().min(1, "Associated company is required").max(200),
  event_date: z.string().min(1, "Event date is required"),
  event_end_date: z.string().optional(),
  duration_minutes: z
    .number()
    .int()
    .min(15, "Duration must be at least 15 minutes")
    .max(480, "Duration cannot exceed 480 minutes")
    .default(60),
  event_format: z.enum(["in-person", "virtual", "hybrid"]),
  estimated_audience: z.number().int().positive().max(1_000_000).optional(),
  client_notes: z.string().trim().max(4000).optional(),
  hospitality_rider_agreed: z.boolean(),
  // quoted_fee_zar intentionally excluded — fetched server-side
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Explicit role check for a clear error message — RLS also enforces this
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "CLIENT") {
    return NextResponse.json({ error: "Only clients can create bookings" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const input = parsed.data;

  // Calendar-date checks the schema can't express: the event must be in the
  // future and a multi-day event must not end before it starts.
  const dateError = validateBookingDates(input.event_date, input.event_end_date);
  if (dateError) {
    return NextResponse.json({ error: dateError }, { status: 422 });
  }

  // Look up the speaker's authoritative fee — never trust client-supplied values
  const { data: speaker } = await supabase
    .from("speaker_profiles")
    .select("speaking_fee_zar")
    .eq("id", input.speaker_id)
    .eq("status", "ACTIVE")
    .single();

  if (!speaker) {
    return NextResponse.json({ error: "Speaker not found or unavailable" }, { status: 404 });
  }

  // Use the regular (anon-key) client so RLS policies apply to the INSERT
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      client_id: user.id,
      speaker_id: input.speaker_id,
      event_name: input.event_name,
      audience_demographics: input.audience_demographics,
      exact_location: input.exact_location,
      event_organiser: input.event_organiser,
      associated_company: input.associated_company,
      event_date: input.event_date,
      event_end_date: input.event_end_date || null,
      duration_minutes: input.duration_minutes,
      event_format: input.event_format,
      estimated_audience: input.estimated_audience || null,
      client_notes: input.client_notes || null,
      hospitality_rider_agreed: input.hospitality_rider_agreed,
      hospitality_agreed_at: input.hospitality_rider_agreed ? new Date().toISOString() : null,
      quoted_fee_zar: speaker.speaking_fee_zar,
      status: "PENDING",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
