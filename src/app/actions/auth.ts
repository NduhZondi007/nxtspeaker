"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function registerUser(formData: FormData) {
  const supabase = await createClient();

  const fullName = formData.get("full_name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as "SPEAKER" | "CLIENT";
  const phone = formData.get("phone") as string | null;
  const company = formData.get("company") as string | null;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
        phone: phone || null,
        company: company || null,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Registration failed. Please try again." };
  }

  // The handle_new_user trigger creates the profiles row automatically.
  // For speakers, handle_new_speaker_profile trigger creates speaker_profiles + hospitality_riders.

  revalidatePath("/", "layout");

  if (role === "SPEAKER") {
    redirect("/speaker/profile");
  } else {
    redirect("/client/discover");
  }
}

export async function loginUser(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Login failed. Please try again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) {
    return { error: "Profile not found. Please contact support." };
  }

  revalidatePath("/", "layout");

  if (profile.role === "SPEAKER") {
    redirect("/speaker/dashboard");
  } else {
    redirect("/client/dashboard");
  }
}

export async function logoutUser() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
