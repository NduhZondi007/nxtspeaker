import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Join NxtSpeaker — Africa's premier speaker booking platform. Register as an event client or professional speaker.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
