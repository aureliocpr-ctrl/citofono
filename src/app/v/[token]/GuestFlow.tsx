'use client';

/**
 * Flusso check-in mobile-first per l'ospite.
 *
 * Stati (uno alla volta sullo schermo):
 *   1. welcome      → benvenuto + dati prenotazione
 *   2. consent      → consenso GDPR per dati biometrici (Art. 9)
 *   3. document     → upload documento (camera/file)
 *   4. review-data  → conferma dati estratti, possibilità di correggere
 *   5. liveness     → selfie con micro-sfida (blink + rotazione testa)
 *   6. matching     → calcolo embedding, chiamata server per match
 *   7. done         → riepilogo + info casa
 *
 * Per dati biometrici tutto il calcolo dell'embedding avviene NEL BROWSER
 * (face-api.js caricato dinamicamente). Server riceve solo il vettore 128-dim.
 */

import { useState } from 'react';
import { Welcome } from './steps/Welcome';
import { Consent } from './steps/Consent';
import { DocumentStep } from './steps/Document';
import { ReviewData } from './steps/ReviewData';
import { Liveness } from './steps/Liveness';
import { Matching } from './steps/Matching';
import { Done } from './steps/Done';

export type Step =
  | 'welcome'
  | 'consent'
  | 'document'
  | 'review-data'
  | 'liveness'
  | 'matching'
  | 'done';

export interface GuestFlowState {
  guestId?: string;
  ocrFields?: {
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
  ocrConfidence?: number;
  ocrNeedsReview?: string[];
  docEmbedding?: number[];
  selfieEmbedding?: number[];
  livenessChallenge?: string;
  livenessPassed?: boolean;
  matchVerdict?: 'match' | 'review' | 'reject';
  similarity?: number;
}

interface Props {
  token: string;
  propertyName: string;
  propertyCity: string;
  leadName: string;
  numGuests: number;
  checkInDate: string;
  checkOutDate: string;
  checkInTime: string;
}

export function GuestFlow(props: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [state, setState] = useState<GuestFlowState>({});
  /** Quale ospite stiamo verificando: 1, 2, 3, ... fino a numGuests. */
  const [currentGuestIndex, setCurrentGuestIndex] = useState(1);
  /** Quanti ospiti hanno già completato il check-in con verdetto match. */
  const [verifiedCount, setVerifiedCount] = useState(0);

  function patch(p: Partial<GuestFlowState>) {
    setState((s) => ({ ...s, ...p }));
  }

  function startNextGuest() {
    setState({});
    setCurrentGuestIndex((i) => i + 1);
    setStep('consent');
  }

  return (
    <>
      <ProgressBar step={step} />
      {step === 'welcome' && (
        <Welcome
          propertyName={props.propertyName}
          propertyCity={props.propertyCity}
          leadName={props.leadName}
          numGuests={props.numGuests}
          checkInDate={props.checkInDate}
          checkOutDate={props.checkOutDate}
          checkInTime={props.checkInTime}
          onNext={() => setStep('consent')}
        />
      )}
      {step === 'consent' && (
        <Consent
          token={props.token}
          onAccept={(guestId) => {
            patch({ guestId });
            setStep('document');
          }}
        />
      )}
      {step === 'document' && state.guestId && (
        <DocumentStep
          token={props.token}
          guestId={state.guestId}
          onNext={(d) => {
            patch({
              ocrFields: d.fields,
              ocrConfidence: d.confidence,
              ocrNeedsReview: d.needsReview,
              docEmbedding: d.docEmbedding,
            });
            setStep('review-data');
          }}
        />
      )}
      {step === 'review-data' && state.guestId && state.ocrFields && (
        <ReviewData
          token={props.token}
          guestId={state.guestId}
          fields={state.ocrFields}
          needsReview={state.ocrNeedsReview ?? []}
          onConfirmed={() => setStep('liveness')}
        />
      )}
      {step === 'liveness' && (
        <Liveness
          onPassed={(selfieEmbedding, challengeId) => {
            patch({ selfieEmbedding, livenessChallenge: challengeId, livenessPassed: true });
            setStep('matching');
          }}
        />
      )}
      {step === 'matching' && state.guestId && state.selfieEmbedding && state.docEmbedding && (
        <Matching
          token={props.token}
          guestId={state.guestId}
          selfieEmbedding={state.selfieEmbedding}
          docEmbedding={state.docEmbedding}
          livenessPassed={!!state.livenessPassed}
          livenessChallenge={state.livenessChallenge ?? ''}
          onResolved={(verdict, similarity) => {
            patch({ matchVerdict: verdict, similarity });
            if (verdict === 'match') {
              setVerifiedCount((c) => c + 1);
            }
            setStep('done');
          }}
        />
      )}
      {step === 'done' && (
        <Done
          verdict={state.matchVerdict ?? 'review'}
          checkInTime={props.checkInTime}
          propertyName={props.propertyName}
          guestNumber={currentGuestIndex}
          totalGuests={props.numGuests}
          verifiedCount={verifiedCount}
          onContinueNext={
            verifiedCount < props.numGuests && state.matchVerdict === 'match'
              ? startNextGuest
              : undefined
          }
        />
      )}
    </>
  );
}

function ProgressBar({ step }: { step: Step }) {
  const steps: Step[] = ['welcome', 'consent', 'document', 'review-data', 'liveness', 'matching', 'done'];
  const idx = steps.indexOf(step);
  const pct = Math.round(((idx + 1) / steps.length) * 100);
  return (
    <div className="mx-auto max-w-md px-5 pt-3">
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-1 rounded-full bg-post transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
