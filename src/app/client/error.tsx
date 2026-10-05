"use client";

import { ErrorState } from "@/components/layout/ErrorState";

export default function ClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState error={error} reset={reset} homeHref="/client/dashboard" />;
}
