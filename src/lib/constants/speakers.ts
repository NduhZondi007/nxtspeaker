/**
 * Shared speaker vocabularies.
 *
 * The profile editor, the discover filters and the admin "add speaker" modal
 * each kept their own list, and they disagreed — a speaker could tag
 * themselves with a topic no client could filter by. This is the union of
 * all three; import from here rather than declaring another copy.
 */

export const EXPERTISE_OPTIONS: readonly string[] = [
  "Leadership",
  "AI",
  "AI & Future of Work",
  "Digital Transformation",
  "Sustainability",
  "ESG",
  "Innovation",
  "Future of Work",
  "Neuroscience",
  "High Performance",
  "Strategy",
  "Entrepreneurship",
  "Change Management",
  "DEI & Inclusion",
  "Finance",
  "Marketing",
  "Sales",
  "Technology",
  "Healthcare",
  "Education",
  "Wellness",
  "Motivation",
  "Politics",
  "Media",
  "Sports",
  "Entertainment",
];

export const LANGUAGE_OPTIONS: readonly string[] = [
  "English",
  "Afrikaans",
  "Zulu",
  "Xhosa",
  "Sotho",
  "Tswana",
  "Venda",
  "Tsonga",
  "French",
  "Portuguese",
  "Swahili",
];

/** Index 0 is level 1. `speaker_profiles.level` is CHECK (level BETWEEN 1 AND 5). */
export const TIER_LABELS: readonly string[] = [
  "Emerging Talent",
  "Rising Professional",
  "Established Expert",
  "Industry Leader",
  "Celebrity Speaker",
];

export function getTierLabel(level: number | null | undefined): string {
  if (typeof level !== "number") return "Speaker";
  return TIER_LABELS[level - 1] ?? "Speaker";
}
