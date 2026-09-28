# Triple-Seven backend

First working backend slice for the Egyptian streetwear store: Express 5 + MongoDB + Mongoose, using JavaScript modules and Node.js 24.

## Run locally

From this folder:

```powershell
npm install
Copy-Item .env.example .env
npm run seed
npm run dev
```

MongoDB must be running locally. To use another database, change `MONGODB_URI` in `.env`. Never commit `.env` or paste database passwords into chat. The seed inserts three sample products only if their slugs do not already exist. It does not delete or replace existing products. Names, prices and stock are demonstration values.

Open http://127.0.0.1:5000/api/health or http://127.0.0.1:5000/api/products.

## Available endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Database readiness; returns 503 when disconnected |
| GET | `/api/products?page=1&limit=12&category=t-shirts` | Paginated active catalog; category is optional |
| GET | `/api/products/777-oversized-tee` | One active product by slug |

Categories: `t-shirts`, `hoodies`, `pants`, `accessories`. Maximum page size: 48.

Prices are stored in integer **piastres**, so `65000` means **EGP 650.00**. Format prices in the frontend with `Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(product.pricePiastres / 100)`.

## Folder structure

```text
backend/
├── src/
│   ├── config/
│   │   └── env.js
│   ├── database/
│   │   ├── model/
│   │   │   └── product.model.js
│   │   └── connection.js
│   ├── middleware/
│   │   └── error.middleware.js
│   ├── module/
│   │   └── product/
│   │       ├── product.routes.js
│   │       ├── product.controller.js
│   │       ├── product.service.js
│   │       └── product.validation.js
│   ├── app.js
│   └── main.js
├── scripts/seed.js
├── test/products.test.js
├── .env                  # Local settings; ignored by Git
├── .env.example          # Safe settings template
├── .gitignore
├── package.json
└── package-lock.json
```

## How a request moves through the code

`route → controller → service → model → MongoDB`

- **Routes** map URLs to controller functions.
- **Controllers** validate HTTP input and send HTTP responses.
- **Services** query products and prepare results without using Express `req` or `res`.
- **Validation** parses pagination, categories and slugs before they reach a service.
- **Models** define stored fields and Mongoose validation, including stock per size/color.
- **Middleware** handles missing routes and unexpected errors consistently.

`main.js` reads server settings from `config/env.js`, connects through `database/connection.js`, and starts the server. `app.js` assembles Express without opening a port, so tests can run it independently. `scripts/seed.js` supplies example data. Node loads `.env` natively; no extra environment library is needed. Keep local settings in `.env`; production can supply environment variables without a committed production secrets file.

New features follow the same pattern: for example, user HTTP code will go under `module/user/` and its model under `database/model/user.model.js` when authentication is implemented.

## Tests

```powershell
npm test
```

Tests require local MongoDB. They start an HTTP server on an automatically assigned port, use a unique `triple_seven_test_*` database, then drop only that test database. They do not use `MONGODB_URI` or touch the store database. Optionally set `TEST_MONGODB_URI` to a dedicated test MongoDB server whose credentials permit creating and dropping test databases.

## Next development steps

This is a local product API, not a complete checkout backend yet. Next: authentication and admin authorization, protected product editing, carts, orders with stock checks, and payment integration. No public product-write endpoints are exposed before authentication is implemented. The server binds to loopback by default; deployment and frontend CORS configuration come later.

References: [Express error handling](https://expressjs.com/en/guide/error-handling/) and [Mongoose connections](https://mongoosejs.com/docs/connections.html).
