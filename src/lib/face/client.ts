/**
 * Client-side face detection + embedding via face-api.js (vladmandic fork).
 *
 * Modelli caricati lazy da CDN al primo utilizzo (~7MB totali, in cache
 * dopo la prima volta):
 *   - tinyFaceDetector (~190KB): rileva i bounding box
 *   - faceLandmark68Net (~360KB): 68 punti facciali per allineamento
 *   - faceRecognitionNet (~6.2MB): produce l'embedding 128-dim (FaceNet)
 *
 * Il calcolo è completo nel browser. Il server riceve solo il vettore.
 *
 * Importazione DINAMICA: il modulo face-api carica TensorFlow.js — pesante.
 * Per evitare di esploderne il bundle iniziale, lo importiamo solo quando
 * serve davvero (quando l'ospite raggiunge lo step documento o liveness).
 */

let cachedApi: typeof import('@vladmandic/face-api') | null = null;
let modelsLoadedPromise: Promise<void> | null = null;

const MODEL_URL =
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model/';

/** Lazy-load face-api and its weights. Idempotent. */
export async function ensureFaceApi(): Promise<typeof import('@vladmandic/face-api')> {
  if (cachedApi) {
    if (modelsLoadedPromise) await modelsLoadedPromise;
    return cachedApi;
  }
  const mod = await import('@vladmandic/face-api');
  cachedApi = mod;
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = Promise.all([
      mod.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      mod.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      mod.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  await modelsLoadedPromise;
  return cachedApi;
}

/**
 * Compute a 128-dim face embedding from an HTMLImageElement / HTMLVideoElement /
 * HTMLCanvasElement. Returns null if no face is detected with reasonable
 * confidence.
 *
 * The detector is the "tiny" variant (small + fast) — adequate for
 * cooperative photos (selfie, document photo) where the face is centered.
 */
export async function computeEmbedding(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
): Promise<Float32Array | null> {
  const api = await ensureFaceApi();
  const opts = new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });
  const detection = await api
    .detectSingleFace(source, opts)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection || !detection.descriptor) return null;
  return detection.descriptor;
}

/** Convenience: load a File / Blob into an image and compute the embedding. */
export async function embeddingFromFile(file: File | Blob): Promise<Float32Array | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return await computeEmbedding(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/** Liveness helper: detect 68 landmarks for a video frame. */
export async function detectLandmarks(
  source: HTMLVideoElement | HTMLCanvasElement,
): Promise<Array<{ x: number; y: number }> | null> {
  const api = await ensureFaceApi();
  const opts = new api.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  const det = await api.detectSingleFace(source, opts).withFaceLandmarks();
  if (!det) return null;
  return det.landmarks.positions.map((p) => ({ x: p.x, y: p.y }));
}
