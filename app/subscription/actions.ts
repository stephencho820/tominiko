"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestSubscription(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fsubscription");
  const preference = String(formData.get("coffee_preference") ?? "");
  const frequency = Number(formData.get("frequency_weeks"));
  const weight = Number(formData.get("weight_grams"));
  if (!["roaster_choice", "blend", "single_origin", "decaf"].includes(preference) || ![2,4].includes(frequency) || ![150,400].includes(weight)) redirect("/subscription?error=invalid");
  // Repeated submissions must not create duplicate pending requests.
  const { data: existing, error: lookupError } = await supabase.from("coffee_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("coffee_preference", preference)
    .eq("frequency_weeks", frequency)
    .eq("weight_grams", weight)
    .eq("status", "requested")
    .limit(1);
  if (lookupError) redirect("/subscription?error=save");
  if (existing?.length) redirect("/subscription?already=1");
  const { error } = await supabase.from("coffee_subscriptions").insert({ user_id: user.id, coffee_preference: preference, frequency_weeks: frequency, weight_grams: weight, status: "requested" });
  if (error) redirect("/subscription?error=save");
  revalidatePath("/subscription");
  redirect("/subscription?requested=1");
}
