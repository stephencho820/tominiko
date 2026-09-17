# Casa di Stefano

Small batch coffee, roasted with intention.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The development server listens on all container interfaces at port `3000`. In a
remote workspace, open the workspace's **Ports** panel, forward port `3000`, and
use the generated HTTPS URL. Opening `http://localhost:3000` on your own computer
only works when the repository is running on that same computer.

To verify the server from inside the workspace, run:

```bash
curl --fail http://127.0.0.1:3000
```

The production check is:

```bash
npm run build
```

The app uses Next.js App Router, TypeScript, Tailwind CSS, Supabase, and is structured for Cloudflare Workers through OpenNext. It does not use Vercel-only APIs.

## Supabase setup

1. Create a free Supabase project at [supabase.com](https://supabase.com).
2. Copy the project URL and anon key into `.env.local`.
3. In Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
4. Run [`supabase/seed.sql`](supabase/seed.sql) to add the starter catalogue: 또미 블랜딩, 에티오피아 구지, 케냐 키리냐가, and 콜롬비아 핑크 버번. Each 150g bag is discounted from ₩20,000 to ₩13,000.
5. Create the `product-images` bucket as public, then apply the storage policies in the same SQL file.
6. Configure Auth > URL Configuration with the local and production callback URLs listed in `.env.example`.

Required `.env.local` values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...
TOSS_SECRET_KEY=test_sk_...
```

The service role and Toss secret keys are server-only and must never be prefixed with `NEXT_PUBLIC_` or exposed to the browser. The Toss client key is intentionally public.

## Toss Payments setup

This project uses the current Toss Payments v2 Standard SDK payment window and the server-side payment confirmation API. The browser only opens the payment window. The server independently loads the order total, sends the approval request with the secret key, verifies `paymentKey`, `orderId`, `amount`, and `status`, and only then marks the order paid.

Before deploying:

1. In the Supabase SQL Editor, run [`supabase/migrations/202609170001_payments.sql`](supabase/migrations/202609170001_payments.sql). It adds payment metadata plus atomic order creation and stock-deduction RPCs.
2. Get a **test client key** and **test secret key** from Toss Payments Developer Center. Set `NEXT_PUBLIC_TOSS_CLIENT_KEY` and the server-only `TOSS_SECRET_KEY`. Switch both to the matching live-key pair only after test verification and Toss onboarding.
3. In Toss Payments Developer Center, register `https://YOUR_DOMAIN/api/payments/webhook` as the payment-status webhook URL. Webhook payloads are not accepted as proof by themselves; the handler retrieves the payment from Toss with the secret key before applying an idempotent state transition.
4. Set `SUPABASE_SERVICE_ROLE_KEY` and `TOSS_SECRET_KEY` as encrypted Cloudflare Worker secrets. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, and `NEXT_PUBLIC_TOSS_CLIENT_KEY` as deployment variables. Never expose the service-role or Toss secret key as `NEXT_PUBLIC_*` values.
5. Ensure the production domain is allowed in the Toss configuration and that `NEXT_PUBLIC_SITE_URL` uses HTTPS.

The server calculates every line price from `products`; browser `unitPrice`, subtotal, and total values are ignored. Payment finalization locks the relevant product rows, checks aggregate quantities, decrements stock, and changes `payment_status` to `paid` in one PostgreSQL transaction. Concurrent buyers therefore cannot oversell the last unit. If Toss approval succeeds after stock has disappeared, the server immediately compensates by cancelling that payment rather than creating a paid order without inventory.

### Payment checks before going live

- Complete a test-card payment as a guest and confirm the completion page, Admin payment status, order status, and stock decrement.
- Double-click the payment CTA, refresh the success URL, and retry after a simulated network interruption; one checkout reference must map to one order and inventory must decrement once.
- Cancel in the payment window and retry from Checkout; the cart must remain and no stock should move.
- Try two simultaneous payments for the final unit; only one order may become paid and the other payment must be cancelled.
- Send the same webhook more than once and verify the order and stock do not change twice.
- Alter `amount` in the success URL/request and verify confirmation is rejected.
- Verify test and live keys are never mixed, then perform Toss's required live approval test before accepting real orders.

## OAuth

In Supabase Auth > Providers, enable Google and Kakao. Google OAuth needs a Google Cloud OAuth web client with the Supabase callback URL. Kakao needs a Kakao Developers app, REST API key, consent scopes, and the same Supabase callback URL. Add the provider client ID/secret only in Supabase; do not commit them here.

## Admin

After the first user signs in, promote that user in Supabase SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'your@email.com';
```

Admin URL: `/admin`. Authorization is checked on the server and again by RLS policies; hiding links in the UI is not the security boundary.

## Cloudflare deployment

The repository includes OpenNext configuration for Cloudflare. Connect the GitHub repository in Cloudflare Workers & Pages, use the `npm run build:cloudflare` build command, and set the same environment variables as encrypted Worker variables. For a manual deploy:

```bash
npm run build:cloudflare
npx wrangler deploy
```

Use the Cloudflare Worker URL as `NEXT_PUBLIC_SITE_URL`, and add its `/auth/callback` URL to Supabase Auth URL Configuration.

## Current scope and next steps

Product browsing, guest and member checkout, Toss Payments approval and reconciliation, transactional inventory, account order views, admin product/order screens, image upload wiring, and RLS are included. Before higher traffic, add edge rate limiting, an automated abandoned-pending-order cleanup policy, backups, and an admin audit log.
