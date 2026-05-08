'use client';

interface Props {
  propertyName: string;
  propertyCity: string;
  leadName: string;
  numGuests: number;
  checkInDate: string;
  checkOutDate: string;
  checkInTime: string;
  onNext: () => void;
}

export function Welcome(p: Props) {
  return (
    <div className="guest-step">
      <h1 className="font-display text-3xl font-bold leading-tight">
        Benvenuto a {p.propertyName}.
      </h1>
      <p className="mt-2 text-white/70">
        {p.propertyCity}
      </p>

      <div className="guest-card mt-6 space-y-3 text-sm">
        <Row label="Prenotato da" value={p.leadName} />
        <Row label="Ospiti" value={String(p.numGuests)} />
        <Row label="Check-in" value={`${fmt(p.checkInDate)} dalle ${p.checkInTime}`} />
        <Row label="Check-out" value={fmt(p.checkOutDate)} />
      </div>

      <div className="mt-6 text-sm text-white/70">
        Per consegnarti le chiavi, dobbiamo verificare la tua identità — è obbligo di legge.
        Ci servono <strong>90 secondi</strong>: una foto del tuo documento e un selfie.
      </div>

      <div className="mt-6">
        <button onClick={p.onNext} className="guest-btn">
          Iniziamo →
        </button>
      </div>

      <div className="mt-4 text-center text-xs text-white/40">
        Non scarichi nessuna app. Tutto resta in questo browser.
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
