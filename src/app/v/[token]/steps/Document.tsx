'use client';

import { useRef, useState } from 'react';

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
      const docEmbedding = await computeDocEmbedding(file);

      // 2. Send the file to the server for OCR.
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
      onNext({ ...data, docEmbedding });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore. Riprova.');
      setSubmitting(false);
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
        <button
          onClick={handleSubmit}
          disabled={!file || submitting}
          className="guest-btn"
        >
          {submitting ? 'Stiamo leggendo il documento...' : 'Continua →'}
        </button>
      </div>
    </div>
  );
}

/**
 * Calcola l'embedding facciale dalla foto del documento.
 * Per MVP, in assenza di face-api.js installato a runtime, ritorna un vettore
 * pseudo-random deterministico (hash dell'immagine). Sostituire in produzione
 * con face-api.js + tinyFaceDetector + faceRecognitionNet.
 */
async function computeDocEmbedding(file: File): Promise<number[]> {
  const buf = await file.arrayBuffer();
  return deterministicEmbedding(new Uint8Array(buf));
}

/** Hash-based embedding placeholder, 128-dim, normalized to unit length. */
export function deterministicEmbedding(bytes: Uint8Array): number[] {
  const out = new Array(128).fill(0) as number[];
  let seed = 2_166_136_261;
  for (let i = 0; i < bytes.length; i++) {
    seed ^= bytes[i] ?? 0;
    seed = Math.imul(seed, 16_777_619);
    out[i % 128] = (out[i % 128] ?? 0) + ((seed % 1000) / 1000);
  }
  // Normalize to unit length
  let norm = 0;
  for (const x of out) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  return out.map((x) => x / norm);
}
