import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your NxtSpeaker account to manage speaker bookings, events, and earnings.",
};

export default function LoginPage() {
  return <LoginForm />;
}
