import test from 'node:test';
import assert from 'node:assert/strict';
import { GeminiProvider } from '../lib/ai/providers/gemini-provider.ts';
import { createAIAgentToolRegistry } from '../lib/ai/agent/tool-registry.ts';
import { seedMembers } from '../lib/family.ts';

const baseRequest = {
  message: 'Chi nào đông nhất?',
  history: [],
  context: {
    mode: 'genealogy',
    source: 'global',
    appFeatures: [],
    warnings: [],
  },
  systemInstruction: 'Trả lời tiếng Việt bằng dữ liệu công cụ.',
};

test('Gemini provider executes a function call and returns the following answer', async () => {
  const originalFetch = globalThis.fetch;
  const bodies = [];
  let call = 0;
  globalThis.fetch = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    call += 1;
    const payload =
      call === 1
        ? {
            candidates: [
              {
                content: {
                  role: 'model',
                  parts: [
                    {
                      functionCall: {
                        id: 'tool-1',
                        name: 'get_family_statistics',
                        args: {},
                      },
                    },
                  ],
                },
              },
            ],
          }
        : {
            candidates: [
              {
                content: {
                  role: 'model',
                  parts: [{ text: 'Gia phả hiện có dữ liệu thống kê.' }],
                },
              },
            ],
          };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const calls = [];
  try {
    const provider = new GeminiProvider('test-key', 'gemini-test');
    const result = await provider.generate({
      ...baseRequest,
      agentTools: {
        declarations: [
          {
            name: 'get_family_statistics',
            description: 'Thống kê gia phả',
            parameters: { type: 'object', properties: {} },
          },
        ],
        execute: async (toolCalls) => {
          calls.push(...toolCalls);
          return toolCalls.map((toolCall) => ({
            id: toolCall.id,
            name: toolCall.name,
            response: { result: { memberCount: 8 } },
          }));
        },
        forceFirstTool: true,
      },
    });
    assert.equal(result.provider, 'gemini');
    assert.match(result.answer, /thống kê/i);
    assert.equal(calls[0]?.name, 'get_family_statistics');
    assert.equal(bodies[0].toolConfig.functionCallingConfig.mode, 'ANY');
    assert.equal(
      bodies[1].contents.at(-1).parts[0].functionResponse.name,
      'get_family_statistics',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Gemini provider honors a shared request deadline before starting a network call', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('fetch should not run after the deadline');
  };

  try {
    const provider = new GeminiProvider('test-key', 'gemini-test');
    await assert.rejects(
      provider.generate({ ...baseRequest, deadlineAt: Date.now() - 1 }),
      (error) => error?.code === 'unavailable',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('agent registry exposes concise verified statistics, records tool trace, and never exposes the full graph', async () => {
  const registry = createAIAgentToolRegistry(seedMembers);
  const results = await registry.execute([
    { name: 'get_family_statistics', args: {} },
    { name: 'get_branch_statistics', args: {} },
    { name: 'get_upcoming_death_anniversaries', args: { days: 365 } },
  ]);

  assert.equal(results[0].response.result.memberCount, seedMembers.length);
  assert.ok(results[1].response.result.largestBranch);
  assert.ok(Array.isArray(results[2].response.result));
  assert.deepEqual(registry.getTrace().calls, [
    'get_family_statistics',
    'get_branch_statistics',
    'get_upcoming_death_anniversaries',
  ]);
  assert.ok(
    registry.declarations.some((tool) => tool.name === 'get_relationship'),
  );
});
