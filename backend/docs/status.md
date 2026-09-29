# Backend delivery status

## Implemented first version

- Customer registration, verified-email login, session cookies, logout, password change and recovery.
- Admin-only catalog editing, product archiving and atomic variant inventory adjustments.
- Customer carts with live prices and stock availability.
- Cash-on-delivery checkout with server-calculated totals, shipping configuration, transactional stock updates and idempotent retries.
- Customer order history and pending-order cancellation; admin fulfillment and stock restoration.
- Persisted account-email queue with bounded retries and expiring single-use tokens.
- Request validation, CSRF checks, rate limiting, owner/role checks and security headers.
- Readiness endpoint, startup index initialization, explicit proxy configuration, Dockerfile and isolated integration tests.

## Pending owner setup

Shipping price and admin email are not decided. SMTP credentials and a public HTTPS origin are not configured. No live email delivery or public deployment has been verified. Do not enable real checkout with an invented shipping fee or bypass email verification.

Run `npm run dev` to start locally, `npm test` for isolated tests and `npm run check:launch` to report missing launch configuration without displaying secrets.

## Outside this first version

Online card/wallet payments, courier integration, image uploads, tax calculations and returns/refunds require further implementation. Current product images use HTTPS URLs and payments use cash on delivery. No payment provider or account setup has been selected on the owner's behalf.
