# Order API smoke verification

Run `SMOKE_BASE_URL=https://YOUR-STAGING-OR-PREVIEW-URL node scripts/smoke-order-apis.mjs`.

The script only sends unauthenticated GET/PATCH and deliberately invalid POST requests. It never creates an order, changes a real order, confirms a payment, or uses service-role credentials. All four checks must return the expected 403/400 status. A login redirect, deployment-protection page, or 5xx response is a failed/inconclusive check, not a pass.

This is **not** a full end-to-end order test. A complete staging-only E2E suite still needs seeded products and inventory, guest and member sessions, a Toss test-payment configuration, MY ORDERS assertions, and cleanup. Do not run real payment confirmation against production as a test.
