/**
 * AI provider factory.
 *
 * Selezione del provider tramite env `CITOFONO_AI_PROVIDER`. Default:
 * "anthropic" (compatibile con il vecchio comportamento). Modello via
 * `CITOFONO_AI_MODEL` o default per provider.
 *
 * Provider supportati:
 *   - anthropic   → Claude (haiku, sonnet, opus)
 *   - openai      → GPT-5, GPT-4o, GPT-4o-mini
 *   - google      → Gemini 2.5 Flash / Pro
 *   - xai         → Grok 4
 *   - groq        → Llama 3.3 ultraveloce
 *   - openrouter  → router unificato per N modelli
 *   - ollama      → modelli locali (Llama, Qwen, Mistral, Phi)
 *
 * Esempi env:
 *   CITOFONO_AI_PROVIDER=ollama CITOFONO_AI_MODEL=qwen2.5:7b
 *   CITOFONO_AI_PROVIDER=xai    CITOFONO_AI_MODEL=grok-4-fast
 *   CITOFONO_AI_PROVIDER=google CITOFONO_AI_MODEL=gemini-2.5-pro
 *   CITOFONO_AI_PROVIDER=groq   CITOFONO_AI_MODEL=llama-3.3-70b-versatile
 */

import type { AIProvider, AIProviderName } from './types';
import { AnthropicProvider } from './providers/anthropic';
import {
  makeOpenAIProvider,
  makeXaiProvider,
  makeGroqProvider,
  makeOpenRouterProvider,
} from './providers/openai-compat';
import { GoogleProvider } from './providers/google';
import { OllamaProvider } from './providers/ollama';

export type { AIProvider, AIMessage, AICompletionRequest, AICompletionResponse } from './types';
export { DEFAULT_MODELS } from './types';

const PROVIDER_NAMES: AIProviderName[] = [
  'anthropic',
  'openai',
  'google',
  'xai',
  'groq',
  'ollama',
  'openrouter',
];

export function isProviderName(s: string): s is AIProviderName {
  return PROVIDER_NAMES.includes(s as AIProviderName);
}

export function selectedProviderName(): AIProviderName {
  const raw = (process.env.CITOFONO_AI_PROVIDER ?? 'anthropic').toLowerCase();
  if (!isProviderName(raw)) {
    throw new Error(
      `CITOFONO_AI_PROVIDER="${raw}" non valido. Valori ammessi: ${PROVIDER_NAMES.join(', ')}.`,
    );
  }
  return raw;
}

/** Costruisce il provider configurato. Lazy-singleton per call sito. */
let cached: AIProvider | null = null;
let cachedKey: string | null = null;

export function getProvider(model?: string): AIProvider {
  const name = selectedProviderName();
  // Cache key: provider+model. Reset se cambia env (test, multi-tenant futuro).
  const key = `${name}:${model ?? process.env.CITOFONO_AI_MODEL ?? ''}`;
  if (cached && cachedKey === key) return cached;

  cached = buildProvider(name, model);
  cachedKey = key;
  return cached;
}

function buildProvider(name: AIProviderName, model?: string): AIProvider {
  switch (name) {
    case 'anthropic':
      return new AnthropicProvider(model);
    case 'openai':
      return makeOpenAIProvider(model);
    case 'google':
      return new GoogleProvider(model);
    case 'xai':
      return makeXaiProvider(model);
    case 'groq':
      return makeGroqProvider(model);
    case 'openrouter':
      return makeOpenRouterProvider(model);
    case 'ollama':
      return new OllamaProvider(model);
  }
}

/** Per i test: resetta la cache. */
export function _resetProviderCache(): void {
  cached = null;
  cachedKey = null;
}
