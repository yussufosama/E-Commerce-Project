# Triple-Seven React storefront

The visual reference is the owner's streetwear-store video, not the Lovable marketing homepage. The supplied 777 cube logo is used unchanged. The editorial hero is an AI-generated concept; catalog photographs come from each product's `images` array. Missing photographs are labeled placeholders, not invented merchandise.

## Run

Install dependencies with `npm ci` in both `backend` and `frontend`. From the repository root, run `npm run dev`. This builds React and starts the Node server. Open **http://127.0.0.1:5000/**; opening `frontend/index.html` directly as a file will not work.

After editing React, run `npm run build` and refresh the browser. The frontend development command is intended for visual work; use the same-origin port 5000 build for authentication and checkout, because the API enforces APP_ORIGIN. Do not weaken that check for development.

## Structure

- `src/App.jsx`: page shell, navigation, hero, manifesto, footer and shared session state.
- `src/components/Catalog.jsx`: live collection, categories, product detail and variant selection.
- `src/components/Account.jsx`: sign-in, registration, verification, recovery and password changes.
- `src/components/Bag.jsx`: saved cart, shipping quote and retry-safe checkout.
- `src/components/Orders.jsx`: order history and cancellation.
- `src/components/Admin.jsx`: catalog, photos, prices, stock and fulfillment.
- `src/components/Shared.jsx`: dialogs, fields, resource loading and image fallback.
- `src/api.js`: same-origin API requests and EGP formatting.
- `src/styles.css`: responsive black-and-cream visual styling.

Backend prices, stock, authorization and totals remain authoritative. Checkout retains its original idempotency key and request body after an uncertain response. The account dialog never bypasses email verification.

The reference newsletter section is currently an account invitation, because no newsletter delivery service is configured. Shipping rates and account email delivery also remain pending owner setup. The existing three sample products have not been renamed or assigned fabricated photos to mimic the reference's four products.

## Build and deployment

`npm run build` outputs to `backend/frontend-dist`. Express serves those files. `/shop.html` redirects to the new storefront. Build React before packaging the backend Docker image. `npm test` at the repository root builds React and then runs the isolated backend integration tests.

Format source with `npx prettier --write src` from this folder.
