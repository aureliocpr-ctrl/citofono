'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BlinkDetector,
  HeadTurnDetector,
  estimateYaw,
  extractEyeLandmarks,
  eyeAspectRatio,
} from '@/lib/face/liveness';
import { computeEmbedding, ensureFaceApi, detectLandmarks } from '@/lib/face/client';

interface Props {
  onPassed: (selfieEmbedding: number[], challengeId: string) => void;
}

type LivenessPhase =
  | 'loading'
  | 'no_face'
  | 'face_locked'
  | 'awaiting_blink'
  | 'awaiting_turn'
  | 'capturing'
  | 'done';

/**
 * Liveness check automatico: rileva landmark facciali in tempo reale via
 * face-api.js, calcola EAR per il blink e yaw per la rotazione testa.
 *
 * Niente più "premi quando hai fatto il blink" — il sistema lo rileva.
 */
export function Liveness({ onPassed }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<LivenessPhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('Carico il rilevatore...');
  const challengeId = useRef<string>(crypto.randomUUID());
  const blinkDetector = useRef(new BlinkDetector());
  const turnDetector = useRef(new HeadTurnDetector());
  const phaseRef = useRef<LivenessPhase>('loading');

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // 1) richiedi camera + carica modelli
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        await ensureFaceApi();
        if (cancelled) return;
        setPhase('no_face');
        setStatusMsg('Inquadra il volto al centro...');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
          setError('Hai bloccato la fotocamera. Vai nei permessi del browser, abilita la camera e ricarica la pagina.');
        } else {
          setError(`Non riusciamo ad accedere alla fotocamera: ${msg}`);
        }
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // 2) loop di analisi frame: 8fps, EAR + yaw
  useEffect(() => {
    if (phase === 'loading' || phase === 'capturing' || phase === 'done') return;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        try {
          const lm = await detectLandmarks(video);
          if (!lm) {
            if (phaseRef.current === 'face_locked' || phaseRef.current === 'awaiting_blink' || phaseRef.current === 'awaiting_turn') {
              setStatusMsg('Volto perso, inquadra di nuovo');
            }
            if (phaseRef.current !== 'no_face') setPhase('no_face');
          } else {
            // face-api restituisce 68 punti. EAR sui due occhi.
            const leftEye = extractEyeLandmarks(lm, 'left');
            const rightEye = extractEyeLandmarks(lm, 'right');
            const ear = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
            const yaw = estimateYaw(lm);

            if (phaseRef.current === 'no_face') {
              setPhase('face_locked');
              setStatusMsg('Ottimo! Ora chiudi e riapri gli occhi 👁');
              setTimeout(() => {
                if (phaseRef.current === 'face_locked') setPhase('awaiting_blink');
              }, 800);
            } else if (phaseRef.current === 'awaiting_blink') {
              const blinked = blinkDetector.current.push(ear);
              if (blinked) {
                setPhase('awaiting_turn');
                setStatusMsg('Bene! Ora gira la testa di lato 👈');
              }
            } else if (phaseRef.current === 'awaiting_turn') {
              const turned = turnDetector.current.push(yaw);
              if (turned) {
                setStatusMsg('Catturo lo scatto...');
                setPhase('capturing');
                await captureAndFinish();
              }
            }
          }
        } catch {
          // keep ticking; transient detection failures are normal
        }
      }
      if (!stop) setTimeout(tick, 125);
    };
    tick();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function captureAndFinish() {
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        setError('Errore camera.');
        return;
      }
      // Prendi 5 frame e tieni quello con detection migliore
      let bestEmbedding: Float32Array | null = null;
      for (let i = 0; i < 5; i++) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) break;
        ctx.drawImage(video, 0, 0);
        const emb = await computeEmbedding(canvas);
        if (emb) {
          bestEmbedding = emb;
          break;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      if (!bestEmbedding) {
        setError('Non sono riuscito a catturare il selfie. Riprova.');
        return;
      }
      setPhase('done');
      onPassed(Array.from(bestEmbedding), challengeId.current);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    }
  }

  if (error) {
    return (
      <div className="guest-step">
        <div className="rounded-md border border-red-300/50 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="guest-step">
      <h1 className="font-display text-2xl font-bold leading-tight">Selfie & verifica.</h1>
      <p className="mt-2 text-sm text-white/70">
        Inquadra il viso al centro. Ti chiediamo solo due piccole azioni.
      </p>

      <div className="relative mt-6 overflow-hidden rounded-lg border border-white/15 bg-black">
        <video ref={videoRef} className="aspect-[3/4] w-full scale-x-[-1] transform object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 grid place-items-end pb-4">
          <div className="rounded-full bg-black/60 px-4 py-2 text-center text-sm text-white">
            {statusMsg}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
        <Step done={phase !== 'loading' && phase !== 'no_face'} label="Volto rilevato" />
        <Step done={phase === 'awaiting_turn' || phase === 'capturing' || phase === 'done'} label="Blink" />
        <Step done={phase === 'capturing' || phase === 'done'} label="Rotazione" />
      </div>

      <p className="mt-6 text-center text-xs text-white/40">
        L'immagine viene processata localmente. Il server riceve solo un vettore di 128 numeri.
      </p>
    </div>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <div
      className={`rounded-md border px-2 py-3 ${
        done ? 'border-green-500/50 bg-green-900/20 text-green-200' : 'border-white/10 bg-white/5 text-white/40'
      }`}
    >
      {done ? '✓ ' : ''}
      {label}
    </div>
  );
}
