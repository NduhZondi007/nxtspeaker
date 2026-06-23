"use client";

import { useState } from "react";
import Image from "next/image";
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white border-t-4 border-primary px-6 py-12">
      <div className="w-full max-w-sm">

        {/* Logo — rolls in on load */}
        <div className="flex justify-center mb-10 animate-[logo-roll_0.7s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
          <Image
            src="/logoStack_navy.png"
            alt="NXT Speaker"
            width={120}
            height={120}
            className="object-contain"
            priority
          />
        </div>

        {/* Heading — navy → teal → orange alternating */}
        <h1 className="font-archivo font-black text-3xl uppercase tracking-tight text-center mb-1">
          <span className="text-primary">Create </span>
          <span className="text-secondary">your </span>
          <span className="text-accent">account</span>
        </h1>
        <p className="text-sm text-muted text-center mb-8">Join South Africa&apos;s speaker platform</p>

        {/* Step 1 — Role selection */}
        {!role ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 font-space-mono text-center">
              I am joining as...
            </p>

            <button
              onClick={() => setRole("CLIENT")}
              className="w-full p-4 border-2 border-line rounded-[8px] text-left transition-all group hover:border-secondary hover:bg-soft"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[4px] bg-soft group-hover:bg-secondary/15 flex items-center justify-center transition-colors shrink-0">
                  <Users size={18} className="text-muted group-hover:text-secondary transition-colors" />
                </div>
                <div>
                  <p className="font-semibold text-primary">Event Coordinator</p>
                  <p className="text-xs text-muted mt-0.5">
                    I want to discover and book speakers for my events
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setRole("SPEAKER")}
              className="w-full p-4 border-2 border-line rounded-[8px] text-left transition-all group hover:border-secondary hover:bg-soft"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[4px] bg-soft group-hover:bg-secondary/15 flex items-center justify-center transition-colors shrink-0">
                  <Mic2 size={18} className="text-muted group-hover:text-secondary transition-colors" />
                </div>
                <div>
                  <p className="font-semibold text-primary">Professional Speaker</p>
                  <p className="text-xs text-muted mt-0.5">
                    I want to list my profile and receive booking requests
                  </p>
                </div>
              </div>
            </button>

            <p className="pt-4 text-sm text-muted text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-accent font-semibold hover:text-accent-hover">
                Sign in
              </Link>
            </p>
          </div>
        ) : (
          /* Step 2 — Registration form */
          <div>
            <button
              onClick={() => setRole(null)}
              className="flex items-center gap-1 text-xs text-muted hover:text-primary mb-6 transition-colors"
            >
              ← Back
            </button>

            {/* Role indicator */}
            <div className="flex items-center gap-2 mb-6 p-3 rounded-[4px] bg-secondary/10 border border-secondary/20">
              {role === "CLIENT" ? (
                <Users size={15} className="text-secondary shrink-0" />
              ) : (
                <UserCheck size={15} className="text-secondary shrink-0" />
              )}
              <span className="text-sm font-medium text-primary">
                Joining as{" "}
                <span className="text-secondary">
                  {role === "CLIENT" ? "Event Client" : "Professional Speaker"}
                </span>
              </span>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-[4px] bg-danger/10 border border-danger/20 text-sm text-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input name="full_name" label="Full Name" placeholder="Your full name" required />
              <Input name="email" type="email" label="Email Address" placeholder="you@example.com" required />
              <Input
                name="password"
                type="password"
                label="Password"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
              <Input name="phone" type="tel" label="Phone Number" placeholder="+27 82 000 0000" />
              {role === "CLIENT" && (
                <Input name="company" label="Company / Organisation" placeholder="Your company name" />
              )}

              <div className="flex justify-center pt-2">
                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  loading={loading}
                  className="w-3/4"
                >
                  Create Account
                </Button>
              </div>
            </form>

            <p className="mt-4 text-sm text-muted text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-accent font-semibold hover:text-accent-hover">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
