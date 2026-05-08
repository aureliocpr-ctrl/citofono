'use client';

import { useEffect, useRef, useState } from 'react';
import { BlinkDetector, HeadTurnDetector } from '@/lib/face/liveness';
import { deterministicEmbedding } from './Document';

interface Props {
  onPassed: (selfieEmbedding: number[], challengeId: string) => void;
}

type LivenessPhase = 'idle' | 'face_detected' | 'blink_done' | 'turn_done' | 'capturing';

/**
 * Liveness check semplificato per MVP.
 *
 * In produzione: integrare face-api.js o MediaPipe Face Mesh per detection +
 * landmark + embedding. Qui usiamo l'API getUserMedia per ottenere lo stream,
 * facciamo "fake-detection" basato sulla luminosità media dei frame come
 * proxy per "c'è un volto" (il browser/utente normale lo soddisfa) e
 * gestiamo il flusso di sfide.
 *
 * L'utente deve premere "ho fatto blink" e "ho ruotato la testa" — questo
 * MVP confida sull'utente. Versione 0.2 sostituirà con detection automatica.
 */
export function Liveness({ onPassed }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<LivenessPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const challengeId = useRef<string>(crypto.randomUUID());
  const blinkDetector = useRef(new BlinkDetector());
  const turnDetector = useRef(new HeadTurnDetector());

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setPhase('face_detected');
        }
      } catch {
        setError('Non riusciamo ad accedere alla fotocamera. Controlla i permessi del browser e ricarica.');
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function declareBlink() {
    blinkDetector.current.push(0.1);
    blinkDetector.current.push(0.3);
    if (blinkDetector.current.blinked) setPhase('blink_done');
  }

  function declareTurn() {
    turnDetector.current.push(Math.PI / 6);
    if (turnDetector.current.turned) setPhase('turn_done');
  }

  async function captureAndFinish() {
    setPhase('capturing');
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setError('Errore camera.');
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Canvas non disponibile.');
      return;
    }
    ctx.drawImage(video, 0, 0);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    if (!blob) {
      setError('Cattura fallita.');
      return;
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const embedding = deterministicEmbedding(bytes);
    onPassed(embedding, challengeId.current);
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
        Inquadra il viso al centro. Ti chiediamo due piccole azioni: un battito di ciglia e
        una rotazione della testa.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-white/15 bg-black">
        <video ref={videoRef} className="aspect-[3/4] w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="mt-6 space-y-3">
        <ChallengeButton
          done={phase !== 'idle' && phase !== 'face_detected'}
          active={phase === 'face_detected'}
          onClick={declareBlink}
          label="1. Sbatti gli occhi"
        />
        <ChallengeButton
          done={phase === 'turn_done' || phase === 'capturing'}
          active={phase === 'blink_done'}
          onClick={declareTurn}
          label="2. Gira la testa di lato"
        />
      </div>

      <div className="mt-6">
        <button
          disabled={phase !== 'turn_done'}
          onClick={captureAndFinish}
          className="guest-btn"
        >
          {phase === 'capturing' ? 'Catturo...' : 'Concludi verifica →'}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-white/40">
        L'immagine viene processata localmente. Il server riceve solo un vettore di 128 numeri.
      </p>
    </div>
  );
}

function ChallengeButton({
  active,
  done,
  onClick,
  label,
}: {
  active: boolean;
  done: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      disabled={!active}
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left text-sm transition-colors ${
        done
          ? 'border-green-500/50 bg-green-900/20 text-green-200'
          : active
            ? 'border-post bg-post/10 text-post'
            : 'border-white/10 bg-white/5 text-white/40'
      }`}
    >
      <span>{label}</span>
      <span>{done ? '✓' : active ? '→' : ''}</span>
    </button>
  );
}
