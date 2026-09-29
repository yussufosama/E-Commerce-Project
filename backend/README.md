# Triple-Seven backend

Node.js 24, Express 5 and MongoDB/Mongoose API for an Egyptian streetwear store. Includes customer authentication, admin products and inventory, carts, and transactional cash-on-delivery orders. A responsive storefront and admin interface are included at the server root URL.

## Run

From the project root or backend folder:

```powershell
npm run dev
```

Startup reports the database connection and server URL. Stop with Ctrl+C. Do not run a second copy on the same port. The existing local `.env` connects to Atlas. For a fresh checkout, run `npm ci` inside both `backend` and `frontend`, copy `.env.example` to `.env`, then supply your database URI. Run `npm run dev` from the repository root to build React before starting the API. If starting directly inside backend, build the frontend from the root first. Never commit credentials.

## Configuration

| Variable | Meaning |
| --- | --- |
| MONGODB_URI | Private MongoDB connection string, including database name |
| PORT | HTTP port; default 5000 |
| HOST | Bind address; default 127.0.0.1 |
| TRUSTED_PROXY_IPS | Optional comma-separated exact reverse-proxy IP addresses; empty means no proxy trust |
| NODE_ENV | Set to production when deploying with HTTPS |
| APP_ORIGIN | Exact browser origin, e.g. http://127.0.0.1:5000; HTTPS required in production |
| SHIPPING_FEE_PIASTRES | Required for checkout; integer piastres, e.g. 5000 means EGP 50 |

Shipping is a single configurable fee for Egypt. There is no invented live shipping rate. Missing configuration returns a clear 409 and leaves cart/stock intact. The quote includes shipping; checkout must confirm both the current subtotal and total. Prices are final configured item prices; tax calculation and courier integration are not implemented.

Atlas supports the transactions used for orders and password changes. A standalone local MongoDB cannot run these operations; use Atlas or a local replica set.

## Structure

```text
src/
  config/env.js
  database/
    connection.js
    model/
      product.model.js
      user.model.js
      session.model.js
      cart.model.js
      order.model.js
  middleware/
    auth.middleware.js
    error.middleware.js
  module/
    product/  # Catalog + admin routes, controllers and services
    user/     # Registration, sessions, validation and password hashing
    cart/     # Customer cart routes, controllers and services
    order/    # Checkout, order history and fulfillment
  utils/http-error.js
  app.js
  main.js
```

Request flow: route -> controller -> service -> Mongoose model -> MongoDB. Controllers handle HTTP; services perform business operations. All files use JavaScript modules.

## Authentication and request rules

Authenticated requests use the session cookie returned by login. The token is never returned in JSON. Clients must retain cookies (PowerShell WebSession, Postman cookie jar, or same-origin browser fetch). Sessions expire after eight hours. Registration always responds identically for new and existing email addresses; it does not automatically log in. Request a verification email after registration. Email verification is required before login, including locally.

Every modifying request under users, cart, orders and admin must send:

```text
Content-Type: application/json
X-Requested-With: TripleSeven
```

Send `{}` for logout, cancel and delete requests. Browser Origin must match APP_ORIGIN. No cross-origin frontend access is enabled: host the frontend and API behind the same origin for this version. API clients without an Origin header can use the custom header normally.

Passwords require at least 15 characters and at most 256 UTF-8 bytes. Do not reuse the example password in real accounts. Admin roles cannot be set through registration or profile input.

## Endpoints

| Method | Endpoint | Access / purpose |
| --- | --- | --- |
| GET | /api/health | Public, database readiness |
| GET | /api/products | Public active catalog; page, limit, optional category |
| GET | /api/products/:slug | Public active product |
| POST | /api/users/register | name, email, password |
| POST | /api/users/login | email, password; sets session cookie |
| GET | /api/users/me | Current authenticated profile |
| POST | /api/users/logout | Revoke current session |
| POST | /api/users/logout-all | Revoke all current sessions |
| POST | /api/users/change-password | currentPassword, newPassword; logs out all sessions |
| GET | /api/cart | Customer cart with current prices and availability |
| PUT | /api/cart/items | productId, size, color, quantity; sets absolute quantity, 0 removes |
| DELETE | /api/cart | Clear own cart |
| GET | /api/orders/quote | Own cart, shipping and current total |
| POST | /api/orders | Checkout own cart; see body below |
| GET | /api/orders | Own paginated order history |
| GET | /api/orders/:id | Own order only |
| POST | /api/orders/:id/cancel | Cancel own pending order and restore stock |
| GET | /api/admin/products | Admin catalog including archived products |
| POST | /api/admin/products | Create a product |
| PATCH | /api/admin/products/:id | Update product metadata, price, active flag |
| PATCH | /api/admin/products/:id/inventory | size, color, adjustment; atomic signed stock delta |
| DELETE | /api/admin/products/:id | Archive product, preserve order history |
| GET | /api/admin/orders | All orders, paginated |
| GET | /api/admin/orders/:id | View an order |
| PATCH | /api/admin/orders/:id/status | Set next allowed fulfillment status |

Pagination defaults: page 1, limit 12; max limit 48. Categories: t-shirts, hoodies, pants, accessories. Prices use integer piastres: 65000 means EGP 650.

Product creation requires name, slug, description, category, pricePiastres and variants. Each variant has size, color and stock. Optional images are HTTPS URLs (max ten), not uploaded files. Variant size/color identities remain fixed after creation so cancellations can safely restore stock; use the inventory endpoint for stock changes and create another product for a changed variant lineup.

Checkout requires an `Idempotency-Key` header (a new UUID per intended order). Retry a failed network request with the same key and same body to avoid duplicate orders. A different body with a reused key is rejected.

```json
{
  "address": {
    "name": "Customer Name",
    "phone": "01012345678",
    "governorate": "Cairo",
    "city": "Cairo",
    "street": "Street, building, floor and apartment",
    "country": "EG"
  },
  "paymentMethod": "cash_on_delivery",
  "expectedSubtotalPiastres": 65000,
  "expectedTotalPiastres": 70000
}
```

Use the actual amounts from `/api/orders/quote`. The server computes all prices from stored products; client totals only confirm the customer has seen the current price. Cart ownership, item availability and stock are rechecked inside the transaction. Cart clearing, stock decrement and order creation commit together. A cart does not reserve stock.

Fulfillment sequence: pending -> confirmed -> shipped -> delivered. Admin can cancel pending or confirmed orders. Customers can cancel pending orders only. Delivered COD orders are marked paid, so only mark delivered after collecting payment. Shipped/delivered orders cannot be cancelled; returns and refunds are a future workflow.

## First admin

1. Register your account through the storefront or API and verify its email.
2. From the backend folder run:

```powershell
npm run make-admin -- your-email@example.com
```

This explicitly promotes that existing account. It is a local operator command, never a public API endpoint. No default admin account or password is created. Existing sessions use the current database role on each request.

## Quick PowerShell example

```powershell
$base = 'http://127.0.0.1:5000'
$headers = @{ 'X-Requested-With' = 'TripleSeven' }
# Use your own email/password; avoid sharing terminal history containing secrets.
$body = @{ name = 'Your Name'; email = 'you@example.com'; password = 'Choose your own long passphrase' } | ConvertTo-Json
Invoke-RestMethod "$base/api/users/register" -Method Post -Headers $headers -ContentType 'application/json' -Body $body
$login = @{ email = 'you@example.com'; password = 'Choose your own long passphrase' } | ConvertTo-Json
Invoke-RestMethod "$base/api/users/login" -Method Post -Headers $headers -ContentType 'application/json' -Body $login -SessionVariable shopSession
Invoke-RestMethod "$base/api/users/me" -WebSession $shopSession
```

For subsequent requests, reuse `-WebSession $shopSession`. See `docs/requests.http` for the complete shopping flow and request bodies.

## Tests

```powershell
npm test
```

The test runner launches the installed `mongod` in a private temporary directory on a loopback port, initializes a test-only replica set, runs HTTP integration tests, and shuts it down. It never reads `.env` or uses the Atlas application URI. It uses randomly named `triple_seven_test_*` databases only.

If mongod is not on PATH, set MONGOD_BINARY to its executable path. Alternatively, explicitly supply TEST_MONGODB_URI for a dedicated test replica set. Tests must have permission to create/drop their temporary databases. Never use application credentials for testing.

Tests cover auth validation, password hashing, session expiry/revocation, CSRF, rate limits, role restrictions, owner isolation, stock rollback, competing buyers, duplicate checkout requests, cancellation and fulfillment.

## Security and deployment limits

- Passwords use scrypt with unique salts and bounded simultaneous hashing. Sessions use random 256-bit tokens; only SHA-256 token hashes are stored.
- Cookies are HttpOnly and SameSite=Strict; production uses Secure and the __Host- prefix. Production startup requires an HTTPS APP_ORIGIN.
- JSON body limit is 20 KB. Input allowlists prevent role/money mass assignment and MongoDB operator injection. Database details stay out of error responses.
- Global requests and authentication attempts are rate-limited by IP; login/register also by normalized email. Limits are in memory for this single-process version. Configure a shared limiter store before horizontal scaling. Do not blindly enable trust proxy; configure it for your actual deployment to preserve trustworthy client IPs.
- Deploy behind HTTPS, restrict Atlas network access, use a database user limited to the store database, and configure backups and monitoring before public launch. Keep `.env*` secret; only `.env.example` belongs in Git.
- Email verification and forgotten-password recovery are implemented, with a persisted email queue and three bounded delivery attempts; configure SMTP to deliver real mail. Online payments, image uploads, courier integration, and returns/refunds are not included. Docker deployment files are prepared but not deployed. No payment success is simulated. Recovery links expire after 15 minutes and verification links after 60 minutes. Tokens are stored only as hashes, can be used once, and invalidate existing sessions when consumed.
- This is the complete first-version COD shopping flow, not a guarantee of perfect security or a production security audit.

Startup waits for the product and account/order indexes before accepting requests. Order responses omit internal idempotency keys and request hashes. For a reverse-proxy deployment, set `TRUSTED_PROXY_IPS` only to verified proxy addresses and prevent direct access around that proxy. Boolean trust and hop counts are deliberately rejected. See [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/). The limiter remains single-process; this setting does not add distributed rate limiting.

Implementation references: [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [Mongoose transactions](https://mongoosejs.com/docs/transactions.html).


## Storefront and account emails

Open http://127.0.0.1:5000 for the store. Account, verification, password reset, cart, checkout, order history and admin product/order controls use the same API and origin. Product photo placeholders are deliberate until you add real product images. The seeded collection is sample content, not a real inventory commitment.

Additional email endpoints (same JSON + X-Requested-With security headers):

| Method | Endpoint | Body |
| --- | --- | --- |
| POST | /api/users/request-verification | email |
| POST | /api/users/verify-email | token, newPassword |
| POST | /api/users/forgot-password | email |
| POST | /api/users/reset-password | token, newPassword |

Set SMTP_HOST, SMTP_PORT (587 with STARTTLS or 465 with implicit TLS), SMTP_USER, SMTP_PASSWORD, MAIL_FROM and APP_ORIGIN in private environment configuration. No email is sent until configured. TLS certificate checks stay enabled. APP_ORIGIN is used for links instead of request Host headers. Links keep tokens in the URL fragment so they do not appear in HTTP access logs; the page removes the fragment before submitting the token.

The persisted queue separates HTTP response timing from account lookup and SMTP delivery. Jobs expire after a day and try at most three times. A process restart does not lose queued requests. Only configure a transactional sender you control. Tests capture mail in memory and send no actual emails.

## Deployment

See docs/launch.md for the concrete account and deployment checklist. Run `npm run check:launch` from backend to check missing settings without displaying secrets. A nonzero result means configuration is incomplete. The Dockerfile uses a non-root Node.js runtime and excludes local secrets. Docker image execution has not been verified on this computer because Docker is unavailable.

