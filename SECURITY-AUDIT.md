# Security Audit pnp-art-works

**Date:** 2026-08-19
**Scope:** `server/` (Express + Mongoose API), `client/` (storefront), `admin/` (console)

This file documents what was found, what was fixed in code, and what **you** still
need to do by hand. The remaining actions cannot be done for you they involve
rotating live credentials and rewriting git history.

---

## 🔴 CRITICAL requires your action now

### 1. Live secrets are committed to git and pushed to GitHub

All three `.env` files are **tracked in git**, despite `.gitignore` containing `.env`
(gitignore does not apply to files already tracked). They exist across many commits
and the repo has a remote at `github.com/apiratla4/pnp-art-works`.

Exposed keys in `server/.env`:

| Key | Impact if leaked |
|---|---|
| `MONGODB_URI` | Full read/write on the production database |
| `JWT_SECRET` | Forge admin session tokens at will |
| `PAYPAL_CLIENT_SECRET` | Act as your PayPal merchant account |
| `CLOUDINARY_API_SECRET` | Full control of your media library |
| `EMAIL_USER` / `EMAIL_PASS` | Send mail as you; likely mailbox access |

**Assume every one of these is compromised.** Do this, in order:

1. **Rotate all of them now** new DB user + password, new `JWT_SECRET` (this signs
   out all admins, which is intended), new PayPal secret, new Cloudinary secret, new
   email app password.
2. Untrack the files (keeps them on disk):
   ```bash
   git rm --cached server/.env client/.env admin/.env
   printf '\n.env\n.env.*\n!.env.example\n' >> .gitignore
   git commit -m "chore: stop tracking .env files"
   ```
3. Purge them from history with [`git filter-repo`](https://github.com/newren/git-filter-repo)
   or BFG, then force-push. **Rotation is what actually protects you** history
   purging only limits further spread, and forks/clones may already exist.
4. Commit `.env.example` files listing key *names* only, so setup stays documented.

> Rotation and history rewriting are deliberately left to you: both are destructive
> and irreversible, and force-pushing affects anyone else working on this repo.

---

### 2. The entire admin API was unauthenticated **FIXED**

`authenticateJWT` existed but was wired to exactly one route (`/api/auth/me`).
Every other endpoint was open to the public internet. Anyone who knew the API URL
could, without logging in:

- `GET /api/orders` dump **every customer order**: names, emails, phone numbers,
  full shipping addresses. A straightforward personal-data breach.
- `GET /api/newsletters/subscribers/export` download your whole mailing list as CSV.
- `GET /api/store-pickup-orders` more customer contact details.
- `POST /api/coupons` mint themselves a 100%-off coupon.
- `POST|PUT|DELETE` on products, classes, gallery, hero sliders, testimonials —
  deface or wipe the storefront.
- `PATCH /api/orders/:id` alter order statuses.

**Fixed** by splitting each router into genuinely-public reads and authenticated
writes/admin-reads:

| Route file | Left public | Now requires auth |
|---|---|---|
| `products.routes.js` | `GET /`, `GET /:id` | POST, PUT, DELETE |
| `orders.routes.js` | `POST /` (checkout), `GET /ref/:referenceId` (customer tracking), PayPal capture/webhook | `GET /`, `GET /:id`, `PATCH /:id` |
| `coupon.routes.js` | `GET /validate/:code` | list, create, update, status, delete |
| `newsletter.routes.js` | subscribe, subscriber-exists, claim-coupon | subscribers, export, all campaign routes |
| `classes.routes.js` | `GET /`, `GET /:id` | POST, PUT, DELETE |
| `gallery.routes.js` | `GET /` | POST, PATCH, DELETE |
| `heroSlider.routes.js` | `GET /` | POST, PATCH, DELETE |
| `testimonials.routes.js` | `GET /` | POST, PUT, DELETE |
| `storePickup.routes.js` | `POST /` (checkout) | list, get, update, delete |

**Verify after deploying** this should return 401, not data:
```bash
curl -i https://<your-api>/api/orders
```

---

### 3. Anyone could create an admin account **FIXED**

`POST /api/auth/admin/register` had no guard whatsoever. Any visitor could create a
full admin and take over the console.

**Fixed** in `auth.controller.js`: the first admin may still self-register so the
system can be bootstrapped; once one exists, the caller must already be an
authenticated admin. Minimum password length is now enforced at 12 characters
server-side (the register form matches, and shows a strength meter).

Also added a dedicated rate limiter on `/login` and `/admin/register` (10 attempts /
15 min, successful ones not counted) the global limit of 100/15min was far too
loose for credential endpoints.

---

## 🟠 HIGH not fixed, needs a decision from you

### 4. Order totals are trusted from the browser

`paypal.controller.js` passes `totals` and each `item.price` straight from
`req.body` into the PayPal order. Nothing recalculates them server-side.

A customer can intercept the request and set `grandTotal` to `0.01`, and the payment
will be created and captured for that amount.

**The fix** (deliberately not applied, because it changes checkout behaviour and
needs testing against real PayPal sandbox flows): in `paypalCreateOrderController`,
ignore client prices entirely. Re-read each `productId` from Mongo, use the stored
`price`/`salePrice`, re-apply the coupon by looking it up server-side, recompute
shipping, and only then build the PayPal order. Treat the client's numbers as a
display hint to be verified, never as input.

The same applies to `POST /api/orders` and `POST /api/store-pickup-orders`, which
persist client-supplied `total` values.

### 5. No input validation layer

No `zod`, `joi`, or `express-validator` anywhere. Controllers read `req.body`
directly. Mongoose schema types are the only guard, which does not cover string
length, format, or unexpected fields. Worth adding a validation middleware before
this grows further.

### 6. Runtime dependencies are in `devDependencies`

`server/package.json` lists `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`,
`helmet`, `cors`, `morgan`, `cookie-parser`, `express-rate-limit` under
**devDependencies**. A production install (`npm ci --omit=dev`) would not install
them and the server would fail to boot. Move them to `dependencies`.

There is also no `package-lock.json` in `server/`, so builds are not reproducible
and `npm audit` cannot run. Generate and commit one.

---

## 🟡 MEDIUM

| # | Finding | Note |
|---|---|---|
| 7 | `PAYPAL_CLIENT_SECRET` is read but the webhook fetches a **fresh OAuth token on every event** | Works and is correctly verified against PayPal's API but cache the token; it's a rate-limit and latency risk under load. |
| 8 | Error responses leak internals | `paypal.controller.js` returns `err.response.data` to the client on failure. Log it server-side; return a generic message. |
| 9 | No CSRF protection on cookie auth | Because the API accepts the `token` cookie, a cross-site form post could act as a signed-in admin. `SameSite=None` in production makes this reachable. Prefer Bearer-only for the admin console, or add CSRF tokens. |
| 10 | Uploaded file size/type unenforced server-side | `custom.order.routes.js` uses `upload.single('reference')` with no `limits` or `fileFilter`. The client now validates 10MB/PNG-JPG-WebP, but clients can be bypassed. Add multer `limits` + `fileFilter`. |
| 11 | `helmet()` uses defaults | No explicit CSP. Consider configuring `contentSecurityPolicy` once the asset origins (Cloudinary, PayPal, Google Fonts) are known. |

---

## ✅ Already sound

- Passwords hashed with bcrypt (cost 12 in production).
- Session cookie is `httpOnly`, `secure` in production, with `SameSite` set.
- PayPal webhook signature **is** properly verified against PayPal's API before the
  event is processed this was done correctly.
- `helmet`, `cors` with an explicit origin allowlist, and a global rate limiter are
  all present.
- `x-powered-by` disabled; `trust proxy` set appropriately per environment.
- Login returns an identical message for unknown-email and wrong-password, so the
  form cannot be used to enumerate accounts.

---

## Suggested order of work

1. Rotate every credential in §1. **Today.**
2. Deploy the auth fixes (§2, §3) and run the `curl` check above.
3. Untrack `.env`, then purge history and force-push (§1).
4. Move server deps out of `devDependencies` and commit a lockfile (§6).
5. Recompute order totals server-side (§4).
6. Add request validation (§5), then work through the medium findings.
