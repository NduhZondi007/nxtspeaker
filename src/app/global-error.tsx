"use client";

import "./globals.css";
import { ErrorState } from "@/components/layout/ErrorState";

/**
 * Last-resort boundary for errors in the root layout. It replaces the root
 * layout entirely, so it must render its own <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorState error={error} reset={reset} homeHref="/" />
      </body>
    </html>
  );
}
