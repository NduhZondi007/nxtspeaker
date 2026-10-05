"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { logoutUser } from "@/app/actions/auth";
import { createLogger } from "@/lib/logger";

const log = createLogger("error-boundary");

interface ErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Where "Back to dashboard" goes. */
  homeHref: string;
  /** Show the sign-out control (pointless before sign-in). */
  showSignOut?: boolean;
}

/**
 * Shared body of every error.tsx boundary.
 *
 * The raw message is never rendered: server-side it can name tables and
 * constraints, and in production Next.js replaces it anyway. The digest is
 * shown instead — it matches the server log entry for the same failure.
 */
export function ErrorState({ error, reset, homeHref, showSignOut = true }: ErrorStateProps) {
  useEffect(() => {
    log.error("route error boundary", { digest: error.digest, cause: error });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-12 bg-white">
      <div className="w-full max-w-md text-center">
        <Image
          src="/logoMark_navy.png"
          alt=""
          width={56}
          height={56}
          className="mx-auto mb-6 object-contain"
        />
        <div role="alert">
          <p className="font-space-mono text-[11px] uppercase tracking-[0.2em] text-secondary mb-2 flex items-center justify-center gap-1.5">
            <AlertTriangle size={12} aria-hidden="true" /> Error
          </p>
          <h1 className="font-archivo font-black text-primary text-2xl uppercase tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-ink mt-3 leading-relaxed">
            We couldn&apos;t load this page. Please try again — if it keeps happening, sign out and back in,
            or contact support.
          </p>
          {error.digest && (
            <p className="font-space-mono text-[11px] text-muted mt-3">Reference: {error.digest}</p>
          )}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="px-[22px] py-3 text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-[3px] transition-colors"
          >
            Try again
          </button>
          <Link
            href={homeHref}
            className="px-[22px] py-3 text-sm font-semibold text-primary bg-white border-[1.5px] border-secondary rounded-[3px] hover:bg-secondary/10 transition-colors"
          >
            Back to dashboard
          </Link>
        </div>

        {showSignOut && (
          <form action={logoutUser} className="mt-4">
            <button type="submit" className="text-sm font-semibold text-secondary hover:underline">
              Sign out →
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
