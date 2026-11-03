# MediCare Connect

A full-stack **MERN** healthcare appointment & patient management system. Patients discover doctors, view real-time slot availability and book appointments; doctors manage their schedule, confirm/complete visits and add consultation notes.

**Stack:** React 18 (Vite, React Router, Axios) · Node.js · Express.js · MongoDB (Mongoose) · JWT auth

## Features

- **All-India doctor discovery** – live search by name/specialty/city, filters for state/UT, city and specialty, sort by fees or experience, paginated results. Demo data covers all 36 states and union territories.
- **Verified doctors only** – doctors register with their practice location and NMC / state medical council registration; they stay hidden from patients until an admin verifies them. Changing registration details sends a doctor back for re-verification.
- **Admin verification console** – pending / verified / rejected queues, link to the NMC Indian Medical Register for cross-checking, verify / reject (with reason) / revoke.
- **ABDM HPR check** – optional lookup of a doctor's Healthcare Professionals Registry ID through the Ayushman Bharat Digital Mission gateway.
- **Doctors ↔ hospitals** – a doctor can list the hospital they practise at (chosen from hospitals in their city in their profile). Hospital cards show how many MediCare Connect doctors work there, each hospital has a page listing its doctors by department, and doctor cards link back to their hospital.
- **Hospitals across India** – imports the National Health Portal hospital directory from data.gov.in (Open Government Data Platform India) with state/district filters, call and map links.
- **Patient & doctor registration** – role-based sign-up; JWT authentication with bcrypt-hashed passwords.
- **Continue with Google** – Google Identity Services sign-in; the backend verifies Google's ID token, creates a patient account on first use, and links to an existing account with the same verified email.
- **Forgot / reset password** – emailed single-use reset link (valid 15 min, only its SHA-256 hash is stored); resetting or changing a password signs out all other sessions.
- **Appointment scheduling** – slots generated from each doctor's weekly availability; booked and past slots are blocked. A unique partial MongoDB index prevents double-booking even under concurrent requests.
- **Patient dashboard** – upcoming/past appointments, stats, cancellation, doctor's notes.
- **Doctor dashboard** – confirm → complete workflow, cancel, add consultation notes, view patient details.
- **Profiles** – patient health profile (DOB, blood group, medical history); doctor professional profile, fees, slot duration and weekly availability editor.
- **Security** – Helmet, CORS, rate-limited auth routes, role-based route guards, field whitelisting on updates, centralized error handling.

## Project structure

```
Healthcare/
├── server/                 Express + Mongoose REST API
│   ├── config/db.js        MongoDB connection (falls back to in-memory DB)
│   ├── models/             User, Doctor, Appointment, Hospital schemas
│   ├── controllers/        auth, user, doctor, appointment, admin, hospital logic
│   ├── routes/             REST route definitions
│   ├── middleware/         JWT protect/authorize, error handler
│   ├── utils/              slots, India states/councils, data.gov.in import, ABDM client, email
│   ├── seedData.js         demo doctors (all states/UTs), patient & admin
│   ├── importHospitals.js  CLI: npm run import:hospitals
│   └── server.js           entry point
└── client/                 React (Vite) SPA
    └── src/
        ├── api/client.js   Axios instance + API calls
        ├── context/        AuthContext (JWT session)
        ├── components/     Navbar, DoctorCard, ProtectedRoute, …
        └── pages/          Home, Doctors, DoctorDetail, Hospitals, Admin, Login, Register, Dashboard, Profile, …
```

## Getting started

Requires **Node.js 22.15+**. The server runs with `--use-system-ca` so Node trusts the operating system's certificate store — needed when antivirus (e.g. Avast Web Shield) or a corporate proxy inspects HTTPS, otherwise Google sign-in fails with "unable to verify the first certificate".

```bash
npm run install:all
```

```bash
npm run dev
```

- Frontend: http://localhost:5173 (proxies `/api` to the backend)
- API: http://localhost:5000/api

`npm run dev` first stops anything an earlier run left behind (closing a terminal often leaves vite, the API or the local MongoDB running), so there is no need to `taskkill` node or mongod by hand. It only stops this project's processes; if another program holds port 5173 or 5000 it tells you instead. To stop the app from any terminal, run:

```bash
npm run dev:stop
```

### Database

- **Zero-config (default):** with no `MONGO_URI`, the server starts a local MongoDB and seeds demo data on the first run. Data is kept in `server/.data`, so logins and IDs survive restarts; delete that folder (or set `MEMORY_DB_PERSIST=false`) to start fresh. The first run downloads a MongoDB binary (~600 MB, cached afterwards).
- **Real MongoDB (local or Atlas):** copy `server/.env.example` to `server/.env`, set `MONGO_URI` and `JWT_SECRET`, then seed:

```bash
npm run seed
```

### Password reset emails

Without SMTP settings (the default), the reset link is printed in the server terminal and shown on the Forgot Password page, so the flow works locally. To send real emails, fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `EMAIL_FROM` in `server/.env` (for Gmail, use an App Password). Set `CLIENT_URL` to the frontend URL so links point to the right site.

### Continue with Google

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create **Credentials → OAuth client ID → Web application** (set up the OAuth consent screen first if asked).
2. Under **Authorized JavaScript origins** add `http://localhost:5173` and `http://localhost` (plus your production URL when you deploy). No redirect URI is needed.
3. Put the client ID in both env files and restart `npm run dev`:
   - `client/.env` → `VITE_GOOGLE_CLIENT_ID=<your-client-id>`
   - `server/.env` → `GOOGLE_CLIENT_ID=<your-client-id>`

Without a client ID the button is hidden in production builds; in development it shows these setup steps instead. Google sign-in creates **patient** accounts (doctors register with the form, then can also use Google with the same email). A Google-only user can add a password later through "Forgot password".

### Hospitals from data.gov.in

1. Create a free account at [data.gov.in](https://www.data.gov.in) and copy your **API key** (My Account → API key).
2. In `server/.env` set `DATA_GOV_IN_API_KEY` (optionally `HOSPITAL_IMPORT_LIMIT`), then restart the server. The dataset defaults to the National Hospital Directory with Geo Code (resource `98fa254e-c5f8-4910-a19b-4828939b477d`); set `DATA_GOV_IN_HOSPITAL_RESOURCE_ID` only to use another one.
3. With the in-memory database the hospitals are imported automatically on start. With a real database run `npm run import:hospitals --prefix server`, or use **Import / refresh hospitals** on the Admin page.

Until real data is imported, the directory holds **854 demo hospitals — one in every listed city across all 36 states/UTs** — labelled **Demo**, with no invented phone numbers (only India's national ambulance number, 108). Each demo hospital has departments that match its type, and the city's demo doctors whose specialty matches a department are attached to it (a Multispeciality Hospital gets all 30, an Eye & ENT Hospital only the ophthalmologist and ENT specialist, AYUSH hospitals none) — about 6,200 doctors in all; the rest keep their own clinics. The first successful data.gov.in import deletes the demo hospitals and detaches those doctors (they can then pick a real hospital in their profile), and re-seeding never adds demo hospitals back once real ones exist.

The importer accepts the National Health Portal's field names in any case and normalises old state names (e.g. "Orissa" → Odisha, "NCT of Delhi" → Delhi). The data is published under the Government Open Data License – India.

### ABDM Healthcare Professionals Registry (optional)

Register as an integrator in the [ABDM sandbox](https://sandbox.abdm.gov.in) to get a client ID and secret, then set `ABDM_CLIENT_ID`, `ABDM_CLIENT_SECRET` and `ABDM_HPR_LOOKUP_URL` (the HPR "fetch professional" endpoint from the sandbox documentation; `{hprId}` in it is replaced with the doctor's ID). The admin page then shows **Check with ABDM HPR** for doctors who entered an HPR ID, and reports whether the registration number matches. The lookup has only been tested against a mock of the API, so confirm the endpoint and response fields with your sandbox docs.

### Demo accounts (seeded)

| Role    | Email                        | Password     |
| ------- | ---------------------------- | ------------ |
| Patient | patient@medicare.dev         | patient123   |
| Doctor  | ananya.sharma@medicare.dev   | doctor123    |
| Admin   | admin@medicare.dev           | admin123     |

**Real admin accounts:** emails listed in `ADMIN_EMAILS` (`server/.env`, currently `sumitmmmut1@gmail.com`) become admin when they **Continue with Google**. Password sign-up never grants admin, because it does not verify the email address. Only admins mark visits completed or not completed (navbar → **Completions**); doctors record the check-out and patients see the result on their dashboards.

All seeded doctors are fictional sample profiles labelled **Demo**, with registration numbers starting `DEMO-`. **Every one of the 854 cities** in the built-in city list (`server/utils/indianCities.js`, mirrored in `client/src/data/indianCities.js`) has a doctor of **each of 30 specialties** (General Physician, Cardiologist, Neurologist, Nephrologist, Oncologist, Neurosurgeon, Neonatologist, … — see `SPECIALTIES` in `server/seedData.js`): **25,620 verified doctors** in all. That is the six named doctors (`ananya.sharma`, `rohan.mehta`, `priya.nair`, `vikram.singh`, `sneha.kapoor`, `arjun.iyer`) plus `demo.doctor1` … `demo.doctor25614`, and two awaiting verification (`pending.doctor1`, `pending.doctor2`) — all `@medicare.dev` / `doctor123`. Seeding writes the generated records in bulk, so the in-memory database is ready in about 10 seconds. Pincodes are only filled in for cities whose pincode is known; the rest are left blank rather than guessed. Adding a city to the list also gives it a demo doctor on the next seed.

## REST API

| Method | Endpoint                          | Access          | Description                              |
| ------ | --------------------------------- | --------------- | ---------------------------------------- |
| POST   | `/api/auth/register`              | Public          | Register patient or doctor               |
| POST   | `/api/auth/login`                 | Public          | Login, returns JWT                       |
| GET    | `/api/auth/me`                    | Auth            | Current user (+ doctor profile)          |
| POST   | `/api/auth/google`                | Public          | Sign in with Google `{ credential }`     |
| POST   | `/api/auth/forgot-password`       | Public          | Email a reset link `{ email }`           |
| GET    | `/api/auth/reset-password/:token` | Public          | Check a reset link is still valid        |
| POST   | `/api/auth/reset-password/:token` | Public          | Set new password `{ password }`, logs in |
| PUT    | `/api/users/me`                   | Auth            | Update personal / health profile         |
| PUT    | `/api/users/me/password`          | Auth            | Change password                          |
| GET    | `/api/doctors`                    | Public          | Verified doctors (`search`, `specialization`, `state`, `city`, `pincode`, `hospital`, `sort`, `page`, `limit`) |
| GET    | `/api/doctors/specializations`    | Public          | Distinct specializations                 |
| GET    | `/api/doctors/locations`          | Public          | States/UTs and cities with doctor counts |
| GET    | `/api/hospitals`                  | Public          | Hospitals (`search`, `state`, `district`, `pincode`, `page`, `limit`) |
| GET    | `/api/hospitals/locations`        | Public          | States and districts with hospital counts |
| GET    | `/api/hospitals/:id`              | Public          | Hospital with its verified doctors       |
| GET    | `/api/admin/stats`                | Admin           | Counts + whether ABDM is configured      |
| GET    | `/api/admin/doctors?status=`      | Admin           | Verification queue (`pending`/`verified`/`rejected`, `search`) |
| PATCH  | `/api/admin/doctors/:id/verification` | Admin       | `{ status, note }` – verify / reject / reopen |
| POST   | `/api/admin/doctors/:id/hpr-check` | Admin          | Look the doctor's HPR ID up in ABDM      |
| POST   | `/api/admin/hospitals/import`     | Admin           | Import hospitals from data.gov.in `{ limit }` |
| GET    | `/api/admin/appointments?queue=`  | Admin           | Queues: `review` (pending/confirmed), `completed`, `upcoming`, `all`; `search`, `page` |
| PATCH  | `/api/admin/appointments/:id/status` | Admin        | `{ status }` – `pending`/`confirmed`/`completed`/`cancelled`: complete, mark incomplete, confirm, cancel, restore |
| POST   | `/api/geo/reverse`                | Public          | `{ lat, lon }` → place (area, city, district, state, PIN) via OpenStreetMap Nominatim, for the booking form's location button |
| GET    | `/api/events`                     | Any signed-in   | Server-Sent Events stream: `appointment` events when an appointment you can see changes |
| GET    | `/api/doctors/:id`                | Public          | Doctor details                           |
| GET    | `/api/doctors/:id/slots?date=`    | Public          | Slots for a date with availability       |
| GET    | `/api/doctors/me/profile`         | Doctor          | Own professional profile                 |
| PUT    | `/api/doctors/me/profile`         | Doctor          | Update profile & weekly availability     |
| POST   | `/api/appointments`               | Patient         | Book `{ doctorId, date, slot, reason, paymentMethod, patientDetails: { location } }` (name and age come from the profile) – `upi`/`card` (demo, recorded as paid) or `clinic` |
| GET    | `/api/appointments/me?status=`    | Patient/Doctor  | Own appointments                         |
| PATCH  | `/api/appointments/:id/status`    | Patient/Doctor  | Confirm / cancel (refunds a paid booking) / add `doctorNotes` |
| PATCH  | `/api/appointments/:id/checkout`  | Doctor          | Check-out `{ doctorNotes, followUpDate, feeCollected, paymentMethod }` – records the visit; only an admin marks it completed |

Status transitions: doctor `pending → confirmed → completed`, either role can cancel an active appointment.

## Production build

```bash
npm run build
```

Then set `NODE_ENV=production`, `MONGO_URI` and `JWT_SECRET`, and run `npm start`. Express serves `client/dist` on the same port as the API.
