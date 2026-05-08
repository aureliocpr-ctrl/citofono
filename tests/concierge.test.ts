import { describe, it, expect } from 'vitest';
import {
  detectLanguageHint,
  pickRelevantChunks,
  buildContextBlock,
} from '@/lib/concierge';

describe('detectLanguageHint', () => {
  it('detects italian via function words', () => {
    expect(detectLanguageHint('Il riscaldamento si accende con il termostato')).toBe('it');
  });
  it('detects italian via accents', () => {
    expect(detectLanguageHint('Perché non funziona l\'aria condizionata')).toBe('it');
  });
  it('detects english', () => {
    expect(detectLanguageHint('Where is the parking and what is the WiFi password please')).toBe('en');
  });
  it('detects german', () => {
    expect(detectLanguageHint('Wo ist der Parkplatz und das WLAN bitte')).toBe('de');
  });
  it('detects spanish', () => {
    expect(detectLanguageHint('Dónde está el aparcamiento por favor gracias')).toBe('es');
  });
  it('detects french', () => {
    expect(detectLanguageHint('Bonjour, où est le parking s\'il vous plaît merci')).toBe('fr');
  });
  it('falls back to italian on ambiguous input', () => {
    expect(detectLanguageHint('xyz 1234')).toBe('it');
  });
});

describe('pickRelevantChunks', () => {
  const chunks = [
    { topic: 'wifi', content: 'La password del WiFi è "summer2026"', language: 'it' },
    { topic: 'parking', content: 'Il parcheggio è in via Roma 5', language: 'it' },
    { topic: 'rules', content: 'Vietato fumare in casa', language: 'it' },
  ];

  it('returns chunks containing the query terms first', () => {
    const out = pickRelevantChunks(chunks, 'qual è la password del wifi?');
    expect(out[0]?.topic).toBe('wifi');
  });
  it('returns empty array if no overlap', () => {
    expect(pickRelevantChunks(chunks, 'totalmente irrilevante xyz qwerty')).toEqual([]);
  });
  it('respects the limit', () => {
    const out = pickRelevantChunks(chunks, 'wifi parking rules', 2);
    expect(out.length).toBeLessThanOrEqual(2);
  });
});

describe('buildContextBlock', () => {
  it('includes property identification fields', () => {
    const block = buildContextBlock(
      {
        property: {
          name: 'Casa al mare',
          address: 'Via Roma 1',
          city: 'Sperlonga',
          checkInTime: '15:00',
          checkOutTime: '10:00',
          wifiName: 'CasaMare',
          wifiPassword: 'pass123',
          guideMarkdown: null,
        },
        chunks: [],
      },
      [],
    );
    expect(block).toContain('Casa al mare');
    expect(block).toContain('Sperlonga');
    expect(block).toContain('15:00');
    expect(block).toContain('CasaMare');
  });
  it('omits wifi password when only name is provided', () => {
    const block = buildContextBlock(
      {
        property: {
          name: 'X',
          address: 'Y',
          city: 'Z',
          checkInTime: '14:00',
          checkOutTime: '11:00',
          wifiName: 'OnlyName',
          wifiPassword: null,
          guideMarkdown: null,
        },
        chunks: [],
      },
      [],
    );
    expect(block).toContain('OnlyName');
    expect(block).not.toContain('WiFi password');
  });
});
