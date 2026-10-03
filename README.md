# Triple-Seven | Full-Stack E-commerce Platform

A streetwear e-commerce project for an Egyptian brand, built with React, Node.js, Express, MongoDB Atlas and Mongoose. Customers can browse products and place cash-on-delivery orders; staff can manage the catalog, inventory, orders and sales reports.

**Author:** Youssef Osama  
**Status:** In development. Bosta shipment booking, visitor tracking and production deployment are not complete.

## Features

- Responsive storefront with product details, size and colour variants, and a persistent customer cart.
- Registration, email verification, password recovery and SMTP email delivery (configured locally with Brevo).
- Cash-on-delivery checkout with server-calculated totals and a configurable shipping fee in EGP.
- MongoDB transactions for stock updates and order creation, with idempotency keys to prevent duplicate orders on retries.
- Admin-only dashboard for product details, image URLs, prices, inventory and order fulfilment.
- Sales analytics for 7, 30 or 90 days, previous-period comparisons, daily figures and top products.
- Bosta setup panel showing configuration readiness. It does **not** book shipments yet.

## Technology and architecture

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, CSS |
| Backend | Node.js 24+, Express 5, JavaScript ES modules |
| Database | MongoDB / Atlas, Mongoose |
| Account email | Nodemailer over SMTP; Brevo used during development |
| Tests | Node.js test runner and an isolated MongoDB replica set |

```text
frontend/
  src/components/        Storefront, account, cart, admin and analytics UI
  src/api.js             Same-origin API client
backend/
  src/config/            Environment, email and proxy configuration
  src/database/model/    Mongoose schemas
  src/module/            User, product, cart and order features
  src/middleware/        Authentication and error handling
  scripts/               Seed, admin setup and configuration checks
  test/                  API and business-flow tests
```

Request flow: **React → Express routes → controllers/services → Mongoose → MongoDB**. Prices, stock and permissions are enforced on the server.

## Run locally

### 1. Install

Install Node.js 24 or later and provide a MongoDB Atlas database or a local MongoDB **replica set**. A standalone MongoDB instance cannot run checkout transactions.

```powershell
git clone https://github.com/yussufosama/E-Commerce-Project.git
cd E-Commerce-Project
npm --prefix backend ci
npm --prefix frontend ci
Copy-Item backend/.env.example backend/.env
```

### 2. Configure the backend

Edit `backend/.env` privately:

| Setting | Purpose |
| --- | --- |
| `MONGODB_URI` | Your database connection URI, including the database name |
| `APP_ORIGIN` | `http://127.0.0.1:5000` for this local setup |
| `SHIPPING_FEE_PIASTRES` | Your chosen shipping fee; `5000` means EGP 50 (example only) |
| `SMTP_HOST`, `SMTP_PORT` | Your email provider's SMTP server and port |
| `SMTP_USER`, `SMTP_PASSWORD` | Private SMTP credentials |
| `MAIL_FROM` | A sender authorized by your email provider |

Real SMTP delivery is needed to verify accounts and sign in. This repository includes no shared admin credentials, production secrets or email verification bypass.

```powershell
npm --prefix backend run check:email
npm run dev
```

Open **http://127.0.0.1:5000/**. The root development command builds React and starts the backend. After frontend edits, run `npm run build` and refresh. Do not open the HTML file directly.

### 3. Create your admin account

Register on the website, request a verification email, and complete verification. Then run:

```powershell
npm --prefix backend run make-admin -- your-email@example.com
```

Sign in with your own password and open `http://127.0.0.1:5000/#admin`.

Optional: populate your own development database with sample products using `npm --prefix backend run seed`.

## Testing

```powershell
npm test
```

The runner starts an isolated local MongoDB replica set and uses randomly named test databases. Install the `mongod` binary on PATH, set `MONGOD_BINARY` to its executable path, or provide `TEST_MONGODB_URI` pointing to a dedicated test replica set.

The most recent verified run passed **43 tests**, covering access control, account flows, checkout retries, concurrent stock updates, cancellation, analytics, configuration privacy and other API behaviours. The React production build also passed. These checks do not constitute a production security audit.

## Security measures

- Scrypt password hashing and server-side sessions with HttpOnly, SameSite cookies; Secure cookies in production.
- Verified email required for login; current database roles checked for admin access.
- Input validation, authentication rate limits, browser request protections and security headers.
- Backend-only provider credentials; local environment files excluded from Git.

## Analytics definitions

Reports use order creation dates in UTC, including the current partial day, and exclude cancelled orders. Product sales and average order value exclude shipping and include unpaid orders. Collected payments include shipping for paid orders created in the selected period; they are not a report of cash receipt dates. Traffic sources, sessions and conversion rates are not tracked yet.

## Remaining work

- Complete Bosta shipment creation, tracking and pickup workflows, then validate against a configured business account.
- Choose and configure the actual shipping fee and replace sample products with real inventory.
- Complete live checkout acceptance testing, production hosting, HTTPS, branded sender authentication and store policies.
- Add online payment processing and visitor analytics if required; neither is implemented today.

## CV / portfolio description

> Developed a full-stack streetwear e-commerce project using React, Node.js, Express and MongoDB. Implemented verified customer accounts, cash-on-delivery checkout, transactional inventory updates, role-based administration and sales analytics. Validated key workflows with 43 automated tests. Bosta integration and deployment remain in progress.

Built as a learning and portfolio project, using Codex as a development assistant for implementation, troubleshooting and code explanations. Editorial imagery includes AI-generated assets; see [asset notes](frontend/ASSETS.md).

Further documentation: [backend](backend/README.md), [frontend](frontend/README.md), [launch checklist](backend/docs/launch.md).
