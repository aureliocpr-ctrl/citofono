# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.4.0] - 2026-05-08

Production-ready hardening. Adesso il prodotto è deployabile a host paganti senza fragilità di sicurezza, GDPR o flussi mancanti.

### Added
- **Security headers** in `next.config.mjs`: CSP, HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, X-Content-Type-Options. CSP permette `https://js.stripe.com`, `https://cdn.jsdelivr.net` (face-api models), `https://api.anthropic.com`.
- **Rate limiting in-memory** (`src/lib/rateLimit.ts`): bucket token, profili AUTH/GUEST/CONCIERGE/WEBHOOK. Applicato a login (5/5min), signup (5/5min), guest endpoints document+verify (30/min per token), cambio password (5/5min), cancellazione account (5/5min). API pulita per swappare con Upstash Redis quando si va multi-istanza.
- **Health check** `/api/health` con stato DB + latency + version, 200/503 per uptime monitoring.
- **Edit Property + archivio**: form completo (nome, indirizzo, CIN, Alloggiati, check-in/out, WiFi, iCal URLs, override imposta soggiorno) e zona pericolosa con conferma `ARCHIVIA`. Soft-archive: dati storici restano per GDPR/fiscale.
- **Cancel Booking**: conferma esplicita `ANNULLA`, marca booking come CANCELLED, blocca generazione schedina.
- **Reset CheckIn**: se il face match è andato male, l'host può azzerare verifiche e FaceEmbedding di tutti gli ospiti per rifare il flusso con lo stesso link.
- **Settings host** (`/settings`): cambio password (con verifica password corrente), credenziali Alloggiati Web, link a export GDPR e cancellazione account.
- **DSAR export GDPR Art. 20** (`/api/host/me/export`): dump JSON completo (host, properties, bookings, guests anonimizzati, audit log). NON include FaceEmbedding (quei dati sono dell'ospite, non dell'host).
- **Cancellazione account GDPR Art. 17** (`/settings/delete-account`): conferma con frase esatta + password corrente. Cancella sub Stripe, file S3, dati DB in cascade. Anonimizza audit log (hostId → null) per preservare conformità.
- **Logger strutturato JSON** (`src/lib/logger.ts`): redaction automatica di chiavi sensibili (password, token, embedding, docNumber, birthDate). Sentry-ready (hook `SENTRY_DSN`).
- **DEPLOY.md**: guida completa Vercel + Neon + R2 + Stripe + Resend + Anthropic. Smoke test post-deploy, costi mensili stimati, troubleshooting.
- **`vercel-build` script**: `prisma migrate deploy && next build` per auto-migrazione al primo deploy.
- **Link "Impostazioni"** nella nav host.

### Fixed
- **Audit event types**: aggiunto `host.password_changed`, `host.alloggiati_updated`, `host.gdpr_export`, `host.account_deleted`, `property.updated`, `property.archived`, `booking.cancelled`, `checkin.reset` al union TypeScript.
- **`Property.icalUrls = null`**: usato `Prisma.DbNull` invece di `null` per il tipo Json nullable.

### Changed
- `package.json` versione → `0.4.0`.

## [0.3.0] - 2026-05-08

Fix delle 14 fragilità identificate nell'audit interno onesto. Adesso il flusso vero è eseguibile end-to-end.

### Fixed
- **Tailwind Typography**: installato `@tailwindcss/typography`, le pagine `/privacy`, `/terms`, `/dpia` ora hanno `prose` styling reale (non più HTML grezzo).
- **Login timing-oracle**: il fake-hash inventato `$argon2id$...$abc$abc` non era un argon2 valido (il verify lanciava errore subito). Sostituito con `dummyHash()` lazy che genera un hash argon2id reale al primo uso e lo cacha. Risposta in tempo costante anche per email inesistenti.
- **iCal `Json?` query cast forzato** (`null as unknown as object`): rimosso. Adesso fetcha tutte le Property attive e filtra in JS con `extractIcalUrls(p).length > 0`.
- **CRON_SECRET obbligatorio in production**: in `NODE_ENV=production` le route cron rispondono 500 se `CRON_SECRET` non è impostato. Niente endpoint pubblici per cron.

### Added
- **Pagina `/properties/[id]`** con riepilogo property, configurazione e **CRUD Knowledge Chunks** per il concierge (server actions). Senza questo il concierge AI risponde "non lo so" su tutto.
- **Form Property esteso**: campi `icalUrls` (textarea, una per riga) e override imposta soggiorno (`taxPerPersonNight`, `taxMaxNights`). Senza questo il sync iCal non parte mai.
- **OCR client-side**: nuovo modulo `lib/ocr/client.ts` (Tesseract.js worker nel browser). Lo step Document fa OCR nel browser e manda al server solo il testo. Migliore privacy + bypassa i limiti Vercel functions (FS readonly, timeout 10s, modelli 12MB).
- **Server-side fallback OCR** mantenuto: se il browser dell'ospite non riesce a runnare Tesseract, il file va al server che prova a sua volta.
- **Migration Prisma**: `prisma/migrations/20260508000000_initial/migration.sql` (240 righe) con tutte le tabelle, enum, FK, index. `prisma migrate deploy` ora funziona.
- **Test E2E Playwright** (`e2e/smoke.spec.ts`): copre landing, pagine legali, signup completo, creazione property, creazione booking, link guest aperto in context separato fino allo step consenso. CI con service Postgres.

### Changed
- API `/api/guest/[token]/document` accetta opzionalmente `ocrText` pre-elaborato dal browser. Se assente, fallback server-side con `import('@/lib/ocr/runner')` lazy.
- CI workflow: aggiunto job `e2e` con Postgres service 5432, install browsers Playwright, build + run smoke. Upload artifact playwright-report on failure.

## [0.2.0] - 2026-05-08

Lanciabile a host beta.

### Added
- **Face match reale** con face-api.js (vladmandic fork): tinyFaceDetector + faceLandmark68Net + faceRecognitionNet caricati lazy da CDN. Embedding 128-dim FaceNet calcolato interamente nel browser dell'ospite — il server riceve solo il vettore numerico, mai l'immagine.
- **Liveness automatica**: rilevazione di blink (Eye Aspect Ratio sotto soglia per N frame consecutivi) e rotazione testa (yaw stimato da landmark naso/orecchio) in tempo reale. L'ospite non deve più premere "ho fatto il blink" — il sistema lo rileva.
- **Stripe**: `/api/billing/checkout` (Subscription con 14 giorni di trial), `/api/billing/portal` (Customer Portal), `/api/billing/webhook` (verifica firma + sync piano da `customer.subscription.created/updated/deleted`). Pagina `/billing` con piani Free/Host/Host+ e bottoni di upgrade.
- **Email transazionali Resend** in italiano e inglese: link di check-in all'ospite (con auto-detection lingua), notifica all'host quando l'ospite è verificato, notifica di review richiesta. Fallback a console-log se RESEND_API_KEY non è impostato (dev-friendly).
- **Endpoint `POST /api/bookings/:id/send-link`** per inviare il link di check-in all'ospite tramite email. Bottone integrato nella pagina dettaglio prenotazione.
- **Cron Vercel `gdpr-cleanup`** giornaliero (3:00): cancella `FaceEmbedding` scaduti e i Document più vecchi di 7 giorni dal check-out (incluso il file su S3). Auth via `Bearer CRON_SECRET`.
- **Cron Vercel `ical-sync`** ogni 30 min: per ogni Property con `icalUrls` configurati, fetcha l'ICS, parsa con `ical.js`, fa upsert idempotente delle Booking. Riconosce Airbnb/Booking/VRBO da UID/summary.
- **Pagine legali** `/privacy`, `/terms`, `/dpia` con contenuti reali (GDPR, art. 109 TULPS, art. 9 categorie particolari, conservazione e diritti).
- **Tabella imposta di soggiorno** per 46 Comuni turistici italiani: tariffa per persona/notte, tetto notti, esenzione under-N. Modulo `computeSoggiornoTax` con calcolo, override per-property e copertura test.
- **Schema DB esteso**: `Property.icalUrls`, `Property.icalLastSync`, `Property.taxPerPersonNight`, `Property.taxMaxNights`.

### Changed
- Lo step `Document` del flusso ospite ora calcola davvero l'embedding facciale dalla foto (face-api.js) invece di un placeholder hash. Errore esplicito se nessun volto è rilevato.
- Lo step `Liveness` è completamente riscritto: detection automatica via face-api landmarks + EAR + yaw. Niente più bottoni "ho fatto il blink".

### Tests
- 59 → **86 test** verdi su 12 file. Nuovi: `gdpr.test.ts`, `ical.test.ts`, `soggiorno.test.ts`, `stripe.test.ts`, `email.test.ts`.

### Infra
- `vercel.json` con configurazione cron (gdpr-cleanup giornaliero, ical-sync ogni 30 min).

## [0.1.0] - 2026-05-08

Initial MVP. Vedi commit di partenza.
