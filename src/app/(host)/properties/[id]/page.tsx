import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

const ChunkSchema = z.object({
  topic: z.string().min(1).max(80),
  content: z.string().min(1).max(4000),
  language: z.string().min(2).max(8).default('it'),
});

async function addChunk(formData: FormData) {
  'use server';
  const { user } = await validateRequest();
  if (!user) redirect('/login');
  const propertyId = formData.get('propertyId');
  if (typeof propertyId !== 'string') redirect('/properties');
  const parsed = ChunkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const property = await prisma.property.findFirst({
    where: { id: propertyId, hostId: user.id },
  });
  if (!property) return;
  await prisma.knowledgeChunk.create({
    data: {
      propertyId,
      topic: parsed.data.topic,
      content: parsed.data.content,
      language: parsed.data.language,
    },
  });
  revalidatePath(`/properties/${propertyId}`);
}

async function deleteChunk(formData: FormData) {
  'use server';
  const { user } = await validateRequest();
  if (!user) redirect('/login');
  const id = formData.get('id');
  const propertyId = formData.get('propertyId');
  if (typeof id !== 'string' || typeof propertyId !== 'string') return;
  // verify ownership through join
  const chunk = await prisma.knowledgeChunk.findFirst({
    where: { id, property: { hostId: user.id } },
  });
  if (!chunk) return;
  await prisma.knowledgeChunk.delete({ where: { id } });
  revalidatePath(`/properties/${propertyId}`);
}

export default async function PropertyDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user } = await validateRequest();
  if (!user) return null;
  const { id } = await props.params;

  const property = await prisma.property.findFirst({
    where: { id, hostId: user.id },
    include: {
      knowledgeChunks: { orderBy: { createdAt: 'desc' } },
      _count: { select: { bookings: true } },
    },
  });
  if (!property) notFound();

  const icalUrls = Array.isArray(property.icalUrls) ? property.icalUrls.filter((x): x is string => typeof x === 'string') : [];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/properties" className="text-sm text-ink/60 hover:text-ink">← Appartamenti</Link>
        <h1 className="mt-2 font-display text-3xl font-bold">{property.name}</h1>
        <p className="mt-1 text-ink/60">{property.address}, {property.city} ({property.province})</p>
      </div>

      <section className="citofono-card p-6">
        <h2 className="font-display text-xl font-bold">Riepilogo</h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <Info label="CIN" value={property.cin ?? '—'} />
          <Info label="Codice Alloggiati" value={property.alloggiatiCode ?? '—'} />
          <Info label="Check-in" value={property.checkInTime} />
          <Info label="Check-out" value={property.checkOutTime} />
          <Info label="WiFi" value={property.wifiName ?? '—'} />
          <Info label="Prenotazioni totali" value={String(property._count.bookings)} />
          <Info label="iCal sincronizzati" value={icalUrls.length > 0 ? `${icalUrls.length} URL` : 'nessuno'} />
          <Info
            label="Imposta soggiorno (override)"
            value={
              property.taxPerPersonNight
                ? `${property.taxPerPersonNight}€/notte · max ${property.taxMaxNights ?? '–'}gg`
                : '—'
            }
          />
        </dl>
      </section>

      <section className="citofono-card p-6">
        <h2 className="font-display text-xl font-bold">Knowledge base concierge</h2>
        <p className="mt-1 text-sm text-ink/60">
          Aggiungi domande e risposte ricorrenti. Il concierge AI le userà per rispondere agli ospiti.
        </p>

        <div className="mt-6 space-y-3">
          {property.knowledgeChunks.length === 0 ? (
            <p className="text-sm text-ink/50">Nessuna voce ancora.</p>
          ) : (
            property.knowledgeChunks.map((c) => (
              <div key={c.id} className="rounded-md border border-ink/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{c.topic}</div>
                  <form action={deleteChunk}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="propertyId" value={property.id} />
                    <button type="submit" className="text-xs text-red-600 hover:underline">elimina</button>
                  </form>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{c.content}</p>
              </div>
            ))
          )}
        </div>

        <form action={addChunk} className="mt-6 space-y-3 border-t border-ink/10 pt-6">
          <input type="hidden" name="propertyId" value={property.id} />
          <div>
            <label htmlFor="topic" className="citofono-label">Argomento</label>
            <input
              id="topic"
              name="topic"
              required
              className="citofono-input mt-1"
              placeholder="parcheggio · spazzatura · climatizzatore · serrature..."
            />
          </div>
          <div>
            <label htmlFor="content" className="citofono-label">Contenuto</label>
            <textarea
              id="content"
              name="content"
              required
              rows={4}
              className="citofono-input mt-1"
              placeholder="Es: Il parcheggio è in via Garibaldi 5, primo piano. Codice cancello: 1234."
            />
          </div>
          <div className="flex items-end gap-3">
            <div>
              <label htmlFor="language" className="citofono-label">Lingua</label>
              <select id="language" name="language" defaultValue="it" className="citofono-input mt-1">
                <option value="it">Italiano</option>
                <option value="en">English</option>
              </select>
            </div>
            <button type="submit" className="citofono-btn-primary">+ Aggiungi voce</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink/50">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
