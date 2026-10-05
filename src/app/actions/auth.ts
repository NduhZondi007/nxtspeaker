"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth");

// One message for every createUser failure. Echoing the provider's message
// ("A user with this email address has already been registered") turned the
// sign-up form into an oracle for which emails hold accounts.
const REGISTER_FAILED = "Could not create account. If you already have an account, sign in.";

// `role` decides both `app_metadata.role` (which RLS trusts) and
// `profiles.role` (which the admin portal trusts), and it arrives as a plain
// form field — the `as "SPEAKER" | "CLIENT"` cast that used to guard it is
// erased at build time and enforces nothing. Anyone could POST `role=ADMIN`
// to this action and self-provision a platform administrator. Only the two
// self-service roles may ever be chosen here; ADMIN is granted exclusively
// through `promoteToAdmin`, which itself requires an existing admin.
const RegisterSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(120),
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  role: z.enum(["SPEAKER", "CLIENT"]),
  phone: z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
});

const LoginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").max(255),
  password: z.string().min(1, "Password is required").max(72),
});

export async function registerUser(formData: FormData) {
  const parsed = RegisterSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    phone: formData.get("phone") || null,
    company: formData.get("company") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid registration details" };
  }

  const {
    full_name: fullName,
    email,
    password,
    role,
    phone,
    company,
  } = parsed.data;

  // Use admin API to create the user with email already confirmed.
  // This avoids sending a confirmation email (and hitting rate limits)
  // while still creating a fully active account immediately.
  const service = createServiceClient();

  const { data: adminData, error: adminError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: {
      full_name: fullName,
      phone: phone || null,
      company: company || null,
    },
  });

  if (adminError) {
    log.error("createUser failed", { cause: adminError });
    return { error: REGISTER_FAILED };
  }

  if (!adminData.user) {
    return { error: "Registration failed. Please try again." };
  }

  const userId = adminData.user.id;

  // Upsert the profile row (safety net in case the DB trigger hasn't run)
  const { error: profileUpsertError } = await service.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      email,
      role,
      phone: phone || null,
      company: company || null,
    },
    { onConflict: "id" }
  );
  if (profileUpsertError) log.error("register profile upsert failed", { cause: profileUpsertError });

  if (role === "SPEAKER") {
    const { data: existingSp } = await service
      .from("speaker_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    let speakerProfileId = existingSp?.id ?? null;

    if (!existingSp) {
      const { data: newSp, error: spInsertError } = await service
        .from("speaker_profiles")
        .insert({ user_id: userId, title: "Professional Speaker", speaking_fee_zar: 0 })
        .select("id")
        .single();
      if (spInsertError) log.error("register speaker_profiles insert failed", { cause: spInsertError });
      speakerProfileId = newSp?.id ?? null;
    }

    if (speakerProfileId) {
      const { data: existingRider } = await service
        .from("hospitality_riders")
        .select("id")
        .eq("speaker_id", speakerProfileId)
        .single();

      if (!existingRider) {
        // Not fatal: updateRider upserts, so the speaker can still create one.
        const { error: riderError } = await service
          .from("hospitality_riders")
          .insert({ speaker_id: speakerProfileId });
        if (riderError) log.error("register hospitality_riders insert failed", { cause: riderError });
      }
    }
  }

  // Sign the user in immediately — no email confirmation step needed
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    // Account was created but sign-in failed — redirect to login
    redirect("/login");
  }

  revalidatePath("/", "layout");

  if (role === "SPEAKER") {
    redirect("/speaker/profile");
  } else {
    redirect("/client/discover");
  }
}

export async function loginUser(formData: FormData) {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials" };
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Supabase's messages differ for "unconfirmed" vs "wrong password", which
    // tells a caller the account exists. Only rate limiting gets its own text.
    log.warn("signInWithPassword failed", { code: (error as { code?: string }).code });
    if ((error as { status?: number }).status === 429) {
      return { error: "Too many sign-in attempts. Please wait a minute and try again." };
    }
    return { error: "Incorrect email or password." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Login failed. Please try again." };
  }

  const { data: existing, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // Only a GENUINE no-row may trigger the recovery upsert below. Treating a
  // failed read (timeout, RLS hiccup) as "missing" used to rewrite a real
  // profile with the registration-time metadata, using the service role.
  // PGRST116 is what `.single()` reports for zero rows; accept it too.
  const isNoRow = !profileError || (profileError as { code?: string }).code === "PGRST116";
  if (profileError && !isNoRow) {
    log.error("profile read failed during login", { cause: profileError });
    return { error: "Could not load your profile. Please try again." };
  }

  let profile = existing;

  // Missing profile: recreate from trusted app_metadata (set by service role at
  // registration). ignoreDuplicates makes this INSERT ... ON CONFLICT DO
  // NOTHING, so a row that appeared concurrently is never overwritten.
  if (!profile) {
    const appMeta = user.app_metadata ?? {};
    const userMeta = user.user_metadata ?? {};
    // app_metadata is writable only by the service role, so it is trusted;
    // anything unrecognised falls back to the least-privileged role.
    const role = ["SPEAKER", "CLIENT", "ADMIN"].includes(appMeta.role as string)
      ? (appMeta.role as "SPEAKER" | "CLIENT" | "ADMIN")
      : "CLIENT";
    const service = createServiceClient();
    const { error: upsertError } = await service.from("profiles").upsert(
      {
        id: user.id,
        full_name: userMeta.full_name ?? "",
        email: user.email ?? "",
        role,
        phone: userMeta.phone ?? null,
        company: userMeta.company ?? null,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (upsertError) log.error("profile recovery upsert failed", { cause: upsertError });

    const { data: recovered, error: recoverError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (recoverError) log.error("profile re-read failed during login", { cause: recoverError });
    profile = recovered;
  }

  if (!profile?.role) {
    return { error: "Profile not found. Please contact support." };
  }

  revalidatePath("/", "layout");

  if (profile.role === "SPEAKER") {
    redirect("/speaker/dashboard");
  } else if (profile.role === "ADMIN") {
    redirect("/admin/dashboard");
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
