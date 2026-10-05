import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-white border-t-4 border-primary">
      <div className="w-full max-w-md text-center">
        <Image
          src="/logoStack_navy.png"
          alt="NXT Speaker"
          width={120}
          height={113}
          className="mx-auto mb-8 object-contain"
          priority
        />
        <p className="font-space-mono text-[11px] uppercase tracking-[0.2em] text-secondary mb-2">Error 404</p>
        <h1 className="font-archivo font-black text-primary text-3xl uppercase tracking-tight">Page not found</h1>
        <p className="text-sm text-ink mt-3 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-block mt-8 px-[22px] py-3 text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-[3px] transition-colors"
        >
          Go to my dashboard
        </Link>
      </div>
    </main>
  );
}
