import * as React from 'react';

/** Centred modal — ink/60 blurred scrim, 12px panel (the one place radius exceeds 8px). */
export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onClose?: () => void;
  /** Rendered as Archivo 900 uppercase in a hairline-bordered header. */
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children?: React.ReactNode;
}
export function Modal(props: ModalProps): JSX.Element;
