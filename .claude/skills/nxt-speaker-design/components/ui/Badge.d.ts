import * as React from 'react';

/** Lavender pill for categories and expertise. Space Mono, uppercase, tracked. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
}
export function Badge(props: BadgeProps): JSX.Element;

/** Booking lifecycle badge — the six statuses in the database enum, each with its own tint. */
export interface BookingStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: 'PENDING' | 'CONFIRMED' | 'DEPOSIT_PAID' | 'COMPLETED' | 'CANCELLED' | 'DECLINED';
}
export function BookingStatusBadge(props: BookingStatusBadgeProps): JSX.Element;
