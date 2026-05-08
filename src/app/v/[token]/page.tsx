import { notFound } from 'next/navigation';
import { loadGuestSession } from '@/lib/guestSession';
import { GuestFlow } from './GuestFlow';

export default async function GuestCheckInPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const sess = await loadGuestSession(token);
  if (!sess) notFound();

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
