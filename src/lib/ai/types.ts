/**
 * Tipi comuni per l'astrazione AI provider.
 *
 * Ogni provider (Anthropic, OpenAI, Google, xAI, Ollama, Groq, ...)
 * implementa `AIProvider`. Il concierge (e ogni altro consumer) parla
 * solo con questa interfaccia: scegliere un provider diverso è solo
 * cambiare una env var.
 */

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AICompletionRequest {
  /** Istruzioni di sistema (ruolo, regole). */
  systemPrompt: string;
  /** Cronologia + ultimo messaggio dell'utente. */
  messages: AIMessage[];
  /** Token output massimi. Default 600. */
  maxOutputTokens?: number;
  /** 0..1, default 0.5. Più basso = più deterministico. */
  temperature?: number;
}

export interface AICompletionResponse {
  /** Testo della risposta. */
  text: string;
  /** Identificatore del modello usato (es. "claude-haiku-4-5"). */
  model: string;
  /** Token consumati (utile per analytics). undefined se il provider non li espone. */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AIProvider {
  /** Nome breve per logging (es. "anthropic", "openai"). */
  readonly name: string;
  /** Modello in uso (per logging / debug). */
  readonly model: string;
  complete(req: AICompletionRequest): Promise<AICompletionResponse>;
}

export type AIProviderName =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'xai'
  | 'groq'
  | 'ollama'
  | 'openrouter';

/**
 * Modelli di default per ogni provider, scelti per il caso d'uso del
 * concierge (chat multilingua veloce, ~600 token output).
 *
 * Aggiornato: 2026-05.
 */
export const DEFAULT_MODELS: Record<AIProviderName, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-5-nano',
  google: 'gemini-2.5-flash',
  xai: 'grok-4-fast',
  groq: 'llama-3.3-70b-versatile',
  ollama: 'llama3.3',
  openrouter: 'anthropic/claude-haiku-4.5',
};
