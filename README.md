# EcoConnect

EcoConnect is a community web app that gamifies ecological activities in the barangays of Puerto Princesa, Palawan. Residents join cleanup drives and earn **Eco-Points** that they redeem for barangay rewards. Barangay officials create events, verify residents and attendance, and manage the reward inventory.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Lucide icons, React Leaflet (OpenStreetMap) |
| Backend | Django 5 + Django REST Framework |
| Auth | JWT via SimpleJWT (60-min access token, 7-day rotating refresh token) |
| Database | PostgreSQL (SQLite is not supported in production) |
| File storage | Supabase Storage, with local `static/uploads/` fallback |
| Email | Django SMTP (Gmail) for password-reset codes |
| AI assistant | Google Gemini (optional; rule-based fallback without a key) |
| Deployment | Docker → Render / Railway (backend), Netlify (frontend) |

## Project layout

```
django_backend/          Django project
  api/                   models, views, permissions, validators, tests
  ecoconnect_core/       settings, URLs, WSGI
  .env.example           every environment variable the backend reads
frontend/                React app (Vite)
  src/components/auth/   shared sign-in / sign-up / reset UI
  src/lib/               fetch wrapper (timeouts + token refresh), toasts
docs/                    ERD, audit fix log
```

## Local setup

### Prerequisites
* Python 3.12+
* Node.js 20+
* A PostgreSQL database (local install, Docker, or a free cloud instance)

### 1. Backend
```bash
cd django_backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env         # macOS/Linux: cp .env.example .env
```
Edit `.env` and set at least `DATABASE_URL` and `DEBUG=True`. Then:
```bash
python manage.py migrate
python manage.py createsuperuser   # optional: Django admin at /backend-admin/
python manage.py runserver 8000
```
On Windows you can run `run.bat` instead (it creates the venv, migrates, and starts the server with `DEBUG=True`).

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. Vite proxies `/api` and `/static` to the backend on port 8000.

### 3. First accounts
Barangay official accounts **cannot sign up in the app**; the superuser creates them.

1. Create the superuser: `python manage.py createsuperuser`
2. Create an official, either:
   - in Django admin at **/backend-admin/** → Users → *Add user* (choose role "Barangay official" and the barangay), or
   - from the terminal:
     ```bash
     python manage.py create_official --username kap.santamonica --email kap@example.com --phone 09171234567 --barangay "Santa Monica"
     ```
3. Go to **/signup** and register a resident in the same barangay (an ID photo is required).
4. Sign in as the official at **/login-Barangay** and verify the resident.

## Running the tests
```bash
cd django_backend
python manage.py test api
```
The suite covers the security and data-integrity fixes listed in [docs/AUDIT_FIXES.md](docs/AUDIT_FIXES.md): role enforcement, login lockout, OTP expiry, upload validation, redemption race conditions, double attendance verification, input limits, pagination, and leaderboard privacy.

## Production checklist
* `DEBUG=False`
* `SECRET_KEY` set to a long random value (the server will not start without it)
* `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS` set to your real domains
* `CORS_ALLOWED_ORIGINS` only if the browser calls the backend directly (not needed behind the Netlify proxy)
* `MAIL_USERNAME` / `MAIL_PASSWORD` set so password-reset codes can be emailed
* HTTPS is enforced automatically when `DEBUG=False`; set `SECURE_SSL_REDIRECT=False` only if your host already redirects and you see a redirect loop

## Key features
* **Two portals:** residents and barangay officials sign in separately; the server checks the role.
* **Gamified ecology:** verified attendance awards points; titles unlock as points grow.
* **Event tickets & QR attendance:** joining an event issues a ticket (QR code + short typed code) for that event only; officials scan or type it at the event to check residents in and award points. Events can have an optional participant limit. Officials can export an Excel attendance report (summary, attendees, no-shows).
* **Rewards:** residents redeem barangay-managed incentives; officials release or reject claims (rejections refund points and restock).
* **Event map:** Leaflet map of cleanup locations.
* **Barangay transfers:** residents request to move; the receiving barangay approves.
* **Reports:** Excel export of residents and event participants.
* **Privacy:** RA 10173 notice and explicit consent at sign-up; public leaderboard shows no contact details.

## Database schema
The current schema is defined by the Django models in `django_backend/api/models.py` and applied with `python manage.py migrate`. `docs/ERD.md` shows the relationships. `docs/database_schema.sql` is the original MySQL draft from the Flask prototype and is kept for reference only.
