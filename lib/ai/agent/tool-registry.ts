import {
  memberBranchName,
  memberLifeStatus,
  memberName,
  parentRelationsOf,
  spouseRelationsOf,
  type Member,
} from '../../family.ts';
import { createGenealogyTools } from '../../genealogy/tools.ts';
import {
  getLunarDayInfo,
  getMemorialEvents,
} from '../../lunar-calendar/service.ts';
import { vietnamToday } from '../../lunar.ts';
import type {
  AIAgentToolCall,
  AIAgentToolDefinition,
  AIAgentToolResult,
  AIAgentToolSet,
} from '../types.ts';

type ToolTrace = {
  calls: string[];
  summaries: string[];
};

type ToolRegistry = AIAgentToolSet & {
  getTrace: () => ToolTrace;
};

const stringSchema = { type: 'string' };
const personIdSchema = {
  type: 'string',
  description: 'ID hồ sơ đã được resolve bởi công cụ, không tự tạo ID.',
};
const depthSchema = {
  type: 'integer',
  minimum: 1,
  maximum: 8,
  description: 'Số đời tối đa cần xem, mặc định 4.',
};

const declarations: AIAgentToolDefinition[] = [
  {
    name: 'resolve_person',
    description:
      'Tìm và phân giải một người theo tên/cách gọi. Luôn dùng trước khi tên chưa rõ hoặc có thể trùng.',
    parameters: {
      type: 'object',
      properties: { query: stringSchema },
      required: ['query'],
    },
  },
  {
    name: 'search_person',
    description:
      'Tìm tối đa các hồ sơ khớp với tên, quê quán hoặc tiểu sử ngắn.',
    parameters: {
      type: 'object',
      properties: { query: stringSchema },
      required: ['query'],
    },
  },
  {
    name: 'get_person',
    description: 'Lấy hồ sơ đã xác minh của một người theo ID.',
    parameters: {
      type: 'object',
      properties: { person_id: personIdSchema },
      required: ['person_id'],
    },
  },
  {
    name: 'get_parents',
    description:
      'Lấy cha/mẹ của một người, kèm loại quan hệ ruột, nuôi hoặc kế.',
    parameters: {
      type: 'object',
      properties: { person_id: personIdSchema },
      required: ['person_id'],
    },
  },
  {
    name: 'get_children',
    description: 'Lấy con của một người, kèm loại quan hệ theo từng người con.',
    parameters: {
      type: 'object',
      properties: { person_id: personIdSchema },
      required: ['person_id'],
    },
  },
  {
    name: 'get_spouses',
    description:
      'Lấy các phối ngẫu theo thứ tự hôn nhân và tình trạng đã ghi nhận.',
    parameters: {
      type: 'object',
      properties: { person_id: personIdSchema },
      required: ['person_id'],
    },
  },
  {
    name: 'get_siblings',
    description:
      'Lấy anh chị em, phân biệt cùng cha mẹ, cùng cha, cùng mẹ hoặc kế.',
    parameters: {
      type: 'object',
      properties: { person_id: personIdSchema },
      required: ['person_id'],
    },
  },
  {
    name: 'get_ancestors',
    description: 'Lấy các tổ tiên đã ghi nhận trong số đời giới hạn.',
    parameters: {
      type: 'object',
      properties: { person_id: personIdSchema, depth: depthSchema },
      required: ['person_id'],
    },
  },
  {
    name: 'get_descendants',
    description: 'Lấy hậu duệ đã ghi nhận trong số đời giới hạn.',
    parameters: {
      type: 'object',
      properties: { person_id: personIdSchema, depth: depthSchema },
      required: ['person_id'],
    },
  },
  {
    name: 'get_generation',
    description: 'Lấy đời của một người.',
    parameters: {
      type: 'object',
      properties: { person_id: personIdSchema },
      required: ['person_id'],
    },
  },
  {
    name: 'get_family_branch',
    description: 'Lấy chi/nhánh của một người theo dữ liệu gia phả.',
    parameters: {
      type: 'object',
      properties: { person_id: personIdSchema },
      required: ['person_id'],
    },
  },
  {
    name: 'get_relationship',
    description:
      'Tính quan hệ chính xác giữa hai hồ sơ bằng Relationship Engine. Dùng cho mọi khẳng định về quan hệ.',
    parameters: {
      type: 'object',
      properties: { person_a_id: personIdSchema, person_b_id: personIdSchema },
      required: ['person_a_id', 'person_b_id'],
    },
  },
  {
    name: 'validate_relationship',
    description:
      'Xác thực một mã quan hệ do mô hình suy luận bằng Relationship Engine. Phải gọi trước khi khẳng định quan hệ suy luận như FIRST_COUSIN.',
    parameters: {
      type: 'object',
      properties: {
        person_a_id: personIdSchema,
        person_b_id: personIdSchema,
        candidate_relationship_code: {
          type: 'string',
          description: 'Mã ứng viên, ví dụ PATERNAL_FIRST_COUSIN hoặc FIRST_COUSIN.',
        },
      },
      required: ['person_a_id', 'person_b_id', 'candidate_relationship_code'],
    },
  },
  {
    name: 'get_relationship_path',
    description: 'Lấy đường quan hệ đã xác minh giữa hai hồ sơ.',
    parameters: {
      type: 'object',
      properties: { person_a_id: personIdSchema, person_b_id: personIdSchema },
      required: ['person_a_id', 'person_b_id'],
    },
  },
  {
    name: 'find_common_ancestor',
    description: 'Tìm tổ tiên chung gần nhất của hai người.',
    parameters: {
      type: 'object',
      properties: { person_a_id: personIdSchema, person_b_id: personIdSchema },
      required: ['person_a_id', 'person_b_id'],
    },
  },
  {
    name: 'search_family_documents',
    description:
      'Tìm nội dung tiểu sử, quê quán và nguồn ghi chép. Không dùng để suy ra quan hệ.',
    parameters: {
      type: 'object',
      properties: { query: stringSchema },
      required: ['query'],
    },
  },
  {
    name: 'get_person_biography',
    description: 'Lấy nội dung tiểu sử và nguồn ghi chép của một hồ sơ.',
    parameters: {
      type: 'object',
      properties: { person_id: personIdSchema },
      required: ['person_id'],
    },
  },
  {
    name: 'get_family_statistics',
    description: 'Lấy thống kê tổng quan số thành viên, thế hệ và chi/nhánh.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_branch_statistics',
    description:
      'Lấy số thành viên theo từng chi/nhánh và xác định chi đông nhất.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_generation_statistics',
    description: 'Lấy số thành viên theo từng đời.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_descendant_statistics',
    description: 'Đếm hậu duệ đã ghi nhận của một người.',
    parameters: {
      type: 'object',
      properties: { person_id: personIdSchema, depth: depthSchema },
      required: ['person_id'],
    },
  },
  {
    name: 'get_lunar_date',
    description:
      'Đổi ngày dương ISO YYYY-MM-DD sang ngày âm và lịch truyền thống.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Ngày dương theo định dạng YYYY-MM-DD.',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'get_upcoming_death_anniversaries',
    description:
      'Lấy các ngày giỗ sắp tới trong khoảng ngày yêu cầu, tối đa 365 ngày.',
    parameters: {
      type: 'object',
      properties: { days: { type: 'integer', minimum: 1, maximum: 365 } },
    },
  },
];

function textArg(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function numberArg(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === 'number' ? Math.floor(value) : Number(value);
  return Number.isFinite(number)
    ? Math.min(max, Math.max(min, number))
    : fallback;
}

function detail(person: Member, members: Member[]) {
  return {
    id: person.id,
    name: memberName(person),
    gender: person.gender,
    generation: person.generation,
    branch: memberBranchName(person, members),
    ...(person.born !== undefined ? { birthYear: person.born } : {}),
    lifeStatus: memberLifeStatus(person),
    dataStatus: person.dataStatus || 'PARTIAL',
    ...(person.needsVerification ? { needsVerification: true } : {}),
  };
}

function parentDetail(person: Member, members: Member[]) {
  const byId = new Map(members.map((member) => [member.id, member]));
  return parentRelationsOf(person).flatMap((relation) => {
    const parent = byId.get(relation.parentId);
    return parent
      ? [{ ...detail(parent, members), parentage: relation.kind }]
      : [];
  });
}

function spouseDetail(person: Member, members: Member[]) {
  const byId = new Map(members.map((member) => [member.id, member]));
  return spouseRelationsOf(person).flatMap((relation) => {
    const spouse = byId.get(relation.spouseId);
    return spouse
      ? [
          {
            ...detail(spouse, members),
            order: relation.order,
            status: relation.status || 'unknown',
          },
        ]
      : [];
  });
}

function dateFromIso(value: string) {
  const found = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!found) return null;
  const date = new Date(
    Number(found[1]),
    Number(found[2]) - 1,
    Number(found[3]),
    12,
  );
  return date.getFullYear() === Number(found[1]) &&
    date.getMonth() === Number(found[2]) - 1 &&
    date.getDate() === Number(found[3])
    ? date
    : null;
}

/**
 * The only data surface Gemini can call. It operates on the already scoped
 * family collection and returns concise, serializable facts rather than the
 * entire graph or any database implementation detail.
 */
export function createAIAgentToolRegistry(members: Member[]): ToolRegistry {
  const tools = createGenealogyTools(members);
  const trace: ToolTrace = { calls: [], summaries: [] };

  const run = (name: string, args: Record<string, unknown>): unknown => {
    const id = textArg(args.person_id);
    const secondId = textArg(args.person_b_id);
    const firstId = textArg(args.person_a_id);
    const person = id ? tools.getPerson(id) : undefined;
    const limit = numberArg(args.depth, 4, 1, 8);

    switch (name) {
      case 'resolve_person': {
        const query = textArg(args.query);
        if (!query)
          return {
            status: 'INVALID',
            message: 'Cần tên hoặc mô tả người cần tìm.',
          };
        return tools.resolvePerson(query).map((resolution) => ({
          status: resolution.status,
          query: resolution.query,
          candidates: resolution.people.slice(0, 8).map((candidate) => ({
            ...detail(candidate, members),
            parents: parentDetail(candidate, members).map(
              ({ id: parentId, name: parentName }) => ({
                id: parentId,
                name: parentName,
              }),
            ),
          })),
        }));
      }
      case 'search_person': {
        const query = textArg(args.query);
        return query
          ? tools
              .searchPerson(query)
              .slice(0, 12)
              .map((candidate) => detail(candidate, members))
          : [];
      }
      case 'get_person':
        return person
          ? {
              ...detail(person, members),
              parents: parentDetail(person, members),
              spouses: spouseDetail(person, members),
            }
          : { status: 'NOT_FOUND' };
      case 'get_parents':
        return person ? parentDetail(person, members) : { status: 'NOT_FOUND' };
      case 'get_children':
        return person
          ? tools.getChildren(id).map((child) => ({
              ...detail(child, members),
              parentage:
                parentRelationsOf(child).find(
                  (relation) => relation.parentId === person.id,
                )?.kind || 'biological',
            }))
          : { status: 'NOT_FOUND' };
      case 'get_spouses':
        return person ? spouseDetail(person, members) : { status: 'NOT_FOUND' };
      case 'get_siblings':
        return person
          ? tools.getSiblings(id).map((sibling) => {
              const relationship = tools.getRelationship(sibling.id, id);
              return {
                ...detail(sibling, members),
                relationshipCode: relationship?.relationshipCode,
                term: relationship?.kinshipTermAtoB,
              };
            })
          : { status: 'NOT_FOUND' };
      case 'get_ancestors':
        return person
          ? tools
              .getAncestors(id, limit)
              .map((ancestor) => detail(ancestor, members))
          : { status: 'NOT_FOUND' };
      case 'get_descendants':
        return person
          ? tools
              .getDescendants(id, limit)
              .map((descendant) => detail(descendant, members))
          : { status: 'NOT_FOUND' };
      case 'get_generation':
        return person
          ? {
              person: detail(person, members),
              generation: tools.getGeneration(id),
            }
          : { status: 'NOT_FOUND' };
      case 'get_family_branch':
        return person
          ? {
              person: detail(person, members),
              branch: tools.getFamilyBranch(id),
            }
          : { status: 'NOT_FOUND' };
      case 'get_relationship':
        return firstId && secondId
          ? tools.getRelationship(firstId, secondId) || { status: 'NOT_FOUND' }
          : { status: 'INVALID', message: 'Cần hai ID hồ sơ.' };
      case 'validate_relationship': {
        const candidate = textArg(args.candidate_relationship_code);
        return firstId && secondId && candidate
          ? tools.validateRelationship(firstId, secondId, candidate)
          : { status: 'INVALID', message: 'Cần hai ID hồ sơ và mã quan hệ ứng viên.' };
      }
      case 'get_relationship_path':
        return firstId && secondId
          ? tools.getRelationshipPath(firstId, secondId)
          : { status: 'INVALID', message: 'Cần hai ID hồ sơ.' };
      case 'find_common_ancestor':
        return firstId && secondId
          ? tools.findCommonAncestor(firstId, secondId) || { status: 'UNKNOWN' }
          : { status: 'INVALID', message: 'Cần hai ID hồ sơ.' };
      case 'search_family_documents': {
        const query = textArg(args.query);
        return query
          ? tools
              .searchFamily(query)
              .slice(0, 8)
              .map((candidate) => ({
                ...detail(candidate, members),
                ...(candidate.biography
                  ? { biography: candidate.biography.slice(0, 1_500) }
                  : {}),
                ...(candidate.hometown ? { hometown: candidate.hometown } : {}),
                ...(candidate.sourceReference
                  ? { sourceReference: candidate.sourceReference }
                  : {}),
              }))
          : [];
      }
      case 'get_person_biography':
        return person
          ? {
              person: detail(person, members),
              biography: person.biography || null,
              hometown: person.hometown || null,
              sourceReference: person.sourceReference || null,
            }
          : { status: 'NOT_FOUND' };
      case 'get_family_statistics': {
        const generations = [
          ...new Set(members.map((member) => member.generation)),
        ];
        const branches = new Set(
          members.map((member) => memberBranchName(member, members)),
        );
        return {
          memberCount: members.length,
          generationCount: generations.length,
          generations: Math.max(0, ...generations),
          branchCount: branches.size,
        };
      }
      case 'get_branch_statistics': {
        const groups = new Map<string, number>();
        members.forEach((member) => {
          const branch = memberBranchName(member, members);
          groups.set(branch, (groups.get(branch) || 0) + 1);
        });
        const branches = [...groups.entries()]
          .map(([branch, memberCount]) => ({ branch, memberCount }))
          .sort(
            (left, right) =>
              right.memberCount - left.memberCount ||
              left.branch.localeCompare(right.branch, 'vi'),
          );
        return { branches, largestBranch: branches[0] || null };
      }
      case 'get_generation_statistics': {
        const groups = new Map<number, number>();
        members.forEach((member) =>
          groups.set(
            member.generation,
            (groups.get(member.generation) || 0) + 1,
          ),
        );
        return [...groups.entries()]
          .map(([generation, memberCount]) => ({ generation, memberCount }))
          .sort((left, right) => left.generation - right.generation);
      }
      case 'get_descendant_statistics':
        return person
          ? {
              person: detail(person, members),
              descendantCount: tools.getDescendants(id, limit).length,
              depth: limit,
            }
          : { status: 'NOT_FOUND' };
      case 'get_lunar_date': {
        const date = dateFromIso(textArg(args.date));
        if (!date)
          return {
            status: 'INVALID',
            message: 'Ngày phải theo định dạng YYYY-MM-DD.',
          };
        const info = getLunarDayInfo(date);
        if (!info.supported) return { status: 'UNSUPPORTED_DATE' };
        return {
          solarDate: textArg(args.date),
          lunarDate: `${info.lunar.day}/${info.lunar.month}/${info.lunar.year}${info.lunar.leapMonth ? ' nhuận' : ''} âm lịch`,
          canChi: info.canChi,
          solarTerm: info.solarTerm,
          dayClassification: info.dayClassification,
        };
      }
      case 'get_upcoming_death_anniversaries': {
        const days = numberArg(args.days, 31, 1, 365);
        return getMemorialEvents({ members, from: vietnamToday() })
          .filter((event) => event.daysAway <= days)
          .slice(0, 24)
          .map((event) => ({
            personId: event.event.person?.id,
            title: event.event.title,
            lunarDate: `${event.event.lunarDay}/${event.event.lunarMonth} âm lịch`,
            solarDate: event.date.toLocaleDateString('vi-VN'),
            daysAway: event.daysAway,
            approximate: event.isApproximate,
          }));
      }
      default:
        return { status: 'UNSUPPORTED_TOOL' };
    }
  };

  return {
    declarations,
    forceFirstTool: true,
    async execute(calls: AIAgentToolCall[]): Promise<AIAgentToolResult[]> {
      return calls.slice(0, 6).map((call) => {
        trace.calls.push(call.name);
        try {
          const result = run(call.name, call.args || {});
          const count = Array.isArray(result) ? result.length : 1;
          trace.summaries.push(`${call.name}:${count}`);
          return {
            ...(call.id ? { id: call.id } : {}),
            name: call.name,
            response: { result },
          };
        } catch {
          trace.summaries.push(`${call.name}:error`);
          return {
            ...(call.id ? { id: call.id } : {}),
            name: call.name,
            response: { error: 'Hiện chưa truy xuất được dữ liệu cần thiết.' },
          };
        }
      });
    },
    getTrace() {
      return { calls: [...trace.calls], summaries: [...trace.summaries] };
    },
  };
}
