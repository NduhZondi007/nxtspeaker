"use client";

// Thin wrapper — use useAuth() directly in new code.
// Kept for backwards compatibility with existing callers.
export { useAuth as useUser } from "@/components/layout/AuthProvider";
