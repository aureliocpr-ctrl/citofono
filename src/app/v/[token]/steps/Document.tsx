'use client';

import { useRef, useState } from 'react';
import { embeddingFromFile } from '@/lib/face/client';

interface DocumentResult {
  fields: {
    surname?: string;
    givenNames?: string;
    birthDate?: string;
    nationality?: string;
    documentType?: string;
    documentNumber?: string;
    issuingCountry?: string;
    sex?: 'M' | 'F' | 'X';
    expirationDate?: string;
  };
  confidence: number;
  needsReview: string[];
  docEmbedding: number[];
}

interface Props {
  token: string;
  guestId: string;
  onNext: (data: DocumentResult) => void;
}

export function DocumentStep({ token, guestId, onNext }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSelect(f: File) {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      // 1. Compute face embedding from the document photo, browser-side.
      setStatusMsg('Cerco il volto sul documento...');
      const embedding = await embeddingFromFile(file);
      if (!embedding) {
        throw new Error(
          'Non riusciamo a vedere un volto sul documento. Inquadra meglio la foto del passaporto/CdI e riprova.',
        );
      }

      // 2. Send the file to the server for OCR.
      setStatusMsg('Leggo i dati...');
      const fd = new FormData();
      fd.set('guestId', guestId);
      fd.set('side', 'FRONT');
      fd.set('file', file);
      const res = await fetch(`/api/guest/${token}/document`, { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OCR fallita: ${err.slice(0, 100)}`);
      }
      const data = (await res.json()) as Omit<DocumentResult, 'docEmbedding'>;
      onNext({ ...data, docEmbedding: Array.from(embedding) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore. Riprova.');
      setSubmitting(false);
      setStatusMsg('');
    }
  }

  return (
    <div className="guest-step">
      <h1 className="font-display text-2xl font-bold leading-tight">Foto del documento.</h1>
      <p className="mt-2 text-sm text-white/70">
        Passaporto o carta d'identità (fronte). Buona luce, niente riflessi, dati ben leggibili.
      </p>

      {!previewUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-6 flex aspect-[3/2] w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-white/20 bg-white/5 text-white/60 transition-colors hover:bg-white/10"
        >
          <span className="text-4xl">📄</span>
          <span className="text-sm">Tocca per scattare o caricare</span>
        </button>
      )}

      {previewUrl && (
        <div className="mt-6 space-y-3">
          <div className="overflow-hidden rounded-lg border border-white/15">
            <img src={previewUrl} alt="Documento" className="w-full object-cover" />
          </div>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setPreviewUrl(null);
            }}
            className="text-sm text-white/60 hover:text-white"
          >
            Rifai foto
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleSelect(f);
        }}
      />

      {error && (
        <div className="mt-4 rounded-md border border-red-300/50 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-6">
        <button onClick={handleSubmit} disabled={!file || submitting} className="guest-btn">
          {submitting ? statusMsg || 'Elaboro...' : 'Continua →'}
        </button>
      </div>
    </div>
  );
}
