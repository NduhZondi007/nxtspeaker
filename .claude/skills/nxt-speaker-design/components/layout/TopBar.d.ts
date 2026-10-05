import * as React from 'react';

/** Sticky translucent app header. `children` sits left of the notification bell. */
export interface TopBarProps extends React.HTMLAttributes<HTMLElement> {
  /** Archivo bold uppercase page title. */
  title?: string;
  subtitle?: string;
  /** Trailing actions, e.g. a gold CTA button. */
  children?: React.ReactNode;
}
export function TopBar(props: TopBarProps): JSX.Element;
