import * as React from 'react';

/**
 * The NXT Speaker brand mark, loaded from the badge PNG/JPG files in `assets/`.
 * @startingPoint section="Brand" subtitle="Badge lockup in every approved colourway" viewport="700x180"
 */
export interface LogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** `navy`/`orange` transparent badges for light grounds · `white` for navy grounds · `onNavy`/`onOrange` full-square lockups. */
  variant?: 'navy' | 'orange' | 'white' | 'onNavy' | 'onOrange';
  /** Rendered px. Never below 28px — the SPEAKER rule and megaphone slits break up. */
  size?: number;
  /** `badge` = mark only · `horizontal` = mark plus Archivo wordmark. */
  orientation?: 'badge' | 'horizontal';
  /** Relative path from the page to the copied `assets` folder. */
  assetBase?: string;
}
export function Logo(props: LogoProps): JSX.Element;
