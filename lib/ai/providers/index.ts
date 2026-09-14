import 'server-only';

import { AIProviderError, type AIModelPreference } from '../types';
import type { AIProvider } from './ai-provider';
import { FallbackProvider } from './fallback-provider';
import { GeminiProvider } from './gemini-provider';
import { MockProvider } from './mock-provider';
import { OpenAIProvider } from './openai-provider';

function createGeminiProvider() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.AI_MODEL?.trim() || 'gemini-3.8-flash';
  const fallbackModel = process.env.AI_FALLBACK_MODEL?.trim() || 'gemini-3.6-flash';
  return new GeminiProvider(apiKey, model, fallbackModel);
}

function createOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim()
    || process.env.OPENAI_FORTUNE_MODEL?.trim()
    || 'gpt-5-mini';
  return new OpenAIProvider(apiKey, model);
}

export function getAIProvider(preference: AIModelPreference = 'auto'): AIProvider {
  const provider = process.env.AI_PROVIDER?.trim().toLocaleLowerCase()
    || (process.env.GEMINI_API_KEY ? 'gemini' : process.env.OPENAI_API_KEY ? 'openai' : 'mock');
  if (provider === 'mock') return new MockProvider();
  if (provider !== 'gemini' && provider !== 'openai') throw new AIProviderError('configuration');

  const gemini = createGeminiProvider();
  const openai = createOpenAIProvider();

  if (preference === 'gemini') {
    if (!gemini) throw new AIProviderError('configuration');
    return gemini;
  }
  if (preference === 'openai') {
    if (!openai) throw new AIProviderError('configuration');
    return openai;
  }

  const primary = provider === 'openai' ? openai : gemini;
  const fallback = provider === 'openai' ? gemini : openai;
  if (primary && fallback) return new FallbackProvider(primary, fallback);
  if (primary) return primary;
  if (fallback) return fallback;
  throw new AIProviderError('configuration');
}
