import * as React from 'react';

/** Lucide glyph. `name` is the kebab-case Lucide id — `calendar-check`, `sliders-horizontal`, `log-out`. */
export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  /** px, matches the numeric `size` prop used with lucide-react in the app (16 default). */
  size?: number;
  color?: string;
  strokeWidth?: number;
}
export function Icon(props: IconProps): JSX.Element;
