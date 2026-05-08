/**
 * Provider OpenAI-compatibile.
 *
 * Una sola implementazione serve molti provider che espongono l'API
 * OpenAI-compatibile cambiando solo base URL + auth:
 *
 *   - OpenAI         → https://api.openai.com/v1
 *   - xAI (Grok)     → https://api.x.ai/v1
 *   - Groq           → https://api.groq.com/openai/v1
 *   - OpenRouter     → https://openrouter.ai/api/v1
 *   - DeepSeek       → https://api.deepseek.com/v1
 *   - Mistral        → https://api.mistral.ai/v1 (mostly compat)
 *   - Together       → https://api.together.xyz/v1
 *   - Fireworks      → https://api.fireworks.ai/inference/v1
 *
 * Il system prompt viene mappato su un primo message ruolo "system".
 */

import type {
  AIProvider,
  AICompletionRequest,
  AICompletionResponse,
} from '../types';

interface OpenAIChatResponse {
  choices: Array<{
    message: { content: string | null; role: string };
    finish_reason: string;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

interface OpenAIErrorResponse {
  error?: { message?: string; code?: string; type?: string };
}

export interface OpenAICompatConfig {
  /** Nome breve (es. "openai", "xai", "groq"). */
  providerName: string;
  /** URL base senza trailing slash, deve includere "/v1". */
  baseUrl: string;
  /** Bearer token API key. */
  apiKey: string;
  /** Modello da usare. */
  model: string;
  /** Header extra (es. HTTP-Referer per OpenRouter). */
  extraHeaders?: Record<string, string>;
}

export class OpenAICompatProvider implements AIProvider {
  readonly name: string;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly extraHeaders: Record<string, string>;

  constructor(cfg: OpenAICompatConfig) {
    this.name = cfg.providerName;
    this.model = cfg.model;
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '');
    this.apiKey = cfg.apiKey;
    this.extraHeaders = cfg.extraHeaders ?? {};
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
    const messages: Array<{ role: string; content: string }> = [];
    if (req.systemPrompt) {
      messages.push({ role: 'system', content: req.systemPrompt });
    }
    for (const m of req.messages) {
      messages.push({ role: m.role, content: m.content });
    }

    const r = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
        ...this.extraHeaders,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: req.maxOutputTokens ?? 600,
        temperature: req.temperature ?? 0.5,
      }),
    });

    if (!r.ok) {
      const errBody = (await r.json().catch(() => ({}))) as OpenAIErrorResponse;
      const msg = errBody.error?.message ?? `${r.status} ${r.statusText}`;
      throw new Error(`${this.name} API error: ${msg}`);
    }

    const data = (await r.json()) as OpenAIChatResponse;
    const text = data.choices[0]?.message?.content ?? '';
    return {
      text: text.trim(),
      model: data.model || this.model,
      usage: data.usage
        ? {
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens,
          }
        : undefined,
    };
  }
}

/** Fabbriche pre-configurate per i provider OpenAI-compatibili noti. */
export function makeOpenAIProvider(model?: string): OpenAICompatProvider {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY missing');
  return new OpenAICompatProvider({
    providerName: 'openai',
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    apiKey: key,
    model: model ?? process.env.CITOFONO_AI_MODEL ?? 'gpt-5-nano',
  });
}

export function makeXaiProvider(model?: string): OpenAICompatProvider {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error('XAI_API_KEY missing');
  return new OpenAICompatProvider({
    providerName: 'xai',
    baseUrl: process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1',
    apiKey: key,
    model: model ?? process.env.CITOFONO_AI_MODEL ?? 'grok-4-fast',
  });
}

export function makeGroqProvider(model?: string): OpenAICompatProvider {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY missing');
  return new OpenAICompatProvider({
    providerName: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: key,
    model: model ?? process.env.CITOFONO_AI_MODEL ?? 'llama-3.3-70b-versatile',
  });
}

export function makeOpenRouterProvider(model?: string): OpenAICompatProvider {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY missing');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://citofono.app';
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Citofono';
  return new OpenAICompatProvider({
    providerName: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: key,
    model: model ?? process.env.CITOFONO_AI_MODEL ?? 'anthropic/claude-haiku-4.5',
    extraHeaders: {
      'HTTP-Referer': appUrl,
      'X-Title': appName,
    },
  });
}
