export const metadata = { title: 'Privacy Policy' };

export default function Privacy() {
  return (
    <article>
      <h1 className="font-display text-4xl font-bold">Privacy Policy</h1>
      <p className="text-sm text-ink/50">Ultimo aggiornamento: 8 maggio 2026</p>

      <h2>1. Titolare del trattamento</h2>
      <p>
        Aurelio Capriello — email <a href="mailto:privacy@citofono.app">privacy@citofono.app</a>.
        In qualità di titolare del trattamento (data controller) per i dati raccolti
        dal sito e dall'applicazione "Citofono".
      </p>

      <h2>2. Categorie di dati trattati</h2>
      <p>Distinguiamo due categorie di interessati:</p>
      <ul>
        <li>
          <strong>Host</strong> (il proprietario o gestore dell'alloggio): nome, email,
          password (in forma di hash argon2id), dati fiscali opzionali (P.IVA, codice fiscale),
          dati di pagamento gestiti da Stripe (non sono mai sui nostri server).
        </li>
        <li>
          <strong>Ospite</strong> (chi soggiorna nell'alloggio): nome, cognome, sesso, data e
          luogo di nascita, cittadinanza, tipo e numero del documento d'identità, paese di
          rilascio, scadenza, foto del documento, selfie, vettore biometrico facciale di 128 valori
          (cosiddetto "embedding"), indirizzo IP e user-agent del dispositivo.
        </li>
      </ul>

      <h2>3. Finalità e basi giuridiche</h2>
      <p>I dati dell'ospite sono trattati per:</p>
      <ul>
        <li>
          <strong>Adempimento di obbligo di legge</strong> (art. 6.1.c GDPR): identificazione
          delle persone alloggiate ai sensi dell'art. 109 del TULPS (R.D. 18 giugno 1931, n. 773)
          e disposizioni 2026 sulla verifica "de visu" dell'identità. La comunicazione dei dati
          alla Polizia di Stato (portale Alloggiati Web) è imposta dalla legge.
        </li>
        <li>
          <strong>Esecuzione di un contratto</strong> (art. 6.1.b): l'host deve verificare l'ospite
          per consegnare le chiavi e adempiere agli obblighi della prenotazione.
        </li>
        <li>
          <strong>Consenso esplicito</strong> per la categoria particolare dei dati biometrici
          (art. 9.2.a GDPR): il volto dell'ospite e il vettore derivato sono dati biometrici
          il cui trattamento richiede il tuo esplicito consenso, che raccogliamo all'inizio
          del flusso di check-in.
        </li>
      </ul>

      <h2>4. Conservazione</h2>
      <ul>
        <li>
          <strong>Foto del documento e selfie</strong>: cancellate al termine della verifica
          o comunque entro 7 giorni dal check-out, qualunque sia stato l'esito.
        </li>
        <li>
          <strong>Embedding biometrico</strong> (vettore di 128 numeri): conservato per la durata
          del soggiorno + 7 giorni di tolleranza, poi cancellato. L'embedding non è reversibile:
          è impossibile ricostruire l'immagine originale a partire da esso.
        </li>
        <li>
          <strong>Dati anagrafici</strong> (nome, cognome, ecc.) e <strong>dato del documento</strong>:
          conservati per il termine di legge richiesto dalla normativa di pubblica sicurezza
          (al momento, fino a 5 anni). Vengono comunicati al portale Alloggiati Web della
          Polizia di Stato.
        </li>
        <li>
          <strong>Audit log</strong> (eventi tecnici, IP, user-agent): conservati 24 mesi per
          finalità di sicurezza informatica e per dimostrare la conformità in caso di ispezione.
        </li>
      </ul>

      <h2>5. Destinatari dei dati</h2>
      <p>I tuoi dati possono essere trasmessi a:</p>
      <ul>
        <li>
          <strong>Polizia di Stato — Alloggiati Web</strong>: dati anagrafici e del documento, in
          adempimento di obbligo di legge.
        </li>
        <li>
          <strong>Stripe Payments Europe Ltd.</strong>: pagamenti dell'host.
        </li>
        <li>
          <strong>Anthropic PBC</strong>: il messaggio testuale che invii al concierge AI viene
          processato da Claude. Non vengono inviati dati biometrici, foto o dati anagrafici.
        </li>
        <li>
          <strong>Resend</strong>: email transazionali (link di check-in, conferme).
        </li>
        <li>
          <strong>Cloudflare R2</strong>: storage temporaneo delle foto (cancellate dopo verifica).
        </li>
        <li>
          <strong>Vercel Inc.</strong>: hosting dell'applicazione.
        </li>
      </ul>

      <h2>6. I tuoi diritti</h2>
      <p>Puoi esercitare in qualsiasi momento i diritti di:</p>
      <ul>
        <li>accesso ai tuoi dati (art. 15 GDPR);</li>
        <li>rettifica (art. 16);</li>
        <li>cancellazione (art. 17), ad eccezione dei dati conservati per obbligo di legge;</li>
        <li>limitazione del trattamento (art. 18);</li>
        <li>opposizione (art. 21);</li>
        <li>portabilità (art. 20);</li>
        <li>revoca del consenso, senza pregiudizio della liceità del trattamento già effettuato.</li>
      </ul>
      <p>
        Scrivi a <a href="mailto:privacy@citofono.app">privacy@citofono.app</a>. Hai inoltre
        il diritto di proporre reclamo al Garante per la protezione dei dati personali
        (<a href="https://www.gpdp.it" target="_blank" rel="noreferrer noopener">www.gpdp.it</a>).
      </p>

      <h2>7. Trasferimenti extra-UE</h2>
      <p>
        Stripe e Anthropic possono trasferire dati negli Stati Uniti. I trasferimenti sono basati
        sulle clausole contrattuali standard della Commissione Europea (Standard Contractual
        Clauses 2021).
      </p>

      <h2>8. Modifiche</h2>
      <p>
        Le modifiche a questa policy sono pubblicate qui con data di aggiornamento. Per modifiche
        sostanziali ti notifichiamo via email.
      </p>
    </article>
  );
}
