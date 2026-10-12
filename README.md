# Barangay Consultative Meeting — MWSS RO Water Efficiency Program

Registration form and results dashboard for the **Barangay Consultative Meeting** of the
MWSS Regulatory Office Water Efficiency Program (October 27, 2026 · 1:00–5:00 PM ·
Manila Water Lakbayan Center).

- **`/`** — animated splash screen (WEP logo), then a two-section bilingual (Filipino / English)
  form that follows the WEP Plan questionnaire. Responses are saved to Airtable.
- **`/dashboard`** — password-protected results dashboard: key figures, charts, searchable
  table, and exports to **Excel (.xlsx)**, **CSV**, an **attendee list CSV**, and **Print / PDF**.

## Tech stack

| Part | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router) + React 19, TypeScript |
| Styling | Plain CSS (water theme, light & dark mode, responsive) |
| Database | Airtable (Web API, called only from the server) |
| Excel export | ExcelJS |
| Hosting | Vercel, deployed from GitHub |

The Airtable token never reaches the browser: the form posts to `/api/submit`, and the
dashboard reads through `/api/responses`, both running on Vercel's servers.

## Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `AIRTABLE_TOKEN` | yes | Airtable personal access token with scopes `data.records:read`, `data.records:write`, `schema.bases:read`, `schema.bases:write`, and access to the WEP base |
| `AIRTABLE_BASE_ID` | yes | `appBTvrLNv8i0QLkX` |
| `AIRTABLE_TABLE_ID` | recommended | `tblLvgSG9Capd7rLb` (the "BCG WEP" table). Using the ID means renaming the table in Airtable won't break the form |
| `DASHBOARD_PASSWORD` | yes | Password for `/dashboard` — share only with the WEP team |
| `SESSION_SECRET` | optional | Long random string used to sign dashboard sessions |

Copy `.env.example` to `.env.local` for local development. **Never commit `.env.local`** — it is
already in `.gitignore`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 (form) and http://localhost:3000/dashboard (dashboard).

## Deploy to Vercel through GitHub

1. **Create a GitHub repository** (private is recommended), e.g. `wep-consultative-meeting`,
   without a README.
2. **Push this folder** to it:
   ```bash
   git remote add origin https://github.com/<your-account>/wep-consultative-meeting.git
   git push -u origin main
   ```
3. In **Vercel** → *Add New… → Project* → *Import* the GitHub repository. The framework is
   detected as Next.js; keep the default build settings.
4. Before clicking *Deploy*, open **Environment Variables** and add every variable from the
   table above (for Production, Preview and Development).
5. Click **Deploy**. Every later `git push` to `main` redeploys automatically.

## Airtable

The fields are created automatically. If the table or any column is missing, the dashboard
shows a **"Create fields now"** button, and the form also repairs the schema on its first
submission. Columns created:

`Reference No.` (primary), `Submitted At`, `Data Privacy Consent`, `Province`,
`City/Municipality`, `Barangay`, `Barangay Hall Address`, `Barangay Contact Number`,
`Barangay Email`, `Barangay Chairperson`, `Focal Person`, `Focal Person Contact Number`,
`Focal Person Email`, `Will Attend`, `No. of Attendees`, and for attendees 1 and 2:
`Name`, `Contact Number`, `Gender`, `PWD`.

Don't rename these columns in Airtable (the app looks them up by name; if you must, update
`lib/fields.ts`). Extra columns you add — e.g. a status or remarks column for the
secretariat — are ignored by the app and safe to use.

## Customising

| What | Where |
| --- | --- |
| Event date, time, venue, seat target (70) | `lib/config.ts` → `EVENT` |
| City / municipality list | `lib/config.ts` → `LOCATIONS` |
| Questions, labels, Data Privacy Notice text | `components/form/RegistrationForm.tsx` |
| Validation rules and messages | `lib/validation.ts` |
| Colours and animation | `app/globals.css`, `app/dashboard/dashboard.css` |
| Logos | `public/mwss-ro-logo.png`, `public/wep-logo.png` |

## Project structure

```
app/
  page.tsx                 form page (splash + form)
  dashboard/page.tsx       dashboard (login or dashboard)
  api/submit               saves a registration to Airtable
  api/responses            lists registrations (signed-in only)
  api/export               Excel / CSV export (signed-in only)
  api/admin/setup          creates Airtable fields (signed-in only)
  api/auth/login|logout    dashboard session
components/
  Splash.tsx, WaterBackground.tsx
  form/                    form fields and the two-step form
  dashboard/               charts, table, login
lib/
  airtable.ts              Airtable client + automatic schema setup
  fields.ts                Airtable column definitions
  validation.ts            shared form validation
  stats.ts                 filters and dashboard statistics
  export.ts                CSV / Excel builders
  auth.ts                  dashboard password + signed session cookie
```

## Security notes

- The Airtable token and dashboard password live only in Vercel environment variables.
- Dashboard sessions use a signed, HTTP-only cookie that expires after 12 hours.
- The form has server-side validation, a size limit, and a hidden honeypot field against bots.
- Form drafts are kept in the browser tab only (`sessionStorage`) and are cleared when the
  tab closes or the form is submitted — safer on shared barangay computers.
