import Link from 'next/link';

export default function Landing() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <NormativeBox />
      <FeatureGrid />
      <HowItWorks />
      <Pricing />
      <Faq />
      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-ink text-post">●</span>
          <span>Citofono</span>
        </Link>
        <div className="hidden gap-6 md:flex">
          <a href="#come-funziona" className="text-sm text-ink/70 hover:text-ink">Come funziona</a>
          <a href="#prezzi" className="text-sm text-ink/70 hover:text-ink">Prezzi</a>
          <a href="#faq" className="text-sm text-ink/70 hover:text-ink">FAQ</a>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden text-sm text-ink/70 hover:text-ink md:inline">Accedi</Link>
          <Link href="/signup" className="citofono-btn-primary">Prova gratis</Link>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ink/10">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-3xl">
          <span className="inline-flex items-center rounded-full bg-post/30 px-3 py-1 text-xs font-medium text-bell-dark">
            Conforme all'obbligo "de visu" 2026
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Apre la porta. <br />
            Riconosce l'ospite. <br />
            Parla la sua lingua.
          </h1>
          <p className="mt-6 text-lg text-ink/70 md:text-xl">
            Il citofono digitale per il tuo affitto breve: check-in con riconoscimento del documento,
            verifica del volto, concierge AI in 20 lingue e schedine Alloggiati Web pronte per la Polizia.
            Senza app per l'ospite, senza chiavi nascoste, senza dimenticarsi una scadenza.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="citofono-btn-primary text-base">
              Inizia gratis · 3 check-in al mese
            </Link>
            <a href="#come-funziona" className="citofono-btn-secondary text-base">
              Guarda come funziona →
            </a>
          </div>
          <p className="mt-4 text-sm text-ink/50">
            Nessuna carta di credito richiesta. Cancellazione in 1 click.
          </p>
        </div>
      </div>
    </section>
  );
}

function NormativeBox() {
  return (
    <section className="border-b border-ink/10 bg-post/15">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold">Dal 2026 il check-in "de visu" è obbligo di legge.</h3>
            <p className="text-sm text-ink/70">
              Self-check-in con cassetta e codice non basta più. Devi verificare attivamente
              l'identità dell'ospite. Citofono lo fa per te in 90 secondi, automaticamente.
            </p>
          </div>
          <Link href="/signup" className="citofono-btn-primary whitespace-nowrap">
            Mettiti in regola
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    {
      title: 'Check-in con riconoscimento documento',
      body: 'L\'ospite scatta una foto del passaporto o della carta d\'identità. Il sistema legge i dati, valida le cifre di controllo MRZ, e prepara la schedina.',
    },
    {
      title: 'Verifica del volto + liveness',
      body: 'Selfie con micro-sfida (blink, rotazione testa). Confronto biometrico con la foto del documento. Solo il vettore numerico viene salvato — mai la foto.',
    },
    {
      title: 'Concierge AI in 20 lingue',
      body: 'Risponde alle domande dell\'ospite in tedesco, inglese, francese, cinese o giapponese. Pesca dalle informazioni che hai inserito sull\'appartamento.',
    },
    {
      title: 'Alloggiati Web automatico',
      body: 'Genera la schedina nel formato ufficiale della Polizia di Stato. Tu la scarichi e la carichi in 30 secondi. Versione integrata con certificato in arrivo.',
    },
    {
      title: 'CIN + imposta di soggiorno',
      body: 'Tracciamo il tuo Codice Identificativo Nazionale e calcoliamo l\'imposta di soggiorno per ogni Comune.',
    },
    {
      title: 'GDPR-first',
      body: 'Le foto del documento e del selfie sono cancellate dopo la verifica. Resta solo l\'embedding biometrico (un vettore di 128 numeri) per la durata della prenotazione.',
    },
  ];
  return (
    <section className="border-b border-ink/10">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Tutto in un posto.</h2>
        <p className="mt-3 text-ink/70">Quello che oggi fai a mano in un'ora, Citofono lo fa in 90 secondi.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="citofono-card p-6">
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-ink/70">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: '1',
      title: 'Aggiungi un appartamento',
      body: 'Indirizzo, orari, WiFi, regole. La guida casa diventa la knowledge base del concierge AI.',
    },
    {
      n: '2',
      title: 'Crea una prenotazione',
      body: 'Inserisci i dati del soggiorno o lascia che li importiamo da Airbnb e Booking via iCal.',
    },
    {
      n: '3',
      title: 'L\'ospite riceve un link',
      body: 'Apre il link dal telefono. Carica documento, fa il selfie con il blink, accetta i termini GDPR. Tutto in italiano, inglese, o nella sua lingua.',
    },
    {
      n: '4',
      title: 'Tu hai la schedina pronta',
      body: 'Ricevi notifica che l\'ospite è verificato, scarichi il file Alloggiati Web, lo carichi al portale.',
    },
  ];
  return (
    <section id="come-funziona" className="border-b border-ink/10 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Come funziona.</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-post text-base font-bold text-ink">
                {s.n}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-ink/70">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="prezzi" className="border-b border-ink/10">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Prezzi onesti.</h2>
        <p className="mt-3 text-ink/70">Inizia gratis. Paghi solo se ne vale la pena.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <PricingTier
            name="Free"
            price="0€"
            period="per sempre"
            description="Per provare con un soggiorno reale."
            features={['1 appartamento', '3 check-in / mese', 'Concierge AI 20 lingue', 'Alloggiati Web export']}
            cta="Inizia gratis"
            href="/signup"
          />
          <PricingTier
            name="Host"
            price="19€"
            period="al mese"
            description="Per chi affitta un appartamento."
            features={['1 appartamento', 'Check-in illimitati', 'Concierge AI 20 lingue', 'Alloggiati Web export', 'Imposta di soggiorno', 'Reminder check-out']}
            cta="Prova 14 giorni gratis"
            href="/signup?plan=host"
            highlight
          />
          <PricingTier
            name="Host+"
            price="49€"
            period="al mese"
            description="Per chi gestisce 2-5 appartamenti."
            features={['Fino a 5 appartamenti', 'Check-in illimitati', 'Concierge AI 20 lingue', 'Alloggiati Web export', 'Imposta di soggiorno', 'Sync iCal Airbnb/Booking', 'Pulizie & turnover (presto)']}
            cta="Prova 14 giorni gratis"
            href="/signup?plan=host-plus"
          />
        </div>
        <p className="mt-8 text-center text-sm text-ink/60">
          Property manager con 5+ unità: <a href="mailto:sales@citofono.app" className="underline">contattaci</a> per un piano dedicato.
        </p>
      </div>
    </section>
  );
}

function PricingTier({
  name,
  price,
  period,
  description,
  features,
  cta,
  href,
  highlight,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <div className={`citofono-card p-8 ${highlight ? 'border-ink ring-2 ring-post' : ''}`}>
      {highlight && (
        <span className="mb-4 inline-flex items-center rounded-full bg-post px-3 py-1 text-xs font-medium text-ink">
          Più scelto
        </span>
      )}
      <h3 className="font-display text-2xl font-bold">{name}</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-sm text-ink/60">{period}</span>
      </div>
      <p className="mt-2 text-sm text-ink/70">{description}</p>
      <ul className="mt-6 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-ink" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link href={href} className={`mt-8 block text-center ${highlight ? 'citofono-btn-primary' : 'citofono-btn-secondary'}`}>
        {cta}
      </Link>
    </div>
  );
}

function Faq() {
  const items = [
    {
      q: 'Devo davvero verificare l\'identità di ogni ospite?',
      a: 'Sì. Dal 2026 il "self-check-in" passivo (codice in cassetta, niente verifica) non è più conforme alle nuove direttive sul controllo dell\'identità ai fini di pubblica sicurezza. Citofono fa la verifica in modo automatico e tracciabile.',
    },
    {
      q: 'I dati biometrici vengono salvati per sempre?',
      a: 'No. Le foto del documento e del selfie vengono cancellate appena la verifica termina. Restano solo dati anagrafici (necessari per la schedina Alloggiati Web) e un vettore numerico di 128 valori usato per il match biometrico — è impossibile risalire a un\'immagine da quel vettore. Il vettore stesso viene cancellato dopo il check-out.',
    },
    {
      q: 'Cosa succede se l\'OCR sbaglia un dato?',
      a: 'L\'host vede sempre i dati estratti prima di esportare la schedina e può correggerli. Per i passaporti la lettura MRZ ha ~99% di accuratezza grazie alle cifre di controllo. Per le carte d\'identità cartacee italiane più vecchie il sistema avvisa esplicitamente di rivedere i dati.',
    },
    {
      q: 'Funziona con Airbnb, Booking, VRBO?',
      a: 'Sì — importi le prenotazioni via iCal (la URL pubblica del tuo calendario) o le crei a mano. L\'integrazione diretta con le API Airbnb è in roadmap.',
    },
    {
      q: 'L\'ospite deve scaricare un\'app?',
      a: 'No. Riceve un link, lo apre dal browser del suo telefono. Tutto si chiude in 90 secondi.',
    },
    {
      q: 'Posso usare Citofono se non ho la partita IVA?',
      a: 'Sì, anche locazioni brevi non imprenditoriali sono soggette agli adempimenti di pubblica sicurezza. Il piano Free copre questi casi.',
    },
  ];
  return (
    <section id="faq" className="border-b border-ink/10 bg-white">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Domande frequenti.</h2>
        <div className="mt-10 space-y-6">
          {items.map((it) => (
            <details key={it.q} className="rounded-md border border-ink/10 bg-white p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="cursor-pointer text-base font-medium">{it.q}</summary>
              <p className="mt-3 text-sm text-ink/70">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-post text-ink">●</span>
            Citofono
          </div>
          <p className="mt-3 max-w-md text-sm text-white/60">
            Il citofono digitale del tuo affitto breve. Made in Italy.
          </p>
        </div>
        <div className="flex flex-wrap gap-12 text-sm text-white/70">
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">Prodotto</h4>
            <ul className="space-y-2">
              <li><a href="#come-funziona" className="hover:text-white">Come funziona</a></li>
              <li><a href="#prezzi" className="hover:text-white">Prezzi</a></li>
              <li><a href="#faq" className="hover:text-white">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">Legali</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Termini</Link></li>
              <li><Link href="/dpia" className="hover:text-white">DPIA</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-4 text-center text-xs text-white/40">
        © 2026 Citofono. Tutti i diritti riservati.
      </div>
    </footer>
  );
}
