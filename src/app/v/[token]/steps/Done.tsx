'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

interface Props {
  verdict: 'match' | 'review' | 'reject';
  checkInTime: string;
  propertyName: string;
  guestNumber?: number;
  totalGuests?: number;
  verifiedCount?: number;
  /** Quando definito, sul match mostra anche il bottone "Continua col prossimo ospite". */
  onContinueNext?: () => void;
}

export function Done({
  verdict,
  checkInTime,
  propertyName,
  guestNumber,
  totalGuests,
  verifiedCount,
  onContinueNext,
}: Props) {
  return (
    <div className="guest-step">
      {verdict === 'match' && (
        <Success
          checkInTime={checkInTime}
          propertyName={propertyName}
          guestNumber={guestNumber}
          totalGuests={totalGuests}
          verifiedCount={verifiedCount}
          onContinueNext={onContinueNext}
        />
      )}
      {verdict === 'review' && <ReviewPending propertyName={propertyName} />}
      {verdict === 'reject' && <Rejected />}
      <Concierge propertyName={propertyName} />
    </div>
  );
}

function Success({
  checkInTime,
  propertyName,
  guestNumber,
  totalGuests,
  verifiedCount,
  onContinueNext,
}: {
  checkInTime: string;
  propertyName: string;
  guestNumber?: number;
  totalGuests?: number;
  verifiedCount?: number;
  onContinueNext?: () => void;
}) {
  const showProgress =
    typeof totalGuests === 'number' && totalGuests > 1 && typeof verifiedCount === 'number';
  const remaining = showProgress ? Math.max(0, totalGuests! - (verifiedCount ?? 0)) : 0;

  return (
    <>
      <div className="grid place-items-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-green-500/20 text-4xl">
          ✓
        </div>
      </div>
      <h1 className="mt-6 text-center font-display text-3xl font-bold">
        {showProgress ? `Ospite ${guestNumber} verificato!` : 'Tutto pronto!'}
      </h1>
      {showProgress && remaining > 0 ? (
        <>
          <p className="mt-3 text-center text-white/70">
            {verifiedCount} di {totalGuests} ospiti verificati. Mancano ancora{' '}
            {remaining === 1 ? '1 ospite' : `${remaining} ospiti`}.
          </p>
          {onContinueNext && (
            <button
              onClick={onContinueNext}
              className="guest-btn-primary mt-6 w-full"
            >
              Continua con il prossimo ospite →
            </button>
          )}
          <p className="mt-3 text-center text-xs text-white/50">
            Passa il telefono al prossimo ospite della prenotazione.
          </p>
        </>
      ) : (
        <p className="mt-3 text-center text-white/70">
          L'identità è verificata. Ti aspettiamo a {propertyName} dalle{' '}
          <strong>{checkInTime}</strong>.
        </p>
      )}
    </>
  );
}

function ReviewPending({ propertyName }: { propertyName: string }) {
  return (
    <>
      <div className="grid place-items-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-yellow-500/20 text-4xl">
          ⏳
        </div>
      </div>
      <h1 className="mt-6 text-center font-display text-3xl font-bold">Quasi pronto.</h1>
      <p className="mt-3 text-center text-white/70">
        Il match richiede un controllo manuale dell'host di {propertyName}. Riceverai una conferma a breve.
      </p>
    </>
  );
}

function Rejected() {
  return (
    <>
      <div className="grid place-items-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-red-500/20 text-4xl">
          ⚠
        </div>
      </div>
      <h1 className="mt-6 text-center font-display text-3xl font-bold">Non riusciamo a verificarti.</h1>
      <p className="mt-3 text-center text-white/70">
        La foto del documento e il selfie non corrispondono. Contatta direttamente l'host.
      </p>
    </>
  );
}

function Concierge({ propertyName }: { propertyName: string }) {
  const params = useParams<{ token: string }>();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: `Ciao! Sono il concierge di ${propertyName}. Posso rispondere alle tue domande in italiano, English, Deutsch, Français, Español, 中文, 日本語 e altre lingue.` },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!input.trim() || sending) return;
    const userMsg = { role: 'user' as const, content: input };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setSending(true);
    try {
      const res = await fetch(`/api/concierge/${params.token}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages.slice(-6),
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (data.reply) {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply! }]);
      } else {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: 'Mi dispiace, ho avuto un problema. Riprova.' },
        ]);
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Errore di rete. Riprova.' }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="guest-btn-secondary"
      >
        {open ? 'Chiudi concierge' : 'Apri concierge AI 💬'}
      </button>

      {open && (
        <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="max-h-72 space-y-3 overflow-y-auto text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div
                  className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 ${
                    m.role === 'user' ? 'bg-post text-ink' : 'bg-white/10 text-white'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && <div className="text-xs text-white/50">scrivendo...</div>}
          </div>
          <div className="flex gap-2">
            <input
              className="guest-input flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Domanda al concierge..."
              disabled={sending}
            />
            <button onClick={send} disabled={sending || !input.trim()} className="rounded-md bg-post px-4 py-2 text-sm font-medium text-ink disabled:opacity-50">
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
