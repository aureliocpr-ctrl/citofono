export const metadata = { title: 'DPIA — Valutazione di impatto' };

export default function Dpia() {
  return (
    <article>
      <h1 className="font-display text-4xl font-bold">DPIA — Valutazione di impatto sulla protezione dei dati</h1>
      <p className="text-sm text-ink/50">Versione 1.0 · Pubblicata il 8 maggio 2026</p>

      <p>
        Questo documento è la <strong>Data Protection Impact Assessment</strong> (DPIA) ai
        sensi dell'art. 35 del GDPR per il trattamento di dati biometrici svolto da Citofono
        nell'ambito della verifica dell'identità degli ospiti di alloggi in affitto breve.
      </p>

      <h2>1. Trattamento descritto</h2>
      <p>
        Citofono raccoglie tre artefatti per ogni ospite: una foto del documento d'identità,
        un selfie con micro-sfide di liveness, e un vettore numerico (embedding facciale,
        128 valori in virgola mobile) derivato dall'analisi delle due immagini. Il vettore
        viene confrontato lato server tramite similarità coseno per stabilire se le due
        immagini ritraggono la stessa persona.
      </p>

      <h2>2. Necessità e proporzionalità</h2>
      <p>
        Il trattamento è strettamente necessario all'adempimento dell'obbligo di "verifica
        de visu" previsto per gli alloggi in affitto breve dal 2026. La verifica documentale
        e biometrica costituisce la modalità tecnicamente più affidabile e meno invasiva
        rispetto, ad esempio, all'incontro fisico in un orario imposto. La quantità di dati
        è ridotta al minimo indispensabile.
      </p>

      <h2>3. Misure tecniche</h2>
      <ul>
        <li>
          <strong>Calcolo dell'embedding nel browser dell'ospite</strong>: la foto e il selfie
          vengono elaborati con <em>face-api.js</em> (modello FaceNet) direttamente nel
          dispositivo dell'utente. Il server riceve solo il vettore numerico (~512 byte),
          non l'immagine.
        </li>
        <li>
          <strong>Cancellazione automatica</strong>: le foto sono cancellate da Cloudflare R2
          appena la verifica termina. Un job notturno (cron) cancella ulteriormente eventuali
          residui dopo 7 giorni.
        </li>
        <li>
          <strong>Embedding non reversibile</strong>: dato il vettore di 128 numeri non è
          tecnicamente possibile ricostruire l'immagine originaria. Salviamo questa
          rappresentazione codificata come bytes (Float32 little-endian).
        </li>
        <li>
          <strong>Audit log</strong>: ogni operazione (OCR, match, cancellazione) è registrata
          con IP, user-agent e timestamp.
        </li>
        <li>
          <strong>Cifratura at rest</strong>: tutti i dati sono cifrati a riposo dal provider
          di database (Postgres su Neon) e di storage (Cloudflare R2).
        </li>
        <li>
          <strong>Cifratura in transito</strong>: TLS 1.3 obbligatorio (HSTS).
        </li>
        <li>
          <strong>Liveness</strong>: il sistema richiede al volto di blinkare e ruotare la testa,
          riducendo la possibilità di spoofing con foto stampate o video pre-registrati.
        </li>
      </ul>

      <h2>4. Misure organizzative</h2>
      <ul>
        <li>
          <strong>Consenso esplicito</strong> per il trattamento dei dati biometrici (art. 9.2.a)
          raccolto e tracciato in <code>auditLog</code> con IP e timestamp.
        </li>
        <li>
          <strong>Diritto alla cancellazione</strong>: l'ospite può chiedere la cancellazione
          immediata scrivendo a <a href="mailto:privacy@citofono.app">privacy@citofono.app</a>,
          fatti salvi i dati richiesti per legge per la pubblica sicurezza.
        </li>
        <li>
          <strong>Trasparenza</strong>: la presente DPIA è pubblica.
        </li>
      </ul>

      <h2>5. Rischi residui e mitigazioni</h2>
      <table>
        <thead>
          <tr><th>Rischio</th><th>Probabilità</th><th>Impatto</th><th>Mitigazione</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Falso positivo del match (scambio di persona)</td>
            <td>Bassa</td>
            <td>Alto</td>
            <td>Soglia conservativa (0.65 cosine), banda di review (0.50–0.65) con verifica manuale dell'host</td>
          </tr>
          <tr>
            <td>Spoofing con foto stampata o video</td>
            <td>Bassa</td>
            <td>Medio</td>
            <td>Liveness attiva (blink + rotazione testa); il liveness fallito blocca la verifica</td>
          </tr>
          <tr>
            <td>Data breach degli embedding</td>
            <td>Bassa</td>
            <td>Medio</td>
            <td>Embedding non sono immagini; cancellati 7gg dopo check-out; cifratura at rest</td>
          </tr>
          <tr>
            <td>OCR errato sui dati anagrafici</td>
            <td>Media</td>
            <td>Basso</td>
            <td>L'host vede sempre i dati prima dell'export, può correggerli; review flag per campi a bassa confidenza</td>
          </tr>
        </tbody>
      </table>

      <h2>6. Decisione</h2>
      <p>
        I rischi residui sono valutati come <strong>accettabili</strong> alla luce del beneficio
        per l'utente (adempimento di un obbligo di legge) e delle misure tecniche adottate.
        La DPIA viene rivista almeno annualmente o in caso di modifiche sostanziali al sistema.
      </p>
    </article>
  );
}
