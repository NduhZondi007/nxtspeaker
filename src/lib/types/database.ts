// ============================================================
// NxtSpeaker — TypeScript Database Types
// ============================================================

export type UserRole = 'SPEAKER' | 'CLIENT' | 'ADMIN';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'DEPOSIT_PAID' | 'COMPLETED' | 'CANCELLED' | 'DECLINED';
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
