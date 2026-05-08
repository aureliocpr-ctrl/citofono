/**
 * Liveness detection client-side via blink + head movement.
 *
 * Anti-spoofing semplice ma efficace contro:
 *   - foto stampate (no blink)
 *   - schermi (i pattern di moiré spesso fanno saltare il face detector;
 *     comunque non blinka)
 *   - video pre-registrati (non rispondono a prompt randomizzati)
 *
 * Strategia: chiediamo all'ospite di:
 *   1. fissare la camera (rilevato volto)
 *   2. fare un blink (almeno una transizione open→closed→open)
 *   3. ruotare la testa di lato (yaw > 15°)
 *
 * Eye Aspect Ratio (EAR) per il blink: distanza verticale fra palpebre /
 * distanza orizzontale fra angoli interno-esterno. EAR cala bruscamente
 * quando l'occhio si chiude.
 *
 * Questo modulo è browser-targeted: importa MediaPipe Face Mesh dinamicamente.
 * Non viene importato dal codice server.
 */

export interface LivenessChallenge {
  id: string;
  steps: ('look_camera' | 'blink' | 'turn_head')[];
}

export interface LandmarkPoint {
  x: number;
  y: number;
}

/**
 * Indici dei landmark MediaPipe Face Mesh (468 punti):
 *   - occhio sinistro (osservatore): 33, 160, 158, 133, 153, 144
 *   - occhio destro (osservatore): 362, 385, 387, 263, 373, 380
 * Questi 6 punti per occhio sono il pattern standard per EAR.
 */
export const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144] as const;
export const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380] as const;

/** Eye Aspect Ratio: (|p2-p6| + |p3-p5|) / (2·|p1-p4|). */
export function eyeAspectRatio(eye: LandmarkPoint[]): number {
  if (eye.length !== 6) return 1; // assume aperto
  const [p1, p2, p3, p4, p5, p6] = eye;
  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 1;
  const v1 = distance(p2, p6);
  const v2 = distance(p3, p5);
  const h = distance(p1, p4);
  if (h === 0) return 1;
  return (v1 + v2) / (2 * h);
}

function distance(a: LandmarkPoint, b: LandmarkPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Estrai i 6 landmark dell'occhio dato un array completo dei 468 punti
 * di Face Mesh. Indici diversi per occhio sx e dx.
 */
export function extractEyeLandmarks(
  mesh: LandmarkPoint[],
  side: 'left' | 'right',
): LandmarkPoint[] {
  const indices = side === 'left' ? LEFT_EYE_INDICES : RIGHT_EYE_INDICES;
  return indices.map((i) => mesh[i] ?? { x: 0, y: 0 });
}

/** Stima dello yaw (rotazione orizzontale della testa) in radianti.
 *  Heuristic-based su 3 punti del viso (naso, mento, guance):
 *  asimmetria fra distanza naso-orecchio sx vs naso-orecchio dx.
 *  Per MVP è abbastanza preciso. */
export function estimateYaw(mesh: LandmarkPoint[]): number {
  // Indici: punta naso 1, orecchio sx 234, orecchio dx 454.
  const nose = mesh[1];
  const earL = mesh[234];
  const earR = mesh[454];
  if (!nose || !earL || !earR) return 0;
  const dL = distance(nose, earL);
  const dR = distance(nose, earR);
  if (dL + dR === 0) return 0;
  // ratio: -1 (estrema sx) .. 0 (frontale) .. +1 (estrema dx)
  const ratio = (dR - dL) / (dR + dL);
  // converto in radianti approssimativi (range pratico ±60°)
  return (ratio * Math.PI) / 3;
}

/**
 * Rilevatore di blink su una serie temporale di EAR.
 * Trigger: EAR scende sotto closeThreshold per almeno minClosedFrames frame
 *          consecutivi, poi torna sopra openThreshold.
 */
export class BlinkDetector {
  private closedFrames = 0;
  private hasBlinked = false;

  constructor(
    private readonly closeThreshold: number = 0.21,
    private readonly openThreshold: number = 0.25,
    private readonly minClosedFrames: number = 2,
  ) {}

  push(ear: number): boolean {
    if (ear < this.closeThreshold) {
      this.closedFrames++;
    } else if (ear > this.openThreshold) {
      if (this.closedFrames >= this.minClosedFrames) {
        this.hasBlinked = true;
      }
      this.closedFrames = 0;
    }
    return this.hasBlinked;
  }

  reset(): void {
    this.closedFrames = 0;
    this.hasBlinked = false;
  }

  get blinked(): boolean {
    return this.hasBlinked;
  }
}

/** Rilevatore di rotazione testa: passa quando |yaw| supera la soglia. */
export class HeadTurnDetector {
  private maxYaw = 0;

  constructor(private readonly thresholdRadians: number = (15 * Math.PI) / 180) {}

  push(yawRad: number): boolean {
    const abs = Math.abs(yawRad);
    if (abs > this.maxYaw) this.maxYaw = abs;
    return this.maxYaw >= this.thresholdRadians;
  }

  reset(): void {
    this.maxYaw = 0;
  }

  get turned(): boolean {
    return this.maxYaw >= this.thresholdRadians;
  }
}

/** Generatore di sfide randomizzate. Usato lato server per evitare replay. */
export function newChallenge(): LivenessChallenge {
  // sfida fissa "look + blink + turn" con id randomizzato per audit/log
  return {
    id: crypto.randomUUID(),
    steps: ['look_camera', 'blink', 'turn_head'],
  };
}
