'use client';

import { useState } from 'react';

interface Props {
  token: string;
  onAccept: (guestId: string) => void;
}

export function Consent({ token, onAccept }: Props) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/guest/${token}/start`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore di sessione. Ricarica la pagina.');
      const data = (await res.json()) as { guestId: string };
      onAccept(data.guestId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
      setSubmitting(false);
    }
  }

  return (
    <div className="guest-step">
      <h1 className="font-display text-2xl font-bold leading-tight">
        Trattamento dei tuoi dati.
      </h1>
      <p className="mt-2 text-sm text-white/70">
        Verifichiamo la tua identità. Per farlo:
      </p>

      <ul className="mt-4 space-y-3 text-sm text-white/80">
        <Item>
          <strong>Documento.</strong> La foto serve solo per leggere i dati anagrafici. Viene
          cancellata appena la verifica termina.
        </Item>
        <Item>
          <strong>Selfie.</strong> Serve solo per il match con il documento. La foto viene
          cancellata; resta un vettore numerico (128 numeri) da cui non si può
          ricostruire l'immagine.
        </Item>
        <Item>
          <strong>Anagrafica.</strong> I dati estratti vengono inviati alla Polizia di Stato
          (Alloggiati Web), come previsto dal TULPS art. 109.
        </Item>
        <Item>
          <strong>Conservazione.</strong> Tutto è cancellato entro 7 giorni dal check-out, ad
          eccezione dei dati richiesti per legge.
        </Item>
      </ul>

      <div className="mt-6">
        <label className="flex items-start gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-white/30 bg-white/10 accent-post"
          />
          <span>
            Ho letto l'<a href="/privacy" target="_blank" className="underline">informativa privacy</a> e
            la <a href="/dpia" target="_blank" className="underline">DPIA</a>. Acconsento al trattamento
            dei dati biometrici (GDPR Art. 9) limitato alla verifica della mia identità.
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-300/50 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-6">
        <button
          disabled={!checked || submitting}
          onClick={handleAccept}
          className="guest-btn"
        >
          {submitting ? 'Avvio...' : 'Acconsento e proseguo'}
        </button>
      </div>
    </div>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-post" />
      <span>{children}</span>
    </li>
  );
}
