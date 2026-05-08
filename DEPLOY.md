# Deploy in produzione

Questa guida ti porta da zero a `https://citofono.tuo-dominio.it` in circa 60 minuti.

Stack target consigliato:
- **Vercel** (hosting Next.js + cron + edge network)
- **Neon** (Postgres serverless)
- **Cloudflare R2** o AWS S3 (storage documenti)
- **Stripe** (subscription billing)
- **Resend** (email transazionali)
- **Anthropic** (concierge AI)

Costo totale start: ~€20/mese (Vercel Pro €20, tutto il resto free tier o pay-per-use trascurabile).

---

## 1 · Database Postgres (Neon)

1. Registrati su [neon.tech](https://neon.tech). Free plan: 1 DB, 3 GB.
2. Crea un progetto `citofono-prod`, regione `eu-central-1` (vicino agli host italiani).
3. Copia la **Connection String** (modalità "pooled connection") — ti servirà come `DATABASE_URL`.
4. Apri la SQL editor di Neon e fai un check di sanity: `SELECT 1;` deve rispondere.

> **Migrazione**: il primo deploy Vercel runerà automaticamente `prisma migrate deploy` se aggiungi il comando al build (vedi sotto). Niente da fare manualmente.

---

## 2 · Storage S3 (Cloudflare R2 consigliato)

R2 è più economico di S3 e ha lifecycle TTL nativi.

1. Cloudflare → R2 → Create bucket `citofono-prod`.
2. Settings → Object Lifecycle: aggiungi 2 regole:
   - prefisso `verification/`: cancella oggetti dopo **7 giorni**
   - prefisso `selfie/`: cancella oggetti dopo **24 ore**
3. R2 → Manage API tokens → Create token con permesso `Object Read & Write` sul bucket.
4. Annota: `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET=citofono-prod`,
   `S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com`, `S3_REGION=auto`.

---

## 3 · Stripe

1. Stripe Dashboard → Products → crea 2 prodotti:
   - **Citofono Host** (€19/mese ricorrente) → annota il Price ID `price_...`
   - **Citofono Host+** (€49/mese ricorrente) → annota il Price ID `price_...`
2. Developers → API keys → copia la **Secret key** (`sk_live_...`).
3. Developers → Webhooks → Add endpoint `https://citofono.tuo-dominio.it/api/billing/webhook`
   - eventi: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - copia il **Signing secret** (`whsec_...`).
4. Settings → Customer portal → abilita, configura "cancellazione possibile",
   "modifica metodo di pagamento", "fatture passate".

---

## 4 · Resend (email)

1. Registrati su [resend.com](https://resend.com).
2. Domains → Add domain `tuo-dominio.it`. Aggiungi i record DNS suggeriti
   (SPF, DKIM, DMARC) sul tuo DNS provider — **fondamentale**, senza questi
   le email finiscono in spam.
3. Aspetta che lo stato passi a `verified` (5-30 minuti).
4. API Keys → Create → annota la chiave `re_...`.

---

## 5 · Provider AI (concierge)

Citofono supporta **7 provider AI** intercambiabili tramite due env var:

```
CITOFONO_AI_PROVIDER=<provider>
CITOFONO_AI_MODEL=<modello>     # opzionale, ognuno ha un default
```

Pick the one that fits the budget:

| Provider | Default model | Costo/M token (in/out) | Note |
|---|---|---|---|
| `anthropic` | claude-haiku-4-5 | $0.25 / $1.25 | Default, multilingua eccellente |
| `openai` | gpt-5-nano | ~$0.05 / $0.40 | Veloce, qualità solida |
| `google` | gemini-2.5-flash | $0.075 / $0.30 | Cheapest, ottimo italiano |
| `xai` | grok-4-fast | ~$0.20 / $0.50 | Tono più diretto |
| `groq` | llama-3.3-70b-versatile | $0.59 / $0.79 | Inferenza ultraveloce |
| `openrouter` | claude-haiku-4.5 | varia | Router universale |
| `ollama` | llama3.3 | **€0** (self-host) | Privacy by design |

### Provider per provider

**Anthropic** (default):
1. [console.anthropic.com](https://console.anthropic.com) → API Keys → Create.
2. `ANTHROPIC_API_KEY=sk-ant-...`. Budget $20/mese (~$0.50/host attivo).

**OpenAI**:
1. [platform.openai.com](https://platform.openai.com) → API keys.
2. `OPENAI_API_KEY=sk-...` + `CITOFONO_AI_PROVIDER=openai`.

**xAI Grok**:
1. [console.x.ai](https://console.x.ai) → API keys.
2. `XAI_API_KEY=xai-...` + `CITOFONO_AI_PROVIDER=xai`.

**Google Gemini**:
1. [aistudio.google.com](https://aistudio.google.com) → Get API key.
2. `GOOGLE_API_KEY=...` + `CITOFONO_AI_PROVIDER=google`.

**Groq** (Llama gratis, fast):
1. [console.groq.com](https://console.groq.com) → API keys.
2. `GROQ_API_KEY=gsk_...` + `CITOFONO_AI_PROVIDER=groq`.

**OpenRouter** (un'API per ~150 modelli):
1. [openrouter.ai/keys](https://openrouter.ai/keys).
2. `OPENROUTER_API_KEY=sk-or-...` + `CITOFONO_AI_PROVIDER=openrouter`.
   `CITOFONO_AI_MODEL=meta-llama/llama-3.3-70b-instruct` (esempio).

**Ollama** (modelli locali, costo zero):
1. Installa Ollama: `curl -fsSL https://ollama.com/install.sh | sh`
   (oppure scaricalo per Windows/Mac).
2. Pulla un modello: `ollama pull llama3.3` (8B params, ~5GB)
   oppure `ollama pull qwen2.5:7b` (ottimo in italiano).
3. Verifica che giri: `curl http://localhost:11434/api/tags`.
4. Imposta `CITOFONO_AI_PROVIDER=ollama CITOFONO_AI_MODEL=llama3.3`.
5. **Su Vercel**: Ollama gira sul tuo server locale, non su Vercel. Devi
   esporre Ollama via Tailscale / Cloudflare Tunnel e settare
   `OLLAMA_HOST=https://my-ollama.tailnet.ts.net` come env var Vercel.
   Per la piena privacy GDPR, considera self-hosting tutto Citofono.

---

## 6 · Vercel deploy

1. Forka questo repo su GitHub o pusha il tuo fork.
2. Vercel Dashboard → New Project → Import Git Repository.
3. Framework: **Next.js** (autodetect).
4. Build command: lascia il default (`next build`).
5. **Install command**: cambialo in `npm install && npx prisma generate`
   per generare il client.
6. Environment Variables → incolla tutte le env (vedi tabella sotto).
7. Deploy.

> Dopo il primo deploy, vai su Vercel → Settings → Functions e verifica che
> la regione sia `fra1` (Francoforte) per latenza ridotta in Italia.

### Variabili d'ambiente

| Variabile | Esempio | Note |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | Da Neon, modalità pooled |
| `SESSION_SECRET` | random 32 bytes | Genera con `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Da console.anthropic.com |
| `S3_ACCESS_KEY` | `...` | Da Cloudflare R2 token |
| `S3_SECRET_KEY` | `...` | Da Cloudflare R2 token |
| `S3_BUCKET` | `citofono-prod` | |
| `S3_ENDPOINT` | `https://<account>.r2.cloudflarestorage.com` | |
| `S3_REGION` | `auto` | per R2; `eu-central-1` per AWS |
| `RESEND_API_KEY` | `re_...` | Da Resend |
| `EMAIL_FROM` | `noreply@tuo-dominio.it` | Mittente verificato |
| `STRIPE_SECRET_KEY` | `sk_live_...` | |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | |
| `STRIPE_PRICE_HOST` | `price_...` | |
| `STRIPE_PRICE_HOST_PLUS` | `price_...` | |
| `CRON_SECRET` | random 32 bytes | Vercel lo genera, copialo qui |
| `NEXT_PUBLIC_APP_URL` | `https://citofono.tuo-dominio.it` | Senza trailing slash |
| `NEXT_PUBLIC_APP_NAME` | `Citofono` | |

### Migrazione DB al primo deploy

Aggiungi al `package.json` script `postinstall` se vuoi auto-migrazione:

```json
"scripts": {
  "postinstall": "prisma generate",
  "vercel-build": "prisma migrate deploy && next build"
}
```

Poi cambia il **Build Command** Vercel in `npm run vercel-build`. Il primo
deploy applicherà la migrazione iniziale (`20260508000000_initial`).

> Già configurato `vercel-build`? Il repo lo include nel `package.json`.

### Cron jobs

Il file `vercel.json` ha già due cron:
- `gdpr-cleanup` ogni notte alle 3:00 (cancella embedding scaduti)
- `ical-sync` ogni 30 minuti

Vercel li scopre automaticamente. Verifica su Dashboard → Settings → Cron Jobs.

---

## 7 · Dominio personalizzato

1. Vercel → Project → Settings → Domains → aggiungi `citofono.tuo-dominio.it`.
2. Sul tuo DNS provider, aggiungi il record CNAME suggerito da Vercel.
3. Aggiorna `NEXT_PUBLIC_APP_URL` a `https://citofono.tuo-dominio.it`.
4. Aggiorna l'endpoint webhook Stripe se cambia.
5. Aggiorna l'`EMAIL_FROM` Resend se diverso.
6. Re-deploy.

---

## 8 · Smoke test post-deploy

Dopo il deploy, esegui questa checklist (5 minuti):

- [ ] `curl https://tuo-dominio.it/api/health` → `{ ok: true, db: "up" }`
- [ ] Apri `/signup` → registrazione completa
- [ ] Vai a `/properties/new` → crea un appartamento di test
- [ ] Vai a `/bookings/new` → crea una prenotazione
- [ ] Click "Invia link al cliente" → email arriva (controlla anche spam)
- [ ] Apri il link guest in modalità incognito → flusso check-in si carica
- [ ] Stripe → "Aggiorna piano a Host" → reindirizza al checkout, paga con
      carta di test `4242 4242 4242 4242`, torna alla dashboard, piano è `HOST`
- [ ] Vercel → Logs → nessun errore visibile
- [ ] Stripe Dashboard → Webhooks → endpoint con stato `OK` (200)

---

## 9 · Validazione legale

Prima di vendere a clienti reali con dati personali, fai validare:

1. **DPIA** (`/dpia`) — da un consulente privacy o DPO. Costo €500-1500 una tantum.
2. **Termini di servizio** (`/terms`) — almeno una review legale di 1h.
3. **Codice univoco DPO**: registrati come Titolare del trattamento sul Garante
   (via PEC) e ottieni un numero di registrazione se la tua attività lo richiede.
4. **Test reale Alloggiati Web**: genera una schedina con un check-in finto e
   sottoponila al portale Polizia di Stato per verificare il formato 168-char.

---

## 10 · Monitoring

- **Uptime**: BetterStack o UptimeRobot, ping `/api/health` ogni 60s.
- **Errori applicativi**: Sentry consigliato. Aggiungi `SENTRY_DSN` come env
  e scommenta lo stub in `src/lib/logger.ts` (Sentry SDK già installabile via
  `npm i @sentry/nextjs`).
- **Database**: Neon dashboard mostra query slow + connection pool.
- **Email deliverability**: Resend dashboard mostra bounce rate / spam reports.
- **Stripe**: Dashboard → Radar per eventuali pagamenti sospetti.

---

## 11 · Backup

- **DB**: Neon ha point-in-time recovery 7 giorni nel free plan, 30 giorni nel
  Pro. Fai un dump settimanale extra con `pg_dump $DATABASE_URL > backup.sql`
  e salvalo su S3 dedicato.
- **R2**: l'oggetto è eliminato dopo TTL — il backup non serve, è quello che
  vogliamo (privacy).
- **Stripe**: Stripe ha tutti gli storici, niente backup applicativo.

---

## 12 · Costi mensili stimati

Per **100 host paganti** (~€2900 MRR):

| Servizio | Costo |
|---|---|
| Vercel Pro | €20 |
| Neon Pro | €19 |
| Cloudflare R2 | €1 (10 GB scarsi, vista TTL) |
| Resend Pro | €20 (50k email/mese) |
| Anthropic | €50 (~10k chiamate concierge/mese) |
| Stripe | 1.4% + €0.25 per transazione = ~€60 |
| **Totale** | **~€170/mese** |

Margine lordo: 94%. Costi operativi (DPO, supporto, marketing) sopra.

---

## 13 · In caso di problemi

| Sintomo | Verifica |
|---|---|
| `/api/health` 503 | Connection string DB sbagliata o Neon dorme — fai una query manuale |
| Email non arrivano | DNS Resend non verificato (SPF/DKIM/DMARC) |
| Webhook Stripe falliscono | `STRIPE_WEBHOOK_SECRET` errato o endpoint URL cambiato |
| Cron non parte | `vercel.json` non riconosciuto — verifica root del repo |
| Face match sempre `review` | Threshold troppo alto o foto documento sfocata |
| Build fallisce su `prisma migrate` | Lancialo manualmente: `npx prisma migrate deploy` |
| 429 su login/signup | Rate limit attivato — aspetta 5 min |

Per supporto: apri un issue su GitHub o scrivi a `support@citofono.app`.
