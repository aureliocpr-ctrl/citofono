'use client';

import { useState } from 'react';

export function CheckoutButton({ plan, highlight }: { plan: 'HOST' | 'HOST_PLUS'; highlight?: boolean }) {
  const [loading, setLoading] = useState(false);
  async function go() {
    setLoading(true);
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (data.url) {
      window.location.href = data.url;
    } else {
      setLoading(false);
      alert(data.error ?? 'Errore di checkout');
    }
  }
  return (
    <button
      onClick={go}
      disabled={loading}
      className={`mt-4 w-full ${highlight ? 'citofono-btn-primary' : 'citofono-btn-secondary'} disabled:opacity-50`}
    >
      {loading ? 'Apro Stripe...' : `Inizia 14 giorni gratis`}
    </button>
  );
}

export function PortalButton() {
  const [loading, setLoading] = useState(false);
  async function go() {
    setLoading(true);
    const res = await fetch('/api/billing/portal', { method: 'POST' });
    const data = (await res.json()) as { url?: string; error?: string };
    if (data.url) {
      window.location.href = data.url;
    } else {
      setLoading(false);
      alert(data.error ?? 'Errore');
    }
  }
  return (
    <button
      onClick={go}
      disabled={loading}
      className="citofono-btn-secondary mt-6 disabled:opacity-50"
    >
      {loading ? 'Apro...' : 'Gestisci abbonamento'}
    </button>
  );
}
