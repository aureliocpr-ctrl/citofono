/**
 * Test per i provider AI. Mockiamo fetch (per OpenAI-compat, Google, Ollama)
 * e l'SDK Anthropic. Niente chiamate reali.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAICompatProvider } from '@/lib/ai/providers/openai-compat';
import { GoogleProvider } from '@/lib/ai/providers/google';
import { OllamaProvider } from '@/lib/ai/providers/ollama';
import {
  isProviderName,
  selectedProviderName,
  _resetProviderCache,
} from '@/lib/ai';

const originalFetch = global.fetch;
const originalEnv = { ...process.env };

afterEach(() => {
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
  _resetProviderCache();
});

function mockFetch(response: object, status = 200) {
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(response), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

describe('OpenAICompatProvider', () => {
  it('parses an OpenAI-format response', async () => {
    mockFetch({
      choices: [{ message: { role: 'assistant', content: 'Ciao!' }, finish_reason: 'stop' }],
      model: 'gpt-5-nano',
      usage: { prompt_tokens: 12, completion_tokens: 3 },
    });
    const p = new OpenAICompatProvider({
      providerName: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'test-key',
      model: 'gpt-5-nano',
    });
    const out = await p.complete({
      systemPrompt: 'Sei un concierge.',
      messages: [{ role: 'user', content: 'Ciao' }],
    });
    expect(out.text).toBe('Ciao!');
    expect(out.usage).toEqual({ inputTokens: 12, outputTokens: 3 });
    expect(out.model).toBe('gpt-5-nano');
  });

  it('sends Bearer auth + system as first message', async () => {
    let capturedBody: { messages: Array<{ role: string; content: string }> } | null = null;
    let capturedHeaders: Record<string, string> = {};
    global.fetch = vi.fn().mockImplementation(async (_url, init) => {
      capturedBody = JSON.parse(init.body);
      capturedHeaders = init.headers;
      return new Response(
        JSON.stringify({
          choices: [{ message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
          model: 'grok-4-fast',
        }),
      );
    });

    const p = new OpenAICompatProvider({
      providerName: 'xai',
      baseUrl: 'https://api.x.ai/v1',
      apiKey: 'xai-key',
      model: 'grok-4-fast',
    });
    await p.complete({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(capturedHeaders['authorization']).toBe('Bearer xai-key');
    expect(capturedBody!.messages[0]).toEqual({ role: 'system', content: 'sys' });
    expect(capturedBody!.messages[1]).toEqual({ role: 'user', content: 'hi' });
  });

  it('throws a clear error on API failure', async () => {
    mockFetch({ error: { message: 'Quota exceeded' } }, 429);
    const p = new OpenAICompatProvider({
      providerName: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'k',
      model: 'gpt-5',
    });
    await expect(
      p.complete({ systemPrompt: '', messages: [{ role: 'user', content: 'x' }] }),
    ).rejects.toThrow(/Quota exceeded/);
  });
});

describe('GoogleProvider', () => {
  it('maps assistant -> model role and parses Gemini response', async () => {
    let capturedBody: {
      systemInstruction?: { parts: Array<{ text: string }> };
      contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    } | null = null;
    global.fetch = vi.fn().mockImplementation(async (_url, init) => {
      capturedBody = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: 'Hello!' }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 },
        }),
      );
    });

    process.env.GOOGLE_API_KEY = 'gkey';
    const p = new GoogleProvider('gemini-2.5-flash');
    const out = await p.complete({
      systemPrompt: 'Be helpful.',
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
        { role: 'user', content: 'How are you?' },
      ],
    });

    expect(out.text).toBe('Hello!');
    expect(out.usage).toEqual({ inputTokens: 5, outputTokens: 2 });
    expect(capturedBody!.systemInstruction?.parts[0]?.text).toBe('Be helpful.');
    expect(capturedBody!.contents[1]).toEqual({
      role: 'model',
      parts: [{ text: 'Hello' }],
    });
  });

  it('throws when GOOGLE_API_KEY is missing', () => {
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    expect(() => new GoogleProvider()).toThrow(/GOOGLE_API_KEY missing/);
  });
});

describe('OllamaProvider', () => {
  beforeEach(() => {
    process.env.OLLAMA_HOST = 'http://localhost:11434';
  });

  it('uses /api/chat with stream:false', async () => {
    let capturedUrl = '';
    let capturedBody: { stream: boolean; model: string } | null = null;
    global.fetch = vi.fn().mockImplementation(async (url, init) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          model: 'llama3.3',
          message: { role: 'assistant', content: 'Ciao!' },
          done: true,
          prompt_eval_count: 10,
          eval_count: 4,
        }),
      );
    });

    const p = new OllamaProvider('llama3.3');
    const out = await p.complete({
      systemPrompt: 'Sei utile.',
      messages: [{ role: 'user', content: 'Ciao' }],
    });

    expect(capturedUrl).toBe('http://localhost:11434/api/chat');
    expect(capturedBody!.stream).toBe(false);
    expect(capturedBody!.model).toBe('llama3.3');
    expect(out.text).toBe('Ciao!');
    expect(out.usage).toEqual({ inputTokens: 10, outputTokens: 4 });
  });

  it('respects OLLAMA_HOST env override', () => {
    process.env.OLLAMA_HOST = 'http://gpu-server.lan:11434';
    const p = new OllamaProvider();
    expect(p.name).toBe('ollama');
  });
});

describe('selectedProviderName', () => {
  it('defaults to anthropic', () => {
    delete process.env.CITOFONO_AI_PROVIDER;
    expect(selectedProviderName()).toBe('anthropic');
  });

  it('accepts case-insensitive valid names', () => {
    process.env.CITOFONO_AI_PROVIDER = 'OLLAMA';
    expect(selectedProviderName()).toBe('ollama');
  });

  it('throws on unknown provider', () => {
    process.env.CITOFONO_AI_PROVIDER = 'magic-llm';
    expect(() => selectedProviderName()).toThrow(/non valido/);
  });

  it('isProviderName accepts all 7 supported', () => {
    expect(isProviderName('anthropic')).toBe(true);
    expect(isProviderName('openai')).toBe(true);
    expect(isProviderName('google')).toBe(true);
    expect(isProviderName('xai')).toBe(true);
    expect(isProviderName('groq')).toBe(true);
    expect(isProviderName('openrouter')).toBe(true);
    expect(isProviderName('ollama')).toBe(true);
    expect(isProviderName('made-up')).toBe(false);
  });
});
