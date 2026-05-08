import { loadGuestSession } from '@/lib/guestSession';
import { GuestFlow } from './GuestFlow';

export default async function GuestCheckInPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const sess = await loadGuestSession(token);
  if (!sess) {
    return (
      <main className="min-h-screen bg-ink text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-center">
          <h1 className="font-display text-3xl font-bold">Link non valido</h1>
          <p className="mt-3 text-white/70">
            Questo link di check-in è scaduto, è stato annullato, oppure non è mai
            esistito. Contatta il tuo host per richiederne uno nuovo.
          </p>
          <p className="mt-6 text-xs text-white/40">
            Se sei l'host che ha generato il link, verifica che la prenotazione
            sia attiva e che l'appartamento non sia archiviato.
          </p>
        </div>
      </main>
    );
  }

  return (
    <GuestFlow
      token={token}
      propertyName={sess.property.name}
      propertyCity={sess.property.city}
      leadName={sess.booking.leadName}
      numGuests={sess.booking.numGuests}
      checkInDate={sess.booking.checkInDate.toISOString()}
      checkOutDate={sess.booking.checkOutDate.toISOString()}
      checkInTime={sess.property.checkInTime}
    />
  );
}
