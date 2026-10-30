# EcoConnect — Audit Fix Log

This log records what was changed in response to the **EcoConnect Thesis Defense Master Document** (audit dated October 5, 2026). Each row uses the audit's own item numbers so a reader can trace every finding to its fix and the evidence that it works.

**How the work was done**

1. **Read the audit against the code.** Each finding was checked in the source before anything changed. A few were worse than reported. For example, `verify_user` let *any* signed-in resident verify accounts, and the redemption endpoint trusted a points price sent by the browser, so a negative price would *add* points.
2. **Fixed the backend first.** Security and data-integrity problems live on the server, so they were fixed there rather than only hidden in the UI.
3. **Wrote a regression test for each fix** (`django_backend/api/tests.py`, 23 tests) and ran them. All pass.
4. **Rebuilt the sign-in UI** to the reference design and applied the frontend fixes (timeouts, token refresh, toasts, validation, 404 page, mobile tables).
5. **Verified:** `manage.py check` and `check --deploy` run, the frontend builds, the new files pass ESLint, and the pages were screenshotted at desktop and phone width (390 px) with no horizontal overflow.

Run the tests yourself: `cd django_backend && python manage.py test api`

---

## 🔴 Launch blockers (audit §5, items 1–10)

| # | Audit finding | What changed | Where | Verified by |
|---|---|---|---|---|
| 1 | `DEV_BYPASS_TOKEN` lets anyone skip auth and auto-login as admin (S1, A1) | Bypass header removed from all four AI endpoints; they now require a real login. Admin dashboard no longer creates a fake `Dev_Admin`; it asks the server who you are (`/api/auth/me`) and sends non-admins back to sign-in. | `views_ai.py`, `AdminDashboard.jsx`, `Dashboard.jsx`, `ChatWidget.jsx` | `DevBypassRemovedTests`; `grep DEV_BYPASS` returns nothing |
| 2 | `CORS_ALLOW_ALL_ORIGINS = True` (S2) | Off. Allowed origins come from the `CORS_ALLOWED_ORIGINS` env var; localhost:5173 is added only when `DEBUG=True`. Netlify proxies `/api`, so production needs no entry. | `settings.py` | `manage.py check` |
| 3 | `SECRET_KEY` falls back to a known string (S4) | No fallback in production: the server refuses to start if `SECRET_KEY` is missing and `DEBUG=False`. A dev-only key is used only when `DEBUG=True`. | `settings.py`, `Dockerfile` (build-only placeholder) | Starting with `DEBUG=False` and no key raises `ImproperlyConfigured` |
| 4 | Redemption race condition: stock can go negative (§4.3) | Redemption runs in one database transaction with row locks (`select_for_update`). Stock is decremented with a conditional `UPDATE … WHERE stock > 0`, and points with an `F()` expression. The price is read from the database, never from the request. | `views_extras.py` | `RedemptionTests` (last item redeemable once; client can't set price) |
| 5 | No pagination (API2) | Shared paginator: `?page=&page_size=` returns `{count, page, total_pages, results}`. Without `page`, lists are capped at 200 rows and the real total is sent in `X-Total-Count`, so the current dashboards keep working. | `pagination.py`; users, search, events, redemptions, expenses, transfers | `PaginationTests` |
| 6 | Role checks only inside each view; residents could call admin endpoints (P1, P2) | New DRF permission classes `IsBarangayAdmin` and `IsAdminForWrites` declared on every admin endpoint, so residents are rejected before the view runs. This also closed a hole where any resident could toggle another user's verification. | `permissions.py`, all `views_*.py` | `RoleEnforcementTests` (10 admin endpoints return 403 for a resident) |
| 7 | OTP codes never expire (S7) | Codes expire after 10 minutes. Codes are generated with `secrets` (cryptographic randomness), only 5 wrong guesses are allowed per code, and requests are rate-limited. | `views_auth.py`, `settings.py` | `OTPTests` |
| 8 | No HTTPS settings (S6) | When `DEBUG=False`: SSL redirect, secure session/CSRF cookies, HSTS, nosniff, referrer policy, and the proxy SSL header for Render/Railway. | `settings.py` | `manage.py check --deploy` |
| 9 | README describes Flask/MySQL (BL1–BL3) | README rewritten for Django/PostgreSQL with correct folders, setup steps, test command and production checklist. | `README.md` | — |
| 10 | No `.env.example` | Added, listing every variable the backend reads, with comments. | `django_backend/.env.example` | — |

## 🟡 High priority (audit §5, items 11–20)

| # | Audit finding | What changed | Where |
|---|---|---|---|
| 11 | No rate limiting (S5, API3) | DRF throttling: login 10/min, register 5/min, OTP 5/hour, reset 10/hour, plus general anon/user limits. **Account lockout** (A6): 5 failed logins lock that username + IP for 15 minutes. | `settings.py`, `views_auth.py` |
| 12 | No token refresh; users logged out after 24 h (A2) | Access token is now 60 minutes with a 7-day **rotating** refresh token. A central fetch wrapper refreshes the token automatically and retries the request once. | `settings.py`, `urls.py`, `frontend/src/lib/api.js` |
| 13 | Uploads not validated (S9) | Images are checked by their file signature (JPG/PNG/GIF/WEBP), must be under 5 MB, and can't be empty. A renamed `.html` or `.exe` is rejected. The same rules run in the browser before upload. | `storage_utils.py`, `auth/validation.js` |
| 14 | Double submits (§4.1) | Every auth form, event form and redemption action disables its button while the request runs. The server is also idempotent: attendance can't be verified twice and a claim can't be approved twice. | auth forms, `CreateEvent.jsx`, `EditEvent.jsx`, `AdminDashboard.jsx`, `views_events.py` |
| 15 | Admin tables cut off on mobile (§3.7) | The events table scrolls sideways inside its card, and redemption rows stack on narrow screens. | `AdminDashboard.jsx` |
| 16 | No 404 page (BL5) | Added a catch-all route and a 404 page. | `NotFound.jsx`, `App.jsx` |
| 17 | `.env` only loaded by `views_ai.py` (BL9) | `load_dotenv()` moved into `settings.py`, so every entry point (manage.py, WSGI, ASGI) reads it. | `settings.py` |
| 18 | Loading skeletons | **Not done.** See "Still open". | — |
| 19 | `alert()` popups | All `alert()` calls replaced with non-blocking toast notifications. | `lib/toast.js`, `components/Toast.jsx`, all pages |
| 20 | No PH phone validation | `09XXXXXXXXX` or `+639XXXXXXXXX` accepted on both client and server, and stored as `+639XXXXXXXXX`. | `validators.py`, `auth/validation.js` |

## Other audit items fixed along the way

| Audit ref | Fix |
|---|---|
| A4 | Login now receives the portal (`resident` / `admin`) and the **server** rejects the wrong role. |
| A5 | Admin dashboard trusts the server's `/auth/me`, not the editable `localStorage` copy. |
| A7 | Password reset looks up the user by phone **or** email consistently, so the OTP lookup and user lookup now match. Previously the reset form accepted email but the backend only searched by phone. |
| §3.4 | Password strength enforced with Django's validators, shown with a strength meter, and confirmed with a second field. Two-step sign-up form for mobile. |
| §4.2 | Event title ≤ 100, description ≤ 2000, points 1–500, date not in the past and within 2 years. Award points 1–500. Expense amount > 0. Incentive cost/stock bounds. Duplicate pending transfer requests blocked. |
| §4.3 | Double attendance verification awards points once (row lock + status check). Approving or rejecting a transfer or redemption twice is refused. |
| Flow 2 | Officials can now **reject** a redemption, which refunds the points and restocks the item, matching the audit's redemption flowchart. |
| P5 | Event edit/delete limited to the official's own barangay. New events are always created in the official's own barangay, whatever the request says. |
| S8 / #28 | Content-Security-Policy and Permissions-Policy headers from Django and from Netlify. |
| §3.10 | Public leaderboard returns only username, points, barangay, title and photo. Phone, email and ID image are no longer exposed. The officials contact list requires sign-in. |
| RA 10173 #1 | Sign-up requires explicit consent to the Data Privacy Policy. |
| §4.1 | Requests time out after 20 s (60 s for uploads) with a clear message, instead of spinning forever. |
| BL4, S10 | `start_app.bat` no longer mentions SQLite. `run.bat` sets `DEBUG=True` for local runs. |
| XSS audit | `dangerouslySetInnerHTML` is not used anywhere in the frontend. |

## UI redesign

The sign-in, sign-up, password reset, landing and 404 pages were rebuilt following the reference screenshots:

* White page with one narrow centered column, a large bold heading and a short subtitle
* Light grey inputs with labels above, "Forgot password?" beside the password label, and an eye toggle
* One solid green primary button. **No gradients anywhere in the app**: the remaining gradients in the dashboards, leaderboard and privacy modal were replaced with flat brand colors
* A **Resident / Barangay Official** switch takes the place of the reference's social-login buttons, so both portals share one design
* A terms and privacy line at the bottom that opens the RA 10173 notice
* Font: Plus Jakarta Sans. Brand green `#15803d` (green-700) for buttons, for readable contrast with white text

The resident and admin dashboards keep their existing layout and colors. Only their gradients, mobile tables, alerts and auth handling were changed.

---

## Still open (be ready to discuss these as future work)

| Item | Why it isn't fixed yet | Mitigation in place |
|---|---|---|
| **Anyone can register an official account for any barangay** | Public admin sign-up is part of the current design; restricting it needs a decision (invite code, approval by an existing official, or creation through the Django admin only). | Role is whitelisted (`resident`/`admin` only). Recommend gating before a real launch. |
| JWT kept in `localStorage` (S3) | Moving to HttpOnly cookies means reworking auth and CSRF on both sides. | 60-min tokens, rotating refresh, strict CSP, no `innerHTML`. |
| Government ID images not encrypted at rest (§3.10) | Needs a private bucket plus signed URLs, or server-side encryption. | Upload validation; only officials see ID images in the app. |
| Soft-delete for events (API4), optimistic locking for event edits | Both need a database migration. | Deleting an event reverses attendee points atomically. |
| "Delete my account", retention policy, DPO (RA 10173 #2–#7) | Policy decisions first, then code. | Consent captured at sign-up. |
| Loading skeletons (BL6), Redis caching, API versioning, PATCH, large-export streaming | Lower priority for the defense. | Exports use lighter queries; leaderboard is capped at 20 rows. |
| Login lockout counter is per server process | Uses Django's in-memory cache; with 2 Gunicorn workers each keeps its own count. | Throttling still applies; a shared cache (Redis/DB) would make it exact. |

## Deployment note ⚠️

Production now **refuses to start without `SECRET_KEY`**. Render already generates one (`render.yaml`). On **Railway**, confirm `SECRET_KEY` and `DEBUG=False` are set in the service's variables before deploying, or the backend will not boot.
