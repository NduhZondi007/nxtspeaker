import * as React from 'react';

/**
 * The platform's hero component — a bookable speaker as a card. Image → lavender category chip →
 * Archivo 900 name → one-line topic → footer with Space Mono teal fee and the orange Book button.
 * @startingPoint section="Speakers" subtitle="Speaker discovery card with hover lift" viewport="700x400"
 */
export interface SpeakerCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  /** The speaker's professional title / topic line — one line, truncated. */
  title?: string;
  /** First expertise tag; rendered as the lavender chip. */
  category?: string;
  /** Pre-formatted ZAR fee string, e.g. "R85 000". */
  fee?: string;
  photo?: string;
  /** Shown as a blurred pill over the image. */
  location?: string;
  onBook?: () => void;
}
export function SpeakerCard(props: SpeakerCardProps): JSX.Element;
