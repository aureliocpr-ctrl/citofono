/**
 * Google Gemini provider.
 *
 * Usa l'API REST `generativelanguage.googleapis.com/v1beta`. Niente SDK
 * (riduce dipendenze), solo fetch.
 *
 * Modelli (default 2026-05): gemini-2.5-flash (cheapest+fast),
 * gemini-2.5-pro (più qualità).
 */

import type {
  AIProvider,
  AICompletionRequest,
  AICompletionResponse,
} from '../types';
import { DEFAULT_MODELS } from '../types';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates?: Array<{
    content: { parts: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: { message?: string; code?: number };
}

export class GoogleProvider implements AIProvider {
  readonly name = 'google';
  readonly model: string;
  private readonly apiKey: string;

  constructor(model?: string) {
    const key = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GOOGLE_API_KEY missing');
    this.apiKey = key;
    this.model = model ?? process.env.CITOFONO_AI_MODEL ?? DEFAULT_MODELS.google;
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
    // Gemini chiede ruoli "user" / "model" (non "assistant").
    const contents: GeminiContent[] = req.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(this.model)}:generateContent?key=${this.apiKey}`;

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        // System prompt va in `systemInstruction`, non in contents.
        systemInstruction: req.systemPrompt
          ? { role: 'system', parts: [{ text: req.systemPrompt }] }
          : undefined,
        contents,
        generationConfig: {
          maxOutputTokens: req.maxOutputTokens ?? 600,
          temperature: req.temperature ?? 0.5,
        },
      }),
    });

    const data = (await r.json()) as GeminiResponse;
    if (!r.ok || data.error) {
      throw new Error(
        `google API error: ${data.error?.message ?? `${r.status} ${r.statusText}`}`,
      );
    }

    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('\n')
      .trim();

    return {
      text,
      model: this.model,
      usage: data.usageMetadata
        ? {
            inputTokens: data.usageMetadata.promptTokenCount ?? 0,
            outputTokens: data.usageMetadata.candidatesTokenCount ?? 0,
          }
        : undefined,
    };
  }
}
