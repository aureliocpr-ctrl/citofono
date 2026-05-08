import { loadGuestSession } from '@/lib/guestSession';
import { prisma } from '@/lib/db';
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

  // Quanti ospiti hanno già completato? Serve a far ripartire il contatore
  // multi-guest dal numero giusto (es. il secondo ospite della famiglia
  // apre il link dopo il primo verificato → vede "ospite 2 di 3").
  const alreadyVerified = await prisma.guest.count({
    where: { bookingId: sess.booking.id, verified: true },
  });

  // Already done? Booking completed for this many guests; mostra schermata di
  // completamento, non far rifare il flusso.
  if (alreadyVerified >= sess.booking.numGuests) {
    return (
      <main className="min-h-screen bg-ink text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-center">
          <div className="grid place-items-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-green-500/20 text-4xl">
              ✓
            </div>
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold">Check-in completato</h1>
          <p className="mt-3 text-white/70">
            Tutti gli ospiti della prenotazione sono già stati verificati.
            Per modifiche contatta l'host.
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
      alreadyVerified={alreadyVerified}
      checkInDate={sess.booking.checkInDate.toISOString()}
      checkOutDate={sess.booking.checkOutDate.toISOString()}
      checkInTime={sess.property.checkInTime}
    />
  );
}
