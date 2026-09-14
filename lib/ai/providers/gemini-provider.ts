import 'server-only';

import { AIProviderError, type AIProviderRequest, type AIProviderResponse } from '../types';
import type { AIProvider } from './ai-provider';

type GeminiResponse = {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

export class GeminiProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fallbackModel?: string,
  ) {}

  async generate(input: AIProviderRequest): Promise<AIProviderResponse> {
    try {
      return await this.generateWithModel(input, this.model);
    } catch (error) {
      if (
        !(error instanceof AIProviderError) ||
        error.code !== 'unavailable' ||
        !this.fallbackModel ||
        this.fallbackModel === this.model
      ) {
        throw error;
      }

      console.warn('[ai] Primary Gemini model unavailable; using fallback model');
      return this.generateWithModel(input, this.fallbackModel);
    }
  }

  private async generateWithModel(
    input: AIProviderRequest,
    model: string,
  ): Promise<AIProviderResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: input.systemInstruction }] },
            contents: [
              ...input.history.map((message) => ({
                role: message.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: message.content }],
              })),
              { role: 'user', parts: [{ text: input.message }] },
            ],
            generationConfig: {
              maxOutputTokens: input.responseMimeType ? 8192 : 1200,
              temperature: 0.35,
              ...(input.responseMimeType ? { responseMimeType: input.responseMimeType } : {}),
            },
          }),
        },
      );

      const payload = (await response.json().catch(() => ({}))) as GeminiResponse;
      if (!response.ok) {
        console.warn('[ai] Gemini generation failed', {
          status: response.status,
          reason: payload.error?.status || 'unknown',
        });
        if (response.status === 429 || payload.error?.status === 'RESOURCE_EXHAUSTED') {
          throw new AIProviderError('quota');
        }
        throw new AIProviderError('unavailable');
      }

      const answer = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim();
      if (!answer) {
        console.warn('[ai] Gemini response did not include text', {
          model,
          finishReason: payload.candidates?.[0]?.finishReason || 'unknown',
        });
        throw new AIProviderError('invalid_response');
      }
      return { answer, provider: 'gemini' };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('quota') || message.includes('resource exhausted')) {
        throw new AIProviderError('quota');
      }
      throw new AIProviderError('unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }
}
