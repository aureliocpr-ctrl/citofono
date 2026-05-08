'use client';

/**
 * Error boundary globale. Mostrato quando una pagina o un server component
 * lancia un'eccezione non gestita. Riceve `reset` per ritentare il render.
 */

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In produzione il digest è la chiave Vercel per lookup nei log.
    // L'utente vede solo il digest, mai lo stack trace.
    console.error('[error.tsx]', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-post/10">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-center">
        <h1 className="font-display text-3xl font-bold">Qualcosa è andato storto.</h1>
        <p className="mt-3 text-ink/70">
          Abbiamo registrato l'errore. Riprova fra qualche secondo. Se persiste,
          scrivici a{' '}
          <a href="mailto:support@citofono.app" className="underline">
            support@citofono.app
          </a>{' '}
          citando questo codice.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-ink/50">codice: {error.digest}</p>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={() => reset()} className="citofono-btn-primary">
            Riprova
          </button>
          <Link href="/" className="citofono-btn-secondary">
            Torna alla home
          </Link>
        </div>
      </div>
    </main>
  );
}
