"use client";

import { ErrorState } from "@/components/layout/ErrorState";

/**
 * Catches failures in the role layouts themselves (client/, speaker/, admin/),
 * which their own error.tsx cannot: a segment's boundary wraps its page, not
 * its layout. A failed profile read in a layout lands here.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState error={error} reset={reset} homeHref="/" />;
}
