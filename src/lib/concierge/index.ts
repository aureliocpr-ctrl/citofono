/**
 * Concierge AI — agente conversazionale multilingua per gli ospiti.
 *
 * Architettura:
 *   1. Knowledge base per appartamento → KnowledgeChunk (DB)
 *      I chunk sono curati dall'host (FAQ + dettagli logistici) e
 *      indicizzati per topic + lingua.
 *   2. Per ogni messaggio dell'ospite:
 *      a. Rileviamo la lingua dal testo (heuristica + fallback "it")
 *      b. Recuperiamo i chunk rilevanti (semplice keyword match per MVP;
 *         in fase 2 → embedding similarity)
 *      c. Costruiamo il prompt e chiamiamo Claude con tool-use disabilitato
 *      d. Ritorniamo la risposta + log per audit + uso per analytics
 *
 * Caratteristiche di sicurezza:
 *   - Niente jailbreak per richieste fuori scope ("dimmi come fare bombe")
 *     → system prompt definisce ruolo e limiti, e la risposta è ancorata
 *     ai chunk recuperati. Se non c'è risposta nel KB, dice "non lo so,
 *     contatta l'host".
 *   - Niente PII di altri ospiti: il contesto contiene solo dati pubblici
 *     dell'appartamento.
 *   - Rate limit per booking (vedi route handler).
 */

import Anthropic from '@anthropic-ai/sdk';
import type { KnowledgeChunk, Property } from '@prisma/client';

const SYSTEM_PROMPT = `Sei il concierge digitale di un alloggio in affitto breve.
Rispondi a chi vi soggiorna in modo cortese, chiaro e nella sua lingua.

Regole:
- Rispondi SOLO usando le informazioni nel contesto qui sotto. Se la
  risposta non c'è, dì che non hai questa informazione e suggerisci di
  contattare l'host.
- Mantieni risposte brevi (1-3 frasi) a meno che la domanda non richieda
  una procedura dettagliata.
- Tono: amichevole, professionale, mai promozionale.
- Non condividere mai dati di altri ospiti, prezzi, dettagli di gestione
  interna o credenziali oltre quelle esplicitamente nel contesto (es. WiFi).
- Rispondi nella lingua del messaggio dell'utente. Se è ambigua, rispondi
  in italiano.`;

export interface ConciergeContext {
  property: Pick<Property, 'name' | 'address' | 'city' | 'checkInTime' | 'checkOutTime' | 'wifiName' | 'wifiPassword' | 'guideMarkdown'>;
  chunks: Pick<KnowledgeChunk, 'topic' | 'content' | 'language'>[];
}

export interface ConciergeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConciergeAskInput {
  context: ConciergeContext;
  history: ConciergeMessage[];
  message: string;
  /** Optional language hint from frontend; otherwise auto-detected. */
  languageHint?: string;
}

export interface ConciergeAskOutput {
  reply: string;
  language: string;
  usedChunks: string[];
  /** Number of input/output tokens charged by Anthropic, for analytics. */
  usage?: { input: number; output: number };
}

/**
 * Lightweight language hint.
 *
 * For Italian/English/French/German/Spanish we score the input against a small
 * marker-word set per language and pick the highest. Italian "wins ties" — it's
 * the default for the Italian market. Languages with non-Latin scripts (CJK,
 * Cyrillic) short-circuit immediately.
 */
export function detectLanguageHint(text: string): string {
  const t = ` ${text.toLowerCase().replace(/[^\p{L}\s]+/gu, ' ').replace(/\s+/g, ' ')} `;

  if (/[ぁ-ゖァ-ヺ]/.test(text)) return 'ja';
  if (/[一-鿿]/.test(text) && !/[ぁ-ゖァ-ヺ]/.test(text)) return 'zh';
  if (/[А-Яа-я]/.test(text)) return 'ru';
  if (/[؀-ۿ]/.test(text)) return 'ar';

  const markers: Record<string, string[]> = {
    it: ['il', 'la', 'lo', 'gli', 'le', 'che', 'sono', 'grazie', 'perché', 'è', 'però', 'questo', 'una', 'casa', 'parking', 'riscaldamento', 'aria'],
    en: ['the', 'is', 'are', 'and', 'with', 'please', 'thanks', 'where', 'what', 'how', 'wifi'],
    fr: ['le', 'les', 'est', 'avec', 'merci', 'bonjour', 'où', 'comment', 'parking', 's\'il', 'plaît', 'pour'],
    es: ['el', 'los', 'las', 'es', 'gracias', 'hola', 'dónde', 'está', 'aparcamiento', 'por', 'favor'],
    de: ['der', 'die', 'das', 'und', 'mit', 'danke', 'hallo', 'bitte', 'wo', 'wlan', 'parkplatz'],
  };

  let best: { lang: string; score: number } = { lang: 'it', score: 0 };
  for (const [lang, words] of Object.entries(markers)) {
    let score = 0;
    for (const w of words) {
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?:^|[^\\p{L}])${escaped}(?:[^\\p{L}]|$)`, 'gu');
      const matches = t.match(re);
      if (matches) score += matches.length;
    }
    if (score > best.score) best = { lang, score };
  }
  return best.lang;
}

/** Pick relevant chunks via keyword overlap. Bag of words, lowercased. */
export function pickRelevantChunks(
  chunks: ConciergeContext['chunks'],
  query: string,
  limit = 4,
): ConciergeContext['chunks'] {
  if (chunks.length === 0) return [];
  const q = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  if (q.length === 0) return chunks.slice(0, limit);
  const scored = chunks.map((c) => {
    const text = (c.topic + ' ' + c.content).toLowerCase();
    let score = 0;
    for (const tok of q) if (text.includes(tok)) score++;
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0).slice(0, limit).map((s) => s.c);
}

/** Build the final user-turn prompt that includes the property context. */
export function buildContextBlock(ctx: ConciergeContext, picked: ConciergeContext['chunks']): string {
  const lines: string[] = [];
  lines.push(`# Appartamento: ${ctx.property.name}`);
  lines.push(`Indirizzo: ${ctx.property.address}, ${ctx.property.city}`);
  lines.push(`Orario check-in: ${ctx.property.checkInTime}`);
  lines.push(`Orario check-out: ${ctx.property.checkOutTime}`);
  if (ctx.property.wifiName) {
    lines.push(`WiFi nome: ${ctx.property.wifiName}`);
    if (ctx.property.wifiPassword) lines.push(`WiFi password: ${ctx.property.wifiPassword}`);
  }
  if (ctx.property.guideMarkdown) {
    lines.push('');
    lines.push('# Guida casa');
    lines.push(ctx.property.guideMarkdown);
  }
  if (picked.length > 0) {
    lines.push('');
    lines.push('# FAQ rilevanti');
    for (const c of picked) {
      lines.push(`## ${c.topic}`);
      lines.push(c.content);
    }
  }
  return lines.join('\n');
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY missing');
    client = new Anthropic({ apiKey: key });
  }
  return client;
}

const MODEL = process.env.CITOFONO_CONCIERGE_MODEL ?? 'claude-haiku-4-5-20251001';

export async function conciergeAsk(input: ConciergeAskInput): Promise<ConciergeAskOutput> {
  const lang = input.languageHint ?? detectLanguageHint(input.message);
  const picked = pickRelevantChunks(input.context.chunks, input.message);
  const contextBlock = buildContextBlock(input.context, picked);

  const messages: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const m of input.history.slice(-6)) {
    messages.push({ role: m.role, content: m.content });
  }
  messages.push({
    role: 'user',
    content: `${contextBlock}\n\n# Messaggio dell'ospite (lingua: ${lang})\n${input.message}`,
  });

  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages,
  });

  const replyText = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim();

  return {
    reply: replyText,
    language: lang,
    usedChunks: picked.map((c) => c.topic),
    usage: res.usage
      ? { input: res.usage.input_tokens, output: res.usage.output_tokens }
      : undefined,
  };
}
