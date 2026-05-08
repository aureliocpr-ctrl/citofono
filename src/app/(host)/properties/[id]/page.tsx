import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { audit } from '@/lib/audit';

const ChunkSchema = z.object({
  topic: z.string().min(1).max(80),
  content: z.string().min(1).max(4000),
  language: z.string().min(2).max(8).default('it'),
});

const PropertyUpdateSchema = z.object({
  name: z.string().min(2).max(120),
  address: z.string().min(2).max(200),
  city: z.string().min(2).max(80),
  province: z.string().length(2),
  postalCode: z.string().min(4).max(10),
  cin: z.string().max(20).optional().or(z.literal('')),
  alloggiatiCode: z.string().max(20).optional().or(z.literal('')),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/),
  wifiName: z.string().max(80).optional().or(z.literal('')),
  wifiPassword: z.string().max(80).optional().or(z.literal('')),
  icalUrls: z.string().optional(),
  taxPerPersonNight: z.string().optional(),
  taxMaxNights: z.string().optional(),
});

async function updateProperty(formData: FormData) {
  'use server';
  const { user } = await validateRequest();
  if (!user) redirect('/login');
  const propertyId = formData.get('propertyId');
  if (typeof propertyId !== 'string') redirect('/properties');
  const parsed = PropertyUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/properties/${propertyId}?error=invalid`);
  }
  const property = await prisma.property.findFirst({
    where: { id: propertyId, hostId: user.id },
  });
  if (!property) redirect('/properties');

  const icalArr = parsed.data.icalUrls
    ? parsed.data.icalUrls.split('\n').map((s) => s.trim()).filter(Boolean)
    : [];

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      province: parsed.data.province.toUpperCase(),
      postalCode: parsed.data.postalCode,
      cin: parsed.data.cin || null,
      alloggiatiCode: parsed.data.alloggiatiCode || null,
      checkInTime: parsed.data.checkInTime,
      checkOutTime: parsed.data.checkOutTime,
      wifiName: parsed.data.wifiName || null,
      wifiPassword: parsed.data.wifiPassword || null,
      icalUrls: icalArr.length > 0 ? icalArr : Prisma.DbNull,
      taxPerPersonNight: parsed.data.taxPerPersonNight ? Number(parsed.data.taxPerPersonNight) : null,
      taxMaxNights: parsed.data.taxMaxNights ? Number(parsed.data.taxMaxNights) : null,
    },
  });
  await audit({ event: 'property.updated', hostId: user.id, details: { propertyId } });
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath('/properties');
  redirect(`/properties/${propertyId}?ok=updated`);
}

async function archiveProperty(formData: FormData) {
  'use server';
  const { user } = await validateRequest();
  if (!user) redirect('/login');
  const propertyId = formData.get('propertyId');
  const confirm = formData.get('confirm');
  if (typeof propertyId !== 'string') redirect('/properties');
  if (confirm !== 'ARCHIVIA') {
    redirect(`/properties/${propertyId}?error=confirm`);
  }
  const property = await prisma.property.findFirst({
    where: { id: propertyId, hostId: user.id, archivedAt: null },
  });
  if (!property) redirect('/properties');
  // Soft archive: la proprietà non viene più mostrata né sincronizzata, ma le
  // prenotazioni storiche e gli audit log restano (obblighi GDPR / fiscali).
  await prisma.property.update({
    where: { id: propertyId },
    data: { archivedAt: new Date() },
  });
  await audit({ event: 'property.archived', hostId: user.id, details: { propertyId } });
  revalidatePath('/properties');
  redirect('/properties?ok=archived');
}

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

export default async function PropertyDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { user } = await validateRequest();
  if (!user) return null;
  const { id } = await props.params;
  const sp = await props.searchParams;

  const property = await prisma.property.findFirst({
    where: { id, hostId: user.id },
    include: {
      knowledgeChunks: { orderBy: { createdAt: 'desc' } },
      _count: { select: { bookings: true } },
    },
  });
  if (!property) notFound();

  const icalUrls = Array.isArray(property.icalUrls) ? property.icalUrls.filter((x): x is string => typeof x === 'string') : [];
  const icalText = icalUrls.join('\n');

  return (
    <div className="space-y-8">
      <div>
        <Link href="/properties" className="text-sm text-ink/60 hover:text-ink">← Appartamenti</Link>
        <h1 className="mt-2 font-display text-3xl font-bold">{property.name}</h1>
        <p className="mt-1 text-ink/60">{property.address}, {property.city} ({property.province})</p>
        {property.archivedAt && (
          <p className="mt-2 inline-block rounded bg-amber-100 px-2 py-1 text-xs text-amber-900">
            Archiviata il {property.archivedAt.toLocaleDateString('it-IT')} — solo lettura
          </p>
        )}
      </div>

      {sp.ok === 'updated' && (
        <div className="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          Modifiche salvate.
        </div>
      )}
      {sp.error === 'invalid' && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          Controlla i campi: c'è un valore non valido.
        </div>
      )}
      {sp.error === 'confirm' && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          Per archiviare devi digitare esattamente <code>ARCHIVIA</code> nella conferma.
        </div>
      )}

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

      {!property.archivedAt && (
        <section className="citofono-card p-6">
          <h2 className="font-display text-xl font-bold">Modifica appartamento</h2>
          <form action={updateProperty} className="mt-6 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="propertyId" value={property.id} />
            <Field name="name" label="Nome" defaultValue={property.name} required />
            <Field name="address" label="Indirizzo" defaultValue={property.address} required />
            <Field name="city" label="Città" defaultValue={property.city} required />
            <Field name="province" label="Provincia (sigla)" defaultValue={property.province} required maxLength={2} />
            <Field name="postalCode" label="CAP" defaultValue={property.postalCode} required />
            <Field name="cin" label="CIN" defaultValue={property.cin ?? ''} />
            <Field name="alloggiatiCode" label="Codice Alloggiati Web" defaultValue={property.alloggiatiCode ?? ''} />
            <Field name="checkInTime" label="Check-in (HH:MM)" defaultValue={property.checkInTime} required />
            <Field name="checkOutTime" label="Check-out (HH:MM)" defaultValue={property.checkOutTime} required />
            <Field name="wifiName" label="WiFi SSID" defaultValue={property.wifiName ?? ''} />
            <Field name="wifiPassword" label="WiFi password" defaultValue={property.wifiPassword ?? ''} type="text" />
            <Field name="taxPerPersonNight" label="Imposta soggiorno €/notte (override)" defaultValue={property.taxPerPersonNight?.toString() ?? ''} type="number" step="0.01" />
            <Field name="taxMaxNights" label="Notti tassate max (override)" defaultValue={property.taxMaxNights?.toString() ?? ''} type="number" />
            <div className="md:col-span-2">
              <label htmlFor="icalUrls" className="citofono-label">URL iCal (uno per riga)</label>
              <textarea
                id="icalUrls"
                name="icalUrls"
                rows={3}
                defaultValue={icalText}
                className="citofono-input mt-1 font-mono text-xs"
                placeholder="https://www.airbnb.it/calendar/ical/..."
              />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="citofono-btn-primary">Salva modifiche</button>
            </div>
          </form>
        </section>
      )}

      {!property.archivedAt && (
        <section className="rounded-lg border border-red-200 bg-red-50/50 p-6">
          <h2 className="font-display text-xl font-bold text-red-800">Zona pericolosa</h2>
          <p className="mt-1 text-sm text-red-900/80">
            Archiviare l'appartamento lo nasconde dalla lista e ferma la sincronizzazione iCal.
            Le prenotazioni storiche e gli audit log restano per obblighi GDPR e fiscali.
          </p>
          <form action={archiveProperty} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="propertyId" value={property.id} />
            <div className="flex-1">
              <label htmlFor="confirm" className="text-xs uppercase tracking-wider text-red-900/80">
                Per confermare scrivi <code>ARCHIVIA</code>
              </label>
              <input
                id="confirm"
                name="confirm"
                required
                className="citofono-input mt-1 border-red-300"
                autoComplete="off"
              />
            </div>
            <button type="submit" className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              Archivia appartamento
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
  type = 'text',
  step,
  maxLength,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
  step?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="citofono-label">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        maxLength={maxLength}
        defaultValue={defaultValue}
        required={required}
        className="citofono-input mt-1"
      />
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
