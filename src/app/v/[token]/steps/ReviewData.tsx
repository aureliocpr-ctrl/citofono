'use client';

import { useState } from 'react';
import { ALL_COUNTRIES } from '@/lib/ocr/countries';

interface Fields {
  surname?: string;
  givenNames?: string;
  birthDate?: string;
  nationality?: string;
  documentType?: string;
  documentNumber?: string;
  issuingCountry?: string;
  sex?: 'M' | 'F' | 'X';
  expirationDate?: string;
}

interface Props {
  token: string;
  guestId: string;
  fields: Fields;
  needsReview: string[];
  onConfirmed: () => void;
}

export function ReviewData({ token, guestId, fields, needsReview, onConfirmed }: Props) {
  // Convert italianized country names back to ISO3 if possible.
  const initialNationality = ALL_COUNTRIES.find(
    (c) => c.italianName === fields.nationality?.toUpperCase(),
  )?.code3 ?? 'ITA';
  const initialIssuing = ALL_COUNTRIES.find(
    (c) => c.italianName === fields.issuingCountry?.toUpperCase(),
  )?.code3 ?? initialNationality;

  const [firstName, setFirstName] = useState(fields.givenNames ?? '');
  const [lastName, setLastName] = useState(fields.surname ?? '');
  const [birthDate, setBirthDate] = useState(fields.birthDate ?? '');
  const [nationality, setNationality] = useState(initialNationality);
  const [birthCountry, setBirthCountry] = useState(initialNationality);
  const [sex, setSex] = useState<'M' | 'F' | 'X'>(fields.sex ?? 'M');
  const [docType, setDocType] = useState<string>(fields.documentType ?? 'ID_CARD');
  const [docNumber, setDocNumber] = useState(fields.documentNumber ?? '');
  const [docIssuing, setDocIssuing] = useState(initialIssuing);
  const [docExpires, setDocExpires] = useState(fields.expirationDate ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/guest/${token}/confirm-data`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          guestId,
          firstName,
          lastName,
          birthDate,
          birthCountry,
          nationality,
          sex,
          documentType: docType,
          documentNumber: docNumber,
          documentIssuingCountry: docIssuing,
          documentExpiresAt: docExpires || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Errore di salvataggio');
      }
      onConfirmed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
      setSubmitting(false);
    }
  }

  function reviewClass(field: string): string {
    return needsReview.includes(field) ? 'border-yellow-500' : '';
  }

  return (
    <div className="guest-step">
      <h1 className="font-display text-2xl font-bold leading-tight">Controlla i dati.</h1>
      <p className="mt-2 text-sm text-white/70">
        Abbiamo letto questi dati dal documento. Correggi quello che non è giusto.
      </p>

      {needsReview.length > 0 && (
        <div className="mt-4 rounded-md border border-yellow-500/40 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-200">
          Alcuni campi non erano nitidi: {needsReview.join(', ')}. Verifica con cura.
        </div>
      )}

      <div className="mt-6 space-y-4">
        <Field label="Cognome">
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={`guest-input ${reviewClass('surname')}`} />
        </Field>
        <Field label="Nome">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`guest-input ${reviewClass('givenNames')}`} />
        </Field>
        <Field label="Data di nascita">
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={`guest-input ${reviewClass('birthDate')}`} />
        </Field>
        <Field label="Sesso">
          <select value={sex} onChange={(e) => setSex(e.target.value as 'M' | 'F' | 'X')} className="guest-input">
            <option value="M">Maschio</option>
            <option value="F">Femmina</option>
            <option value="X">Altro</option>
          </select>
        </Field>
        <Field label="Cittadinanza">
          <CountrySelect value={nationality} onChange={setNationality} />
        </Field>
        <Field label="Paese di nascita">
          <CountrySelect value={birthCountry} onChange={setBirthCountry} />
        </Field>
        <Field label="Tipo documento">
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="guest-input">
            <option value="PASSPORT">Passaporto</option>
            <option value="ID_CARD">Carta d'identità</option>
            <option value="DRIVING_LICENSE">Patente</option>
            <option value="RESIDENCE_PERMIT">Permesso di soggiorno</option>
            <option value="OTHER">Altro</option>
          </select>
        </Field>
        <Field label="Numero documento">
          <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} className={`guest-input uppercase ${reviewClass('documentNumber')}`} />
        </Field>
        <Field label="Paese di rilascio">
          <CountrySelect value={docIssuing} onChange={setDocIssuing} />
        </Field>
        <Field label="Scadenza documento">
          <input type="date" value={docExpires} onChange={(e) => setDocExpires(e.target.value)} className="guest-input" />
        </Field>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-300/50 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-6">
        <button onClick={handleSubmit} disabled={submitting} className="guest-btn">
          {submitting ? 'Salvo...' : 'Confermo i dati →'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-white/50">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="guest-input">
      {ALL_COUNTRIES.map((c) => (
        <option key={c.code3} value={c.code3}>
          {c.italianName}
        </option>
      ))}
    </select>
  );
}
