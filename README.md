# Casa di Stefano

Small batch coffee, roasted with intention.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the forwarded port shown by Codespaces (usually `3000`). The production check is:

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
```

The service role key is server-only and must never be prefixed with `NEXT_PUBLIC_` or exposed to the browser.

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

Product browsing, product detail, localStorage cart, guest checkout/order creation, Google/Kakao sign-in buttons, account order views, admin product/order screens, image upload wiring, RLS, and a payment service boundary are included. Toss Payments approval is intentionally not implemented yet. Connect it in `services/payment.ts` and the checkout order action after credentials and webhook handling are ready.

For production, add email verification policy, rate limiting, transactional stock decrementing, shipping fee rules, Toss webhook signature verification, backups, and an admin audit log.