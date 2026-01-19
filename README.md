This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Data Sources

**Stripe Integration**: Stripe is used only as a data source. All Stripe data flows through:
- Stripe → compute → write to `kpi_snapshots` → UI reads only from `kpi_snapshots`
- KPI snapshots remain the single source of truth for all UI displays.
- No Stripe numbers go directly to the UI.

## Environment Variables

Required environment variables for Stripe Connect integration:

```bash
# Stripe Connect OAuth
STRIPE_CLIENT_ID=ca_...                    # Connect Client ID from Stripe Dashboard > Settings > Connect
STRIPE_CONNECT_REDIRECT_URI=http://localhost:3000/api/stripe/callback  # Full callback URL (must match Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_...              # Stripe Secret Key (server-only, used for OAuth token exchange)
```

**Important**: The `STRIPE_CONNECT_REDIRECT_URI` must exactly match the redirect URI configured in your Stripe Connect settings. For local development, use `http://localhost:3000/api/stripe/callback`. For production, use your production domain.

Check Stripe Connect health: `GET /api/stripe/health` returns which env vars are configured (boolean flags only).
