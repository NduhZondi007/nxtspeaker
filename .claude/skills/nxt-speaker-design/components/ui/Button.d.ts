import * as React from 'react';

/**
 * The app's button. Orange (`gold`) is reserved for actions — one primary CTA per view.
 * 3px radius at every size; padding 12×22px at md, verbatim from the codebase.
 * @startingPoint section="UI" subtitle="Every button variant, size and state" viewport="700x170"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** `gold` = orange CTA · `primary` = navy · `outline` = teal-bordered · `ghost` = teal text · `soft` = lavender · `danger`. */
  variant?: 'gold' | 'primary' | 'outline' | 'ghost' | 'soft' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  disabled?: boolean;
  as?: 'button' | 'a';
  children?: React.ReactNode;
}
export function Button(props: ButtonProps): JSX.Element;
