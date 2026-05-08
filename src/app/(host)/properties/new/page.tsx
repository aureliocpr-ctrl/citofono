import { redirect } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

const PropertySchema = z.object({
  name: z.string().min(2).max(120),
  address: z.string().min(2).max(200),
  city: z.string().min(2).max(80),
  province: z.string().length(2).toUpperCase(),
  postalCode: z.string().min(4).max(10),
  cin: z.string().max(20).optional(),
  alloggiatiCode: z.string().max(20).optional(),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/).default('15:00'),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/).default('10:00'),
  wifiName: z.string().max(80).optional(),
  wifiPassword: z.string().max(80).optional(),
  guideMarkdown: z.string().max(20_000).optional(),
  icalUrls: z.string().max(2000).optional(),
  taxPerPersonNight: z.string().max(10).optional(),
  taxMaxNights: z.string().max(4).optional(),
});

async function createPropertyAction(formData: FormData) {
  'use server';
  const { user } = await validateRequest();
  if (!user) redirect('/login');

  const raw = Object.fromEntries(formData);
  const parsed = PropertySchema.safeParse(raw);
  if (!parsed.success) {
    redirect('/properties/new?error=invalid');
  }
  const icalUrls = (parsed.data.icalUrls ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith('http'));

  const taxPerPersonNight = parsed.data.taxPerPersonNight
    ? Number(parsed.data.taxPerPersonNight.replace(',', '.'))
    : null;
  const taxMaxNights = parsed.data.taxMaxNights ? parseInt(parsed.data.taxMaxNights, 10) : null;

  await prisma.property.create({
    data: {
      hostId: user.id,
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      province: parsed.data.province,
      postalCode: parsed.data.postalCode,
      checkInTime: parsed.data.checkInTime,
      checkOutTime: parsed.data.checkOutTime,
      cin: parsed.data.cin || null,
      alloggiatiCode: parsed.data.alloggiatiCode || null,
      wifiName: parsed.data.wifiName || null,
      wifiPassword: parsed.data.wifiPassword || null,
      guideMarkdown: parsed.data.guideMarkdown || null,
      icalUrls: icalUrls.length > 0 ? icalUrls : undefined,
      taxPerPersonNight: taxPerPersonNight && Number.isFinite(taxPerPersonNight) ? taxPerPersonNight : null,
      taxMaxNights: taxMaxNights && Number.isFinite(taxMaxNights) ? taxMaxNights : null,
    },
  });
  redirect('/properties');
}

export default function NewPropertyPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/properties" className="text-sm text-ink/60 hover:text-ink">← Appartamenti</Link>
        <h1 className="mt-2 font-display text-3xl font-bold">Nuovo appartamento</h1>
      </div>
      <form action={createPropertyAction} className="citofono-card max-w-2xl space-y-5 p-6">
        <Field name="name" label="Nome (uso interno)" placeholder="Casa al mare Sperlonga" required />
        <Field name="address" label="Indirizzo" placeholder="Via Roma 1" required />
        <div className="grid gap-5 md:grid-cols-3">
          <Field name="city" label="Comune" placeholder="Sperlonga" required />
          <Field name="province" label="Provincia (sigla)" placeholder="LT" required maxLength={2} />
          <Field name="postalCode" label="CAP" placeholder="04029" required maxLength={5} />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field name="cin" label="CIN (Codice Identificativo Nazionale)" placeholder="IT0612345..." />
          <Field name="alloggiatiCode" label="Codice struttura Alloggiati" placeholder="12345" />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field name="checkInTime" label="Orario check-in" defaultValue="15:00" />
          <Field name="checkOutTime" label="Orario check-out" defaultValue="10:00" />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field name="wifiName" label="WiFi nome" placeholder="CasaMare-WiFi" />
          <Field name="wifiPassword" label="WiFi password" />
        </div>
        <div>
          <label htmlFor="guideMarkdown" className="citofono-label">Guida casa (markdown)</label>
          <textarea
            id="guideMarkdown"
            name="guideMarkdown"
            rows={8}
            placeholder={`# Benvenuti\n\nIl riscaldamento si accende dal termostato in salotto.\nIl parcheggio è in via X numero 5.`}
            className="citofono-input mt-1 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-ink/50">
            Il concierge AI userà questo testo per rispondere alle domande degli ospiti in 20 lingue.
          </p>
        </div>

        <fieldset className="space-y-3 rounded-md border border-ink/10 p-4">
          <legend className="px-2 text-xs uppercase tracking-wider text-ink/50">Sync calendari</legend>
          <div>
            <label htmlFor="icalUrls" className="citofono-label">URL iCal (uno per riga)</label>
            <textarea
              id="icalUrls"
              name="icalUrls"
              rows={3}
              placeholder={`https://www.airbnb.com/calendar/ical/...\nhttps://admin.booking.com/hotel/hoteladmin/.../ical?...`}
              className="citofono-input mt-1 font-mono text-xs"
            />
            <p className="mt-1 text-xs text-ink/50">
              Sincronizziamo le prenotazioni ogni 30 min. Su Airbnb: Calendario → Esporta calendario.
            </p>
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-md border border-ink/10 p-4">
          <legend className="px-2 text-xs uppercase tracking-wider text-ink/50">Imposta di soggiorno</legend>
          <p className="text-xs text-ink/50">
            Se il Comune dell'appartamento è nel nostro elenco, applichiamo automaticamente la tariffa giusta.
            Sovrascrivi solo se la tua tariffa è diversa (regimi speciali, esenzioni di legge particolari).
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <Field name="taxPerPersonNight" label="€/persona/notte (override)" placeholder="3,00" />
            <Field name="taxMaxNights" label="Notti massime (override)" placeholder="10" />
          </div>
        </fieldset>

        <div className="flex gap-3">
          <button type="submit" className="citofono-btn-primary">Salva appartamento</button>
          <Link href="/properties" className="citofono-btn-secondary">Annulla</Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  ...rest
}: {
  name: string;
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="citofono-label">{label}</label>
      <input id={name} name={name} className="citofono-input mt-1" {...rest} />
    </div>
  );
}
