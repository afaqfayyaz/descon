# Handover Notes — 16 Jul 2026

Snapshot of the Caliber app after review + restructure. Source only —
run `npm install` to restore dependencies, `npm run build` to rebuild.

## Setup (same as README)

1. `npm install`
2. `cp .env.example .env.local` — set `MONGODB_DB=caliber` (the seed scripts
   default to `caliber`; if `.env.local` points elsewhere the app sees an
   empty DB and every login fails with CredentialsSignin)
3. Start MongoDB **6.0** on `localhost:27017` — note: MongoDB 7/8 will not
   start on Windows 10 1909 or older (exits with STATUS_ENTRYPOINT_NOT_FOUND)
4. `npm run seed` → `npm run create-admin -- --email you@x.com --name "You" --password "<pw>"`
5. Optional demo data: `npm run seed:demo` (login `hr@caliber.app` / `Caliber@123`)
6. `npm run dev` or `npm run build && npm start` → http://localhost:3000

## What changed in this snapshot (IA restructure)

- **Dashboard** now shows company gap analysis + live assessment progress
  (headcount, assessed, critical gaps, running assessments, gap radar,
  workforce distribution) — framework counts moved to the Framework page.
- **"My Assessments" → "Assessments" hub**: HR sees campaigns + one-on-one
  assignments there and sends both from that page ("Send one-on-one" modal
  with employee dropdown + scope picker; "New campaign" → existing builder).
- **Campaigns** unhidden in the sidebar; one-on-one auto-campaigns are
  filtered out of its list (they live in the hub).
- **Assign/resend buttons removed from People** — sending happens only from
  Assessments now. Roles/Designations moved from Framework to People.
- New shared component `scope-picker.tsx` (extracted from campaign-builder);
  new `assessment-hub.actions.ts`; `assignAssessmentAction` now accepts a
  custom scope.
- New e2e test `e2e/one-on-one.spec.ts`. Full suite: 7/7 passing;
  unit tests 32/32; typecheck + production build clean.

## Docs added during review

- `WORKFLOWS.md` — visual workflow map (mermaid) of the whole system
- `CALIBER_GUIDE.md` — plain-English guide to the app
- `scripts/verify-lock.ts` — one-off script that exercises
  calibration → adjust → lock (run after `npm run cycle`)

## Known gaps vs the PRD (from the requirements audit)

- Self-level and overall-gap formulas deviate slightly from PRD §5.7
  (per-question vs pooled normalization; weighted vs averaged overall gap).
- "PDF/Excel" exports are CSV + print-to-PDF (no xlsx/pdf libs).
- Framework versioning (diff/rollback), calibration workshop bulk-approve,
  delegation, scheduled reports, BI API, email template mgmt: not implemented.
- Email sending is a no-op until SMTP is configured in `.env.local`.
