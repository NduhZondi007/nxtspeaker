import * as React from 'react';

/**
 * Text field with Space Mono uppercase label. Teal border, orange focus border + ring.
 * @startingPoint section="UI" subtitle="Input, Textarea and Select with labels, hints and errors" viewport="700x250"
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Helper line below; hidden while `error` is set. */
  hint?: string;
  /** Error message — turns the border red. */
  error?: string;
  /** Leading glyph, normally `<Icon name="search" />`. */
  iconLeft?: React.ReactNode;
}
export function Input(props: InputProps): JSX.Element;

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}
export function Textarea(props: TextareaProps): JSX.Element;

/** Select styled to match Input; the app uses it for sort order, format and fee band. */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: Array<string | { value: string; label: string }>;
}
export function Select(props: SelectProps): JSX.Element;
