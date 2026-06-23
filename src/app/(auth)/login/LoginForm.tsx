"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginUser } from "@/app/actions/auth";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await loginUser(formData);
    if (result?.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white border-t-4 border-primary px-6 py-12">
      <div className="w-full max-w-sm">

        {/* Logo — rolls in on load */}
        <div className="flex justify-center mb-10 animate-[logo-roll_0.7s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
          <Image
            src="/logoStack_navy.png"
            alt="NXTSpeaker"
            width={120}
            height={120}
            className="object-contain"
            priority
          />
        </div>

        {/* Brand eyebrow 
        <p className="font-space-mono text-xs font-bold text-primary uppercase tracking-[0.25em] text-center mb-3">
          NXTSpeaker
        </p>
        */}

        {/* Heading — navy → teal alternating */}
        <h1 className="font-archivo font-black text-3xl uppercase tracking-tight text-center mb-1">
          <span className="text-primary">Welcome </span>
          <span className="text-secondary">back</span>
        </h1>
        <p className="text-sm text-muted text-center mb-8">Sign in to your account to continue</p>

        {error && (
          <div className="mb-4 p-3 rounded-[4px] bg-danger/10 border border-danger/20 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          <div className="space-y-1">
            <Input
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <div className="flex justify-end">
              <span className="text-xs text-secondary font-space-mono cursor-not-allowed opacity-60">
                Forgot password?
              </span>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <Button
              type="submit"
              variant="gold"
              size="lg"
              loading={loading}
              className="w-3/4"
            >
              Sign In
            </Button>
          </div>
        </form>

        <p className="mt-6 text-sm text-muted text-center">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-accent font-semibold hover:text-accent-hover">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
