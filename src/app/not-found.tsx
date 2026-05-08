import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-post/10">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-ink/50">
          Errore 404
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold">Pagina non trovata.</h1>
        <p className="mt-3 text-ink/70">
          Il link è scaduto, errato, oppure questa risorsa è stata rimossa.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="citofono-btn-primary">
            Torna alla home
          </Link>
        </div>
      </div>
    </main>
  );
}
