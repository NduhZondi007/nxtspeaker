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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Stacked logo */}
        <div className="flex justify-center mb-10">
          <Image
            src="/logoStack_navy.png"
            alt="NXT Speaker"
            width={120}
            height={120}
            className="object-contain"
            priority
          />
        </div>

        <h1 className="font-archivo text-3xl font-black text-primary uppercase tracking-tight text-center mb-1">
          Welcome back
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
          <Input
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          <div className="flex justify-center pt-1">
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
