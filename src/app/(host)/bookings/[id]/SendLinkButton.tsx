'use client';

import { useState } from 'react';

export function SendLinkButton({ bookingId, hasEmail }: { bookingId: string; hasEmail: boolean }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!hasEmail) {
    return (
      <span className="text-xs text-ink/50">
        L'ospite non ha email registrata. Copia il link e invialo come preferisci.
      </span>
    );
  }

  async function send() {
    setState('sending');
    setErrorMsg(null);
    const res = await fetch(`/api/bookings/${bookingId}/send-link`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lang: 'it' }),
    });
    if (res.ok) {
      setState('sent');
      setTimeout(() => setState('idle'), 4000);
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.message ?? data.error ?? 'Errore');
      setState('error');
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button onClick={send} disabled={state === 'sending'} className="citofono-btn-primary text-sm">
        {state === 'sending' ? 'Invio...' : state === 'sent' ? 'Inviato ✓' : 'Invia link via email'}
      </button>
      {state === 'error' && errorMsg && <span className="text-xs text-red-600">{errorMsg}</span>}
    </div>
  );
}
