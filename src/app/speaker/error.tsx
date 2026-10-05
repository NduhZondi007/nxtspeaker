"use client";

import { ErrorState } from "@/components/layout/ErrorState";

export default function SpeakerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState error={error} reset={reset} homeHref="/speaker/dashboard" />;
}
