/**
 * Anthropic provider (Claude). API ufficiale via @anthropic-ai/sdk.
 *
 * Richiede ANTHROPIC_API_KEY. Modello default: claude-haiku-4-5
 * (cheap + fast + multilingua).
 *
 * Usa il system parameter dedicato (Anthropic separa system dai messages,
 * a differenza di OpenAI). Niente streaming per ora.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AICompletionRequest, AICompletionResponse } from '../types';
import { DEFAULT_MODELS } from '../types';

let cached: Anthropic | null = null;
function client(): Anthropic {
  if (!cached) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY missing');
    cached = new Anthropic({ apiKey: key });
  }
  return cached;
}

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  readonly model: string;

  constructor(model?: string) {
    this.model = model ?? process.env.CITOFONO_AI_MODEL ?? DEFAULT_MODELS.anthropic;
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
    const res = await client().messages.create({
      model: this.model,
      max_tokens: req.maxOutputTokens ?? 600,
      temperature: req.temperature ?? 0.5,
      system: req.systemPrompt,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim();
    return {
      text,
      model: this.model,
      usage: res.usage
        ? { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens }
        : undefined,
    };
  }
}
