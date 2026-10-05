import * as React from 'react';

/** Single toast card. In the app these are raised through `useToast()` and auto-dismiss after 4s. */
export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message?: string;
  onDismiss?: () => void;
}
export function Toast(props: ToastProps): JSX.Element;

/** Fixed bottom-right stack. */
export interface ToastStackProps extends React.HTMLAttributes<HTMLDivElement> {
  toasts?: Array<{ id: string } & ToastProps>;
  onDismiss?: (id: string) => void;
}
export function ToastStack(props: ToastStackProps): JSX.Element;
