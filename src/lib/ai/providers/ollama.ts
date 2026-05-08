/**
 * Ollama local provider.
 *
 * Ollama espone un'API REST locale (default http://localhost:11434).
 * Niente API key, solo URL configurabile via OLLAMA_HOST.
 *
 * Modelli consigliati per il concierge (multilingua, ~7-8B params,
 * giri su una RTX 3090 / Mac M-series):
 *   - llama3.3 (default)
 *   - qwen2.5:7b — molto buono in italiano
 *   - mistral-nemo
 *   - phi-4
 *
 * Per usarlo: `ollama pull llama3.3` poi
 *   `CITOFONO_AI_PROVIDER=ollama CITOFONO_AI_MODEL=llama3.3`
 */

import type {
  AIProvider,
  AICompletionRequest,
  AICompletionResponse,
} from '../types';
import { DEFAULT_MODELS } from '../types';

interface OllamaChatResponse {
  model: string;
  message?: { role: string; content: string };
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
  error?: string;
}

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  readonly model: string;
  private readonly host: string;

  constructor(model?: string) {
    this.host = (process.env.OLLAMA_HOST ?? 'http://localhost:11434').replace(/\/$/, '');
    this.model = model ?? process.env.CITOFONO_AI_MODEL ?? DEFAULT_MODELS.ollama;
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
    const messages: Array<{ role: string; content: string }> = [];
    if (req.systemPrompt) {
      messages.push({ role: 'system', content: req.systemPrompt });
    }
    for (const m of req.messages) {
      messages.push({ role: m.role, content: m.content });
    }

    const r = await fetch(`${this.host}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: req.temperature ?? 0.5,
          num_predict: req.maxOutputTokens ?? 600,
        },
      }),
    });

    if (!r.ok) {
      throw new Error(`ollama error: ${r.status} ${r.statusText}`);
    }
    const data = (await r.json()) as OllamaChatResponse;
    if (data.error) throw new Error(`ollama error: ${data.error}`);

    return {
      text: (data.message?.content ?? '').trim(),
      model: data.model || this.model,
      usage:
        data.prompt_eval_count !== undefined && data.eval_count !== undefined
          ? {
              inputTokens: data.prompt_eval_count,
              outputTokens: data.eval_count,
            }
          : undefined,
    };
  }
}
