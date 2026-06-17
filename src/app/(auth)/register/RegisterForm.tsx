"use client";

import { useState } from "react";
import Link from "next/link";
import { Mic2, Users, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { registerUser } from "@/app/actions/auth";

type Role = "SPEAKER" | "CLIENT";

export function RegisterForm() {
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!role) return;
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("role", role);
    const result = await registerUser(formData);
    if (result?.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex">
      {/* Form side */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-16 lg:px-20 py-12 bg-cream overflow-y-auto">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center">
            <Mic2 size={18} className="text-gold" />
          </div>
          <span className="font-cormorant text-2xl text-ink font-semibold">NxtSpeaker</span>
        </div>

        <div className="max-w-sm w-full">
          <h1 className="font-cormorant text-4xl text-ink font-bold mb-2">Create your account</h1>
          <p className="text-mid-gray mb-8">Join Africa&apos;s premier speaker platform</p>

          {/* Role selection */}
          {!role ? (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-4">
                I am joining as...
              </p>
              <button
                onClick={() => setRole("CLIENT")}
                className="w-full p-4 border-2 border-warm-gray rounded-2xl text-left hover:border-gold hover:bg-gold/5 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warm-gray group-hover:bg-gold/20 flex items-center justify-center transition-colors">
                    <Users size={18} className="text-charcoal group-hover:text-gold" />
                  </div>
                  <div>
                    <p className="font-semibold text-charcoal">Event Client</p>
                    <p className="text-xs text-mid-gray mt-0.5">
                      Browse and book speakers for my events and conferences
                    </p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setRole("SPEAKER")}
                className="w-full p-4 border-2 border-warm-gray rounded-2xl text-left hover:border-gold hover:bg-gold/5 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warm-gray group-hover:bg-gold/20 flex items-center justify-center transition-colors">
                    <Mic2 size={18} className="text-charcoal group-hover:text-gold" />
                  </div>
                  <div>
                    <p className="font-semibold text-charcoal">Professional Speaker</p>
                    <p className="text-xs text-mid-gray mt-0.5">
                      List my profile and receive booking requests from event organisers
                    </p>
                  </div>
                </div>
              </button>

              <p className="mt-6 text-sm text-mid-gray text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-gold font-medium hover:text-gold-dark">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setRole(null)}
                className="flex items-center gap-1 text-xs text-mid-gray hover:text-charcoal mb-6 transition-colors"
              >
                ← Back to role selection
              </button>

              <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-gold/10 border border-gold/20">
                {role === "CLIENT" ? (
                  <Users size={16} className="text-gold" />
                ) : (
                  <UserCheck size={16} className="text-gold" />
                )}
                <span className="text-sm font-medium text-gold-dark">
                  Registering as {role === "CLIENT" ? "Event Client" : "Professional Speaker"}
                </span>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="full_name" label="Full Name *" placeholder="Your full name" required />
                <Input name="email" type="email" label="Email Address *" placeholder="you@example.com" required />
                <Input
                  name="password"
                  type="password"
                  label="Password *"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
                <Input name="phone" type="tel" label="Phone Number" placeholder="+27 82 000 0000" />
                {role === "CLIENT" && (
                  <Input name="company" label="Company / Organisation" placeholder="Your company name" />
                )}
                <Button type="submit" variant="gold" size="lg" className="w-full" loading={loading}>
                  Create Account
                </Button>
              </form>

              <p className="mt-4 text-xs text-mid-gray text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-gold font-medium hover:text-gold-dark">
                  Sign in
                </Link>
              </p>
            </div>
          )}
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
          Speak. Lead.<br />
          <span className="text-gold">Transform.</span>
        </h2>
        <p className="text-white/60 text-lg leading-relaxed max-w-sm">
          The platform built for the African business stage — where world-class speakers meet world-class events.
        </p>
      </div>
    </div>
  );
}
