# Triple-Seven launch setup

The code runs locally. Public hosting, transactional email and online payments are not activated because the owner has no provider accounts yet. Do not treat placeholders or local tests as live service verification.

## Decisions required from the owner

- Owner/admin email address.
- Shipping fee in EGP (multiply by 100 for SHIPPING_FEE_PIASTRES).
- Hosting and domain budget and chosen domain, if any.
- Payment provider account if accepting cards/wallets instead of only cash on delivery.

Do not paste passwords or API keys into chat. Save credentials in the provider's secret/environment panel or the ignored local `.env` file. The owner must handle identity checks, password creation and acceptance of account terms.

## Suggested setup order

1. Create a hosting account that supports persistent Node.js web services. Render is one supported example: https://render.com/docs/deploy-node-express-app . Its provided HTTPS subdomain can be used before buying a custom domain: https://render.com/docs/web-services . This is not a claim that any particular plan is free or suitable for production; review its current price and limits.
2. Put the source in a repository owned by you and connect it to hosting. Repository push/publication has not been performed. Use the repository root as the service root. Install with `npm --prefix backend ci --omit=dev` and `npm --prefix frontend ci`, then build with `npm run build`. Start with `npm --prefix backend start`; health path is `/api/health`. For Docker, build the React frontend first, then build `backend/Dockerfile` using `backend` as the context; the generated frontend-dist directory is included in the image.
3. Configure NODE_ENV=production, HOST=0.0.0.0, MONGODB_URI, APP_ORIGIN (exact HTTPS origin, no trailing slash) and SHIPPING_FEE_PIASTRES. Allow only the host's documented egress IPs in Atlas; do not default to worldwide access. Keep Atlas credentials scoped to this database.
4. Create a transactional email account and verify a sender/domain. Brevo SMTP is one compatible example: https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP . Set SMTP_HOST/PORT/USER/PASSWORD and MAIL_FROM. Use the provider's exact values, not guessed credentials. Domain authentication guidance: https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC . Verify actual delivery of a verification and reset email before launch.
5. Register and verify your own store account. From a trusted shell with the store database configuration, run `npm run make-admin -- your-email@example.com`. No account has been promoted automatically.
6. Add real products, images, prices and stock through the Admin view. Remove or archive demo products. Supply actual store contact, shipping and return policies before accepting real orders.
7. Verify cookies are Secure over HTTPS and that registration, email verification, password recovery, checkout, cancellation and admin fulfillment work on the live domain. For a reverse proxy, set TRUSTED_PROXY_IPS to its verified comma-separated exact IP addresses. Leave it empty locally. Blanket trust and hop counts are rejected. The rate limiter is single-process: configure a shared store before horizontal scaling. Prevent direct public access around a trusted proxy.

## Online payments

The app accepts cash on delivery only. No card form or simulated card success is provided. Paymob offers an Egypt integration path: https://developers.paymob.com/paymob-docs/getting-started/overview . Actual integration requires an owner merchant account, the enabled payment methods, test/live credentials and the provider's webhook verification configuration. Payment integration is not implemented or live-tested yet. Merchant onboarding may require business/identity verification and agreement acceptance by the owner.

Once a provider is selected, implement server-created payment amounts, authenticated callbacks, transaction/order binding, replay protection, pending-payment expiry, stock release and reconciliation, then test provider success/failure/cancellation before enabling live mode. A browser redirect alone must never mark an order paid.

## What has been verified locally

- HTTP integration tests on isolated MongoDB replica-set databases, including concurrent checkout and account recovery.
- No live transactional emails, payment requests or public deployment have been performed.
- `.env`, `.env.atlas`, `.env.local`, dependencies and test databases are excluded from Git; Docker excludes secret files too.
