/**
 * Tesseract.js runner — adapter sottile sopra la libreria.
 *
 * Mantenuto separato dal modulo `extract.ts` perché Tesseract carica modelli
 * pesanti (~12MB di language data) e va inizializzato pigramente. Il modulo
 * `extract.ts` resta puro e testabile senza dipendenze native.
 */

import { createWorker, type Worker } from 'tesseract.js';

let workerPromise: Promise<Worker> | null = null;

/**
 * Lazy singleton worker. Carica i language data al primo uso.
 * Se Tesseract non è installato, lancia errore esplicito invece di crashare.
 */
async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker(['ita', 'eng']).catch((err: unknown) => {
      workerPromise = null; // così il prossimo tentativo riprova
      throw err;
    });
  }
  return workerPromise;
}

/** OCR su un Buffer immagine. Restituisce il testo grezzo. */
export async function ocrImage(buffer: Buffer): Promise<{ text: string; confidence: number }> {
  const worker = await getWorker();
  const out = await worker.recognize(buffer);
  return {
    text: out.data.text ?? '',
    confidence: (out.data.confidence ?? 0) / 100,
  };
}

/** Cleanup esplicito per test/teardown. */
export async function shutdownOcr(): Promise<void> {
  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
  }
}
