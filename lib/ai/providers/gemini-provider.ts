import {
  AIProviderError,
  type AIAgentToolCall,
  type AIAgentToolResult,
  type AIProviderRequest,
  type AIProviderResponse,
} from '../types.ts';
import type { AIProvider } from './ai-provider.ts';

type GeminiResponse = {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      role?: 'user' | 'model';
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GeminiFunctionCall = {
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
};

type GeminiPart = {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: {
    id?: string;
    name: string;
    response: { result?: unknown; error?: string };
  };
};

type GeminiContent = {
  role: 'user' | 'model';
  parts: GeminiPart[];
};

export class GeminiProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fallbackModel?: string;

  constructor(apiKey: string, model: string, fallbackModel?: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.fallbackModel = fallbackModel;
  }

  async generate(input: AIProviderRequest): Promise<AIProviderResponse> {
    const deadlineAt = input.deadlineAt ?? Date.now() + 55_000;
    try {
      return await this.generateWithModel(input, this.model, deadlineAt);
    } catch (error) {
      if (
        !(error instanceof AIProviderError) ||
        error.code !== 'unavailable' ||
        !this.fallbackModel ||
        this.fallbackModel === this.model
      ) {
        throw error;
      }

      console.warn(
        '[ai] Primary Gemini model unavailable; using fallback model',
      );
      return this.generateWithModel(input, this.fallbackModel, deadlineAt);
    }
  }

  private async generateWithModel(
    input: AIProviderRequest,
    model: string,
    deadlineAt: number,
  ): Promise<AIProviderResponse> {
    const timeoutMs = Math.min(55_000, deadlineAt - Date.now());
    if (timeoutMs <= 0) throw new AIProviderError('unavailable');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const contents: GeminiContent[] = [
        ...input.history.map((message) => ({
          role:
            message.role === 'assistant'
              ? ('model' as const)
              : ('user' as const),
          parts: [{ text: message.content }],
        })),
        { role: 'user', parts: [{ text: input.message }] },
      ];

      // Gemini may need to resolve people, then fetch relationships/statistics,
      // before it can write a factual answer. Bound the loop to prevent an
      // accidental tool cycle from making a request unbounded.
      for (let turn = 0; turn < 5; turn += 1) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: input.systemInstruction }] },
              contents,
              ...(input.agentTools
                ? {
                    tools: [
                      { functionDeclarations: input.agentTools.declarations },
                    ],
                    ...(turn === 0 && input.agentTools.forceFirstTool
                      ? {
                          toolConfig: {
                            functionCallingConfig: { mode: 'ANY' },
                          },
                        }
                      : {}),
                  }
                : {}),
              generationConfig: {
                maxOutputTokens: input.responseMimeType ? 8192 : 1200,
                temperature: 0.35,
                ...(input.responseMimeType
                  ? { responseMimeType: input.responseMimeType }
                  : {}),
              },
            }),
          },
        );

        const payload = (await response
          .json()
          .catch(() => ({}))) as GeminiResponse;
        if (!response.ok) {
          console.warn('[ai] Gemini generation failed', {
            status: response.status,
            reason: payload.error?.status || 'unknown',
          });
          if (
            response.status === 429 ||
            payload.error?.status === 'RESOURCE_EXHAUSTED'
          ) {
            throw new AIProviderError('quota');
          }
          throw new AIProviderError('unavailable');
        }

        const content = payload.candidates?.[0]?.content;
        const calls =
          content?.parts?.flatMap((part): AIAgentToolCall[] => {
            const call = part.functionCall;
            return call?.name
              ? [
                  {
                    ...(call.id ? { id: call.id } : {}),
                    name: call.name,
                    args:
                      call.args && typeof call.args === 'object'
                        ? call.args
                        : {},
                  },
                ]
              : [];
          }) || [];

        if (calls.length && input.agentTools) {
          const results = await input.agentTools.execute(calls);
          contents.push({
            role: 'model',
            parts: content?.parts || [],
          });
          contents.push({
            role: 'user',
            parts: results.map((result) => functionResponsePart(result)),
          });
          continue;
        }

        const answer = content?.parts
          ?.map((part) => part.text ?? '')
          .join('')
          .trim();
        if (answer) return { answer, provider: 'gemini' };

        console.warn('[ai] Gemini response did not include text', {
          model,
          finishReason: payload.candidates?.[0]?.finishReason || 'unknown',
        });
        throw new AIProviderError('invalid_response');
      }

      throw new AIProviderError('invalid_response');
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

function functionResponsePart(result: AIAgentToolResult): GeminiPart {
  return {
    functionResponse: {
      ...(result.id ? { id: result.id } : {}),
      name: result.name,
      response: result.response,
    },
  };
}
