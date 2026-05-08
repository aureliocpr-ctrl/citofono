'use client';

import { useEffect, useState } from 'react';

interface Props {
  token: string;
  guestId: string;
  selfieEmbedding: number[];
  docEmbedding: number[];
  livenessPassed: boolean;
  livenessChallenge: string;
  onResolved: (verdict: 'match' | 'review' | 'reject', similarity: number) => void;
}

export function Matching(p: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/guest/${p.token}/verify`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            guestId: p.guestId,
            selfieEmbedding: p.selfieEmbedding,
            docEmbedding: p.docEmbedding,
            livenessPassed: p.livenessPassed,
            livenessChallenge: p.livenessChallenge,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? 'Match fallito');
        }
        const data = (await res.json()) as { verdict: 'match' | 'review' | 'reject'; similarity: number };
        if (!cancelled) p.onResolved(data.verdict, data.similarity);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Errore.');
      }
    })();
    return () => {
      cancelled = true;
    };
    // We intentionally only fire once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="guest-step">
        <div className="rounded-md border border-red-300/50 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="guest-step text-center">
      <div className="mt-12 inline-block">
        <Spinner />
      </div>
      <h2 className="mt-6 font-display text-xl font-bold">Verifico l'identità...</h2>
      <p className="mt-2 text-sm text-white/60">Pochi secondi.</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="grid place-items-center">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-post" />
    </div>
  );
}
