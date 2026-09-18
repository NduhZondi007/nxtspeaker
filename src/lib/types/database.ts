// ============================================================
// NxtSpeaker — TypeScript Database Types
// ============================================================

export type UserRole = 'SPEAKER' | 'CLIENT' | 'ADMIN';
/**
 * Booking lifecycle.
 *
 * PAID means the client's money is in NxtSpeaker's account; it is set only by
 * the verified Yoco webhook running as the service role.
 *
 * DEPOSIT_PAID predates the payment gateway and is a dead-end legacy value:
 * existing rows still render, but nothing transitions into or out of it.
 */
export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAID'
  | 'DEPOSIT_PAID'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DECLINED';
export type SpeakerStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_REVIEW';
export type EventFormat = 'in-person' | 'virtual' | 'hybrid';
export type MealTiming = 'before' | 'after' | 'no preference';
export type AccommodationStandard = 'three_star' | 'four_star' | 'five_star';

export interface Profile {
  id: string;
  role: UserRole;
  base_role: 'SPEAKER' | 'CLIENT' | null;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpeakerProfile {
  id: string;
  user_id: string;
  title: string;
  bio: string | null;
  expertise: string[];
  languages: string[];
  location: string | null;
  speaking_fee_zar: number;
  fee_currency: string;
  level: number;
  available: boolean;
  virtual_available: boolean;
  hybrid_available: boolean;
  tags: string[];
  total_events: number;
  avg_rating: number;
  profile_video_url: string | null;
  photo_urls: string[];
  status: SpeakerStatus;
  created_at: string;
  updated_at: string;
  // Joined
  profiles?: Profile;
}

export interface HospitalityRider {
  id: string;
  speaker_id: string;
  water_still: boolean;
  water_sparkling: boolean;
  water_room_temp: boolean;
  dietary_restrictions: string[];
  dietary_notes: string | null;
  meal_required: boolean;
  meal_timing: MealTiming;
  green_room_required: boolean;
  green_room_notes: string | null;
  av_requirements: string | null;
  presentation_clicker: boolean;
  confidence_monitor: boolean;
  flights_required: boolean;
  accommodation_required: boolean;
  accommodation_standard: AccommodationStandard;
  additional_requests: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  booking_number: string;
  client_id: string;
  speaker_id: string;
  event_name: string;
  audience_demographics: string;
  exact_location: string;
  event_organiser: string;
  associated_company: string;
  event_date: string;
  event_end_date: string | null;
  duration_minutes: number;
  event_format: EventFormat;
  estimated_audience: number | null;
  quoted_fee_zar: number;
  deposit_amount_zar: number | null;
  status: BookingStatus;
  hospitality_rider_agreed: boolean;
  hospitality_agreed_at: string | null;
  hospitality_notes: string | null;
  client_notes: string | null;
  internal_notes: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  profiles?: Profile;
  speaker_profiles?: SpeakerProfile & { profiles?: Profile };
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  // Joined
  profiles?: Profile;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  speaker_id: string;
  rating: number;
  headline: string | null;
  body: string | null;
  verified: boolean;
  created_at: string;
  // Joined
  profiles?: Profile;
}

// Form types
export interface BookingFormData {
  event_name: string;
  audience_demographics: string;
  exact_location: string;
  event_organiser: string;
  associated_company: string;
  event_date: string;
  event_end_date?: string;
  duration_minutes: number;
  event_format: EventFormat;
  estimated_audience?: number;
  client_notes?: string;
}

export interface SpeakerProfileFormData {
  title: string;
  bio: string;
  expertise: string[];
  languages: string[];
  location: string;
  speaking_fee_zar: number;
  level: number;
  available: boolean;
  virtual_available: boolean;
  hybrid_available: boolean;
  tags: string[];
  profile_video_url?: string | null;
}

export interface HospitalityRiderFormData {
  water_still: boolean;
  water_sparkling: boolean;
  water_room_temp: boolean;
  dietary_restrictions: string[];
  dietary_notes: string;
  meal_required: boolean;
  meal_timing: MealTiming;
  green_room_required: boolean;
  green_room_notes: string;
  av_requirements: string;
  presentation_clicker: boolean;
  confidence_monitor: boolean;
  flights_required: boolean;
  accommodation_required: boolean;
  accommodation_standard: AccommodationStandard;
  additional_requests: string;
}

// ============================================================
// Escrow payments
// ============================================================
// Amounts on these tables are integer CENTS, not rand. Yoco's API speaks
// cents, and a NUMERIC column arriving as a string and becoming a JS float
// cannot guarantee that commission + speaker = gross. Render them with
// `formatZARCents`, not `formatZAR`.
//
// Postgres BIGINT can arrive from PostgREST as a string, exactly like NUMERIC
// does. Coerce with `Number(...)` before arithmetic, as the existing
// `quoted_fee_zar` call sites do.

export type PaymentStatus =
  | 'CREATED'       // row exists, provider not yet called
  | 'PENDING'       // checkout open at the provider
  | 'SUCCEEDED'     // webhook verified, money received
  | 'FAILED'
  | 'CANCELLED'     // abandoned or swept
  | 'REFUNDED'
  | 'NEEDS_REVIEW'; // e.g. provider amount != our amount; never auto-advances

export type PayoutStatus =
  | 'PENDING'   // client has paid, event not yet delivered
  | 'DUE'       // event completed; payable once available_at passes
  | 'PAID'
  | 'ON_HOLD'   // dispute, no-show, or missing bank details
  | 'CANCELLED';

export type BankAccountType = 'CHEQUE' | 'SAVINGS' | 'TRANSMISSION';

export type PaymentProviderName = 'yoco';

export interface Payment {
  id: string;
  booking_id: string;
  provider: PaymentProviderName;
  provider_checkout_id: string | null;
  provider_payment_id: string | null;
  processing_mode: 'live' | 'test' | null;
  redirect_url: string | null;
  idempotency_key: string;
  currency: 'ZAR';
  gross_amount_cents: number;
  /** The rate applied to THIS payment, snapshotted so history never restates. */
  commission_rate_bps: number;
  commission_amount_cents: number;
  speaker_amount_cents: number;
  /** Provider fee. The platform absorbs it, so it never reduces the speaker's share. */
  processing_fee_cents: number;
  refunded_amount_cents: number;
  status: PaymentStatus;
  failure_reason: string | null;
  succeeded_at: string | null;
  failed_at: string | null;
  refunded_at: string | null;
  last_webhook_event_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  bookings?: Booking;
}

export interface Payout {
  id: string;
  speaker_id: string;
  booking_id: string;
  payment_id: string;
  amount_cents: number;
  status: PayoutStatus;
  /** Set when the booking completes: COMPLETED + 7 days. */
  available_at: string | null;
  eft_reference: string | null;
  /** Bank details frozen at payment time, so a later edit cannot rewrite history. */
  bank_snapshot: SpeakerPayoutDetails | null;
  notes: string | null;
  marked_paid_by: string | null;
  marked_paid_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  bookings?: Booking;
  speaker_profiles?: SpeakerProfile & { profiles?: Profile };
}

export interface SpeakerPayoutDetails {
  speaker_id: string;
  account_holder: string;
  bank_name: string;
  account_number: string;
  branch_code: string;
  account_type: BankAccountType;
  tax_number: string | null;
  is_vat_registered: boolean;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  provider: PaymentProviderName;
  /** The provider's `webhook-id` header — the dedupe key. */
  provider_event_id: string;
  event_type: string | null;
  payload: unknown;
  signature_verified: boolean;
  received_at: string;
  processed_at: string | null;
  processing_error: string | null;
}

export interface SpeakerPayoutDetailsFormData {
  account_holder: string;
  bank_name: string;
  account_number: string;
  branch_code: string;
  account_type: BankAccountType;
  tax_number: string;
  is_vat_registered: boolean;
}
