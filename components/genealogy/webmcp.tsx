'use client';
import { useEffect } from 'react';
import { useFamily } from './provider';
import { searchMembers, relatives } from '@/lib/family';
type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};
export function GenealogyTools() {
  const { members } = useFamily();
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Tool) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    };
    register({
      name: 'search_family_members',
      title: 'Tìm thành viên gia phả',
      description:
        'Search the current genealogy by Vietnamese name, with or without accents. Returns member IDs and profile links.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string', minLength: 1, maxLength: 100 } },
        required: ['query'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        if (
          !input ||
          typeof input !== 'object' ||
          !('query' in input) ||
          typeof input.query !== 'string' ||
          !input.query.trim() ||
          input.query.length > 100
        )
          throw new Error(
            'query must be a non-empty string of at most 100 characters',
          );
        return searchMembers(members, input.query).map((p) => ({
          id: p.id,
          name: p.name,
          generation: p.generation,
          branch: p.branch,
          profile: `/members/${p.id}`,
        }));
      },
    });
    register({
      name: 'get_family_member',
      title: 'Xem thông tin gia phả',
      description:
        'Read a genealogy member and their recorded parents, spouses, children and siblings by member ID.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        if (
          !input ||
          typeof input !== 'object' ||
          !('id' in input) ||
          typeof input.id !== 'string'
        )
          throw new Error('id must be a string');
        const p = members.find((p) => p.id === input.id);
        if (!p) throw new Error('Member not found');
        const family = relatives(members, p);
        return {
          person: p,
          relations: Object.fromEntries(
            Object.entries(family).map(([key, list]) => [
              key,
              list.map((m) => ({ id: m.id, name: m.name })),
            ]),
          ),
        };
      },
    });
    return () => lifecycle.abort();
  }, [members]);
  return null;
}
