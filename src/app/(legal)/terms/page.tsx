export const metadata = { title: 'Termini di servizio' };

export default function Terms() {
  return (
    <article>
      <h1 className="font-display text-4xl font-bold">Termini di servizio</h1>
      <p className="text-sm text-ink/50">Ultimo aggiornamento: 8 maggio 2026</p>

      <h2>1. Definizioni</h2>
      <p>
        "Citofono" è il servizio software-as-a-service offerto da Aurelio Capriello.
        "Utente" indica chi crea un account. "Ospite" indica chi completa un check-in.
      </p>

      <h2>2. Oggetto</h2>
      <p>
        Citofono fornisce all'Utente strumenti per la verifica dell'identità degli ospiti
        di alloggi in affitto breve, la generazione del file Alloggiati Web e un assistente
        conversazionale multilingua. La verifica dell'identità è uno strumento ausiliario:
        la responsabilità ultima dell'identificazione dell'ospite resta in capo all'Utente
        ai sensi dell'art. 109 TULPS.
      </p>

      <h2>3. Account</h2>
      <p>
        L'Utente è responsabile della riservatezza delle proprie credenziali e di ogni
        attività compiuta tramite il proprio account. Deve segnalare prontamente accessi
        non autorizzati.
      </p>

      <h2>4. Pagamenti e abbonamento</h2>
      <p>
        I prezzi dei piani sono indicati nella pagina <a href="/billing">Abbonamento</a>.
        I pagamenti sono gestiti da Stripe. L'abbonamento si rinnova automaticamente alla scadenza,
        salvo cancellazione dal Customer Portal di Stripe. Per il piano gratuito ("Free")
        si applicano i limiti dichiarati al momento della registrazione.
      </p>

      <h2>5. Uso accettabile</h2>
      <p>L'Utente si impegna a non:</p>
      <ul>
        <li>usare il servizio per finalità illegali o per facilitare frodi;</li>
        <li>caricare documenti d'identità non autorizzati o ottenuti senza consenso;</li>
        <li>tentare di aggirare meccanismi di sicurezza, scraping massivo, attacchi DoS;</li>
        <li>rivendere il servizio a terzi senza accordo scritto.</li>
      </ul>

      <h2>6. Limitazione di responsabilità</h2>
      <p>
        Il servizio è fornito "as-is". Citofono non garantisce che l'OCR e il match biometrico
        rilevino tutti i tentativi di frode. L'Utente conserva la responsabilità del controllo
        finale dei dati prima del caricamento al portale Alloggiati Web.
        La responsabilità contrattuale di Citofono è limitata al canone pagato negli ultimi
        12 mesi.
      </p>

      <h2>7. Modifiche</h2>
      <p>
        Citofono può modificare questi termini con preavviso di 30 giorni via email.
        L'utilizzo del servizio dopo la modifica costituisce accettazione.
      </p>

      <h2>8. Risoluzione</h2>
      <p>
        L'Utente può cancellare il proprio account in qualsiasi momento dal Customer Portal
        di Stripe o scrivendo a <a href="mailto:support@citofono.app">support@citofono.app</a>.
        Citofono può sospendere account in violazione di questi termini, dandone preavviso.
      </p>

      <h2>9. Legge applicabile e foro</h2>
      <p>
        Si applica la legge italiana. Foro competente esclusivo: Roma.
      </p>
    </article>
  );
}
