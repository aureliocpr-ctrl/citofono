# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
