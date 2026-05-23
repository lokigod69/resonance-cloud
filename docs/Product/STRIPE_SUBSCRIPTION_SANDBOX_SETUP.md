# Stripe Subscription Sandbox Setup

Phase 1 billing uses Stripe Checkout subscriptions in test mode.

Local env keys live in `frontend/.env.local`, which is gitignored. Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` server-side only; only `VITE_STRIPE_PUBLISHABLE_KEY` is browser-safe.

Required local values:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
SUBSCRIPTION_CREDITS=1000
APP_URL=http://localhost:5173
```

Create a monthly recurring test Price in Stripe, then copy its `price_...` ID into `STRIPE_PRICE_ID`.

For local webhook testing:

```bash
stripe listen --forward-to localhost:8090/api/webhooks
```

Copy the printed `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET`.

Credits are granted from `invoice.payment_succeeded` only. `checkout.session.completed` records the customer/subscription mapping and does not grant credits, preventing duplicate grants on initial subscription checkout.
