/**
 * OCR client-side via tesseract.js (browser worker).
 *
 * Tesseract.js usa Web Worker + WebAssembly. Lo eseguiamo nel browser
 * dell'ospite per due motivi:
 *   1. Privacy: l'immagine del documento non lascia mai il dispositivo
 *      (il server riceve solo il TESTO estratto, già normalizzato).
 *   2. Affidabilità deploy: niente problemi di runtime serverless con
 *      file system, modelli ~12MB e timeout di Vercel functions.
 *
 * I file dei modelli (eng+ita) sono ~10MB. Vengono cachati dal browser
 * dopo il primo run.
 */

let cachedWorker: { recognize: (image: Blob | string | HTMLImageElement | HTMLCanvasElement) => Promise<{ data: { text: string; confidence: number } }>; terminate: () => Promise<void> } | null = null;
let cachedPromise: Promise<typeof cachedWorker> | null = null;

async function getWorker() {
  if (cachedWorker) return cachedWorker;
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    const Tesseract = await import('tesseract.js');
    const worker = await Tesseract.createWorker(['ita', 'eng']);
    cachedWorker = worker as unknown as typeof cachedWorker;
    return cachedWorker;
  })();
  return cachedPromise;
}

export async function ocrImageBrowser(file: Blob): Promise<{ text: string; confidence: number }> {
  const worker = await getWorker();
  if (!worker) throw new Error('tesseract worker unavailable');
  const result = await worker.recognize(file);
  return {
    text: result.data.text ?? '',
    confidence: (result.data.confidence ?? 0) / 100,
  };
}

export async function shutdownClientOcr(): Promise<void> {
  if (cachedWorker) {
    await cachedWorker.terminate();
    cachedWorker = null;
    cachedPromise = null;
  }
}
