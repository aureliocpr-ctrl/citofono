import { describe, it, expect } from 'vitest';
import {
  BlinkDetector,
  HeadTurnDetector,
  eyeAspectRatio,
  estimateYaw,
  newChallenge,
} from '@/lib/face/liveness';

describe('eyeAspectRatio', () => {
  it('returns 1 for malformed input', () => {
    expect(eyeAspectRatio([])).toBe(1);
  });
  it('falls toward 0 when eye is closed (vertical distance shrinks)', () => {
    const open = [
      { x: 0, y: 0.5 },
      { x: 0.25, y: 0 },
      { x: 0.5, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.75, y: 1 },
      { x: 0.25, y: 1 },
    ];
    const closed = [
      { x: 0, y: 0.5 },
      { x: 0.25, y: 0.45 },
      { x: 0.5, y: 0.45 },
      { x: 1, y: 0.5 },
      { x: 0.75, y: 0.55 },
      { x: 0.25, y: 0.55 },
    ];
    expect(eyeAspectRatio(open)).toBeGreaterThan(eyeAspectRatio(closed));
  });
});

describe('BlinkDetector', () => {
  it('detects a blink as a closed-then-open transition', () => {
    const d = new BlinkDetector();
    expect(d.blinked).toBe(false);
    d.push(0.30); // open
    d.push(0.10); // closed
    d.push(0.10); // closed
    d.push(0.30); // open again → blink!
    expect(d.blinked).toBe(true);
  });
  it('does not register a single short dip', () => {
    const d = new BlinkDetector(0.21, 0.25, 3);
    d.push(0.30);
    d.push(0.10);
    d.push(0.30);
    expect(d.blinked).toBe(false);
  });
  it('reset clears state', () => {
    const d = new BlinkDetector();
    d.push(0.10);
    d.push(0.30);
    d.reset();
    expect(d.blinked).toBe(false);
  });
});

describe('HeadTurnDetector', () => {
  it('passes once the absolute yaw exceeds threshold', () => {
    const d = new HeadTurnDetector();
    d.push(Math.PI / 100);
    expect(d.turned).toBe(false);
    d.push(Math.PI / 4);
    expect(d.turned).toBe(true);
  });
});

describe('estimateYaw', () => {
  it('is ~0 for a perfectly frontal face', () => {
    const mesh = [];
    for (let i = 0; i < 500; i++) mesh.push({ x: 0, y: 0 });
    mesh[1] = { x: 0, y: 0 };
    mesh[234] = { x: -1, y: 0 };
    mesh[454] = { x: 1, y: 0 };
    expect(Math.abs(estimateYaw(mesh))).toBeLessThan(0.01);
  });
  it('is positive when the head turns to the right', () => {
    const mesh = [];
    for (let i = 0; i < 500; i++) mesh.push({ x: 0, y: 0 });
    mesh[1] = { x: 0, y: 0 };
    mesh[234] = { x: -0.2, y: 0 };
    mesh[454] = { x: 1.2, y: 0 };
    expect(estimateYaw(mesh)).toBeGreaterThan(0);
  });
});

describe('newChallenge', () => {
  it('contains the three expected steps', () => {
    const c = newChallenge();
    expect(c.steps).toEqual(['look_camera', 'blink', 'turn_head']);
    expect(c.id).toMatch(/[0-9a-f-]{36}/);
  });
});
