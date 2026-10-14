// Read-only / invalid-input smoke tests. Does not create orders or charge cards.
// Usage: SMOKE_BASE_URL=https://your-preview.example node scripts/smoke-order-apis.mjs
import assert from "node:assert/strict";

const base = process.env.SMOKE_BASE_URL;
if (!base || !/^https?:\/\//.test(base)) {
  console.error("Set SMOKE_BASE_URL to an explicit staging or preview origin.");
  process.exit(2);
}
const origin = new URL(base).origin;
const checks = [
  { label: "admin live orders require login", path: "/api/admin/tasting-live", method: "GET", expected: 403 },
  { label: "admin order updates require login", path: "/api/admin/orders", method: "PATCH", body: { id: "invalid", order_status: "completed" }, expected: 403 },
  { label: "malformed order rejected", path: "/api/orders", method: "POST", body: {}, expected: 400 },
  { label: "malformed payment confirmation rejected", path: "/api/payments/confirm", method: "POST", body: {}, expected: 400 },
];
let failed = 0;
for (const check of checks) {
  try {
    const response = await fetch(new URL(check.path, origin), {
      method: check.method,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      ...(check.body ? { body: JSON.stringify(check.body) } : {}),
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, check.expected, `${check.label}: expected ${check.expected}, received ${response.status}`);
    console.log(`PASS ${check.label}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${check.label}: ${error.message}`);
  }
}
if (failed) process.exitCode = 1;
