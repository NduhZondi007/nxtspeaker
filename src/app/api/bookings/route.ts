import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const BookingSchema = z.object({
  speaker_id: z.string().uuid(),
  event_name: z.string().min(1, "Event name is required"),
  audience_demographics: z.string().min(1, "Audience demographics are required"),
  exact_location: z.string().min(1, "Location is required"),
  event_organiser: z.string().min(1, "Event organiser is required"),
  associated_company: z.string().min(1, "Associated company is required"),
  event_date: z.string().min(1, "Event date is required"),
  event_end_date: z.string().optional(),
  duration_minutes: z.number().int().positive().default(60),
  event_format: z.enum(["in-person", "virtual", "hybrid"]),
  estimated_audience: z.number().int().positive().optional(),
  client_notes: z.string().optional(),
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
