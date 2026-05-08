import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-base font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-ink text-post">●</span>
            Citofono
          </Link>
          <Link href="/" className="text-sm text-ink/60 hover:text-ink">← Home</Link>
        </div>
      </header>
      <main className="prose prose-ink mx-auto max-w-3xl px-6 py-12">{children}</main>
    </div>
  );
}
