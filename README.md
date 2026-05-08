# Citofono

> **Il citofono digitale per il tuo affitto breve.**
> Apre la porta. Riconosce l'ospite. Parla la sua lingua.

[![ci](https://github.com/aureliocpr-ctrl/citofono/actions/workflows/ci.yml/badge.svg)](https://github.com/aureliocpr-ctrl/citofono/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-blue.svg)](#requisiti)

Citofono è la piattaforma per chi gestisce affitti brevi in Italia. Risolve il problema più doloroso del 2026: **il check-in "de visu" è obbligo di legge**, ma le soluzioni esistenti (Lodgify, Vikey, Smoobu) hanno un self-check-in vecchio stile che non basta più.

**In 90 secondi**: l'ospite carica la foto del documento → l'OCR legge i dati con verifica delle cifre di controllo MRZ → fa un selfie con micro-sfida (blink + rotazione testa) → match biometrico → schedina Alloggiati Web pronta per la Polizia.

```
ospite riceve link  →  OCR documento  →  liveness check  →  face match  →  Alloggiati Web
        ↓                  ↓                  ↓                  ↓                ↓
     (no app)        (~1s, MRZ ICAO)     (browser-side)    (server, 128-dim)   (CSV ufficiale)
```

---

## Cosa fa

- **Check-in de visu legale 2026**: OCR documento + liveness + face match. Conformità "verifica attiva dell'identità".
- **Alloggiati Web automatico**: genera il file a larghezza fissa nel formato ufficiale Polizia di Stato. L'host scarica e carica al portale.
- **Concierge AI multilingua**: Claude risponde a domande in 20+ lingue, ancorato alla knowledge base dell'appartamento. Niente jailbreak: se non c'è la risposta, dice "non lo so".
- **GDPR-first**: foto documento e selfie cancellate dopo verifica. Resta solo l'embedding biometrico (vettore 128-dim) per la durata del soggiorno + 7 giorni di tolleranza, poi cancellato.
- **Audit log strutturato**: ogni evento sensibile (OCR, face match, export Alloggiati) registrato con IP + UA per ispezioni e conformità.

## Cosa NON è

- **Non è un channel manager**: integri Lodgify/Smoobu/Octorate via iCal, non li sostituisci.
- **Non è un PMS hotel**: non per strutture grandi (>20 camere).
- **Non è un sito di prenotazione**: Airbnb/Booking restano i canali di acquisizione.

## Architettura

```
┌─────────────────┐         ┌──────────────────┐         ┌────────────────┐
│  Ospite         │ ─link─→ │  /v/[token]      │  POST   │  /api/guest/   │
│  (browser only) │         │  Mobile-first    │ ──────→ │   start         │
│  Nessuna app    │         │  flow 7 step     │         │   document      │
└─────────────────┘         └──────────────────┘         │   confirm-data  │
                                     │                    │   verify        │
                                     │ embedding              └─────┬───────┘
                                     │ (Float32Array)               │
                                     ▼                              ▼
                            ┌────────────────┐            ┌────────────────┐
                            │  face-api.js   │            │  Postgres      │
                            │  client-side   │            │  + Prisma      │
                            └────────────────┘            └────────────────┘
                                                                  │
                            ┌────────────────┐                    │
                            │  Host          │  GET .txt          │
                            │  Dashboard     │ ──────→ /api/bookings/[id]/
                            │  Next.js       │            alloggiati.txt
                            └────────────────┘                    │
                                                                  ▼
                                                          ┌────────────────┐
                                                          │  Alloggiati    │
                                                          │  Web           │
                                                          │  (Polizia)     │
                                                          └────────────────┘
```

### Stack

| Livello | Scelta | Perché |
|---|---|---|
| Frontend + API | **Next.js 15 App Router** | Server actions, API routes, edge-friendly |
| Auth | **Lucia v3** | Sessioni cookie, no JWT complications |
| DB | **Postgres + Prisma** | Schema dichiarativo, type-safe |
| OCR | **tesseract.js** + parser MRZ deterministico | MRZ ha cifre di controllo → 99% accuratezza su passaporti |
| Face | **face-api.js** (browser) + cosine similarity (server) | Embedding calcolato lato client → minimo dato biometrico al server |
| LLM | **Anthropic Claude (Haiku 4.5)** | Multilingua nativo, latenza bassa, ancorato a knowledge base |
| Storage | **S3-compatible** (R2 in prod, FS in dev) | Lifecycle policy con TTL per cancellazione automatica |
| Pagamenti | **Stripe** | Subscription + customer portal |

## Privacy by design

I dati biometrici sono "categorie particolari di dati personali" (GDPR Art. 9). Citofono applica:

1. **Minimizzazione**: l'embedding facciale è calcolato nel browser dell'ospite. Il server riceve un vettore di 128 numeri (~512 byte), mai un'immagine.
2. **Conservazione limitata**: foto del documento e selfie cancellate dopo la verifica. L'embedding viene cancellato 7 giorni dopo il check-out.
3. **Consenso esplicito**: nessuno step parte senza accettazione del trattamento, tracciata in `Host.acceptedDpiaAt` e `auditLog`.
4. **Audit trail**: ogni operazione critica (OCR, match, export Alloggiati) viene registrata con IP, user-agent e timestamp.
5. **Encoding sicuro**: l'embedding è salvato come `Bytes` (Float32 little-endian) — non è un'immagine reversibile.

Vedi `prisma/schema.prisma` per i campi e `src/lib/audit.ts` per il logging.

## Sviluppo

### Requisiti

- Node ≥ 20
- Postgres 15+ (puoi usare `docker run -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16`)
- Una API key Anthropic (per il concierge)

### Setup

```bash
git clone https://github.com/aureliocpr-ctrl/citofono.git
cd citofono
npm install

# Configura env
cp .env.example .env
# poi modifica .env con DATABASE_URL e ANTHROPIC_API_KEY

# DB
npx prisma db push

# Dev
npm run dev
```

Apri http://localhost:3000.

### Test

```bash
npm test               # vitest, 59 test, ~1s
npm run typecheck      # tsc --noEmit
```

## Modello di pricing

| Piano | Prezzo | Per chi |
|---|---|---|
| **Free** | 0€ | 3 check-in al mese, 1 appartamento |
| **Host** | 19€/mese | Check-in illimitati, 1 appartamento |
| **Host+** | 49€/mese | Fino a 5 appartamenti |
| **Pro** | 9€/unità/mese | Property manager con 5+ unità (sales touch) |

Confronto con un property manager tradizionale: per un appartamento da 1500€/mese, un PM costa 150–450€/mese. Citofono fa il check-in, l'Alloggiati Web e il concierge a 19€/mese.

## Stato del progetto

MVP funzionante. Funzionalità complete:

- [x] Schema DB privacy-aware (Host, Property, Booking, Guest, CheckIn, Document, FaceEmbedding, AuditLog)
- [x] OCR pipeline con parser MRZ deterministico (TD1, TD2, TD3) + fallback Tesseract per CdI italiana cartacea
- [x] Face match server-side (cosine similarity, 128-dim embedding, soglie tarate)
- [x] Liveness detection (blink detector, head turn, EAR)
- [x] Concierge AI multilingua (5 lingue marker-detected, 20+ via Claude)
- [x] Export Alloggiati Web nel formato a larghezza fissa ufficiale
- [x] Auth (Lucia + Argon2id)
- [x] Dashboard host completa (properties, bookings, check-ins, alloggiati download)
- [x] Flusso guest mobile-first 7 step
- [x] API routes complete + audit log
- [x] Test unit (vitest, 59/59)
- [x] Landing page SEO

In roadmap (post-MVP):

- [ ] Integrazione iCal Airbnb/Booking
- [ ] Integrazione diretta API Alloggiati Web (con certificato)
- [ ] Smart pricing dinamico
- [ ] Energy guard (Tado/Netatmo)
- [ ] WhatsApp Business API
- [ ] Imposta di soggiorno per comune
- [ ] App mobile per host (gestione on-the-go)
- [ ] Multi-host (PM con sub-account)

## Licenza

[AGPL-3.0](LICENSE) © Aurelio Capriello

Il codice è open source. Per uso commerciale puoi prendere il codice o usare l'istanza ufficiale a citofono.app (in arrivo).
