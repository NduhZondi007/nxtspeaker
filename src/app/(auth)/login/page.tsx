"use client";

import { useState } from "react";
import Link from "next/link";
import { Mic2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginUser } from "@/app/actions/auth";

export default function LoginPage() {
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
    <div className="min-h-screen flex">
      {/* Form side */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-20 py-12 bg-cream">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center">
            <Mic2 size={18} className="text-gold" />
          </div>
          <span className="font-cormorant text-2xl text-ink font-semibold">NxtSpeaker</span>
        </div>

        <div className="max-w-sm w-full">
          <h1 className="font-cormorant text-4xl text-ink font-bold mb-2">Welcome back</h1>
          <p className="text-mid-gray mb-8">Sign in to your account to continue</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
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
            <Button type="submit" variant="gold" className="w-full" size="lg" loading={loading}>
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-sm text-mid-gray text-center">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-gold font-medium hover:text-gold-dark">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Visual side */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-end p-16"
        style={{
          background: "linear-gradient(135deg, #0A0A0F 0%, #1a1208 50%, #2C2A26 100%)",
        }}
      >
        <div
          className="w-16 h-1 mb-8 rounded-full"
          style={{ background: "linear-gradient(90deg, #C9A96E, transparent)" }}
        />
        <h2 className="font-cormorant text-5xl text-white font-bold leading-tight mb-4">
          Africa&apos;s Premier<br />
          <span className="text-gold">Speaker Platform</span>
        </h2>
        <p className="text-white/60 text-lg leading-relaxed max-w-sm">
          Connect with world-class speakers who drive transformation across the continent.
        </p>
        <div className="mt-12 flex gap-8">
          {[
            { value: "500+", label: "Speakers" },
            { value: "R2.4B", label: "Fees Facilitated" },
            { value: "48h", label: "Response Time" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-cormorant text-2xl font-bold text-gold">{stat.value}</p>
              <p className="text-xs text-white/40 uppercase tracking-wide mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
