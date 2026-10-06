import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(2);
}

const expectedRef = new URL(url).hostname.split(".")[0];
const client = createClient(url, key, { auth: { persistSession: false } });
const checks = await Promise.all([
  client.from("reviews").select("id", { head: true, count: "exact" }),
  client.from("review_images").select("id", { head: true, count: "exact" }),
  client.from("product_review_summaries").select("product_id", { head: true, count: "exact" }),
  client.storage.getBucket("review-images"),
]);
const labels = ["public.reviews", "public.review_images", "public.product_review_summaries", "storage.review-images"];
let failed = false;
checks.forEach((result, index) => {
  if (result.error) { failed = true; console.error(`FAIL ${labels[index]}: ${result.error.message}`); }
  else console.log(`OK   ${labels[index]}`);
});
console.log(`Supabase project ref: ${expectedRef}`);
if (failed) {
  console.error("Apply migrations to this exact project with: npx supabase db push --linked");
  process.exit(1);
}
