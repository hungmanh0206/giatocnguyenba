import {
  memberBranchName,
  memberName,
  parentRelationsOf,
  spouseRelationsOf,
  type Member,
  type ParentageKind,
} from '../family.ts';
import {
  ancestorTerm,
  auntOrUncleTerm,
  childTerm,
  cousinTerm,
  descendantTerm,
  parentTerm,
  possibleAuntOrUncleTerms,
  siblingTerm,
  type FamilySide,
  type RelativeAge,
  type SiblingKind,
} from './vietnamese-kinship-engine.ts';

export type RelationshipStatus = 'EXACT' | 'AMBIGUOUS' | 'UNKNOWN' | 'UNSUPPORTED';
export type AddressingStatus = RelationshipStatus;
export type RelationshipValidationStatus = 'VALID' | 'INVALID' | 'AMBIGUOUS' | 'UNKNOWN' | 'UNSUPPORTED';

export type RelationshipPathStep = {
  fromId: string;
  fromName: string;
  relation: string;
  toId: string;
  toName: string;
};

export type PersonSummary = {
  id: string;
  name: string;
  gender: Member['gender'];
  generation: number;
  branch: string;
  birthYear?: number;
  dataStatus?: Member['dataStatus'];
};

export type VerifiedFamilyFact = {
  type: 'BIOLOGICAL_PARENT' | 'ADOPTIVE_PARENT' | 'STEP_PARENT' | 'SIBLING' | 'SPOUSE';
  personAId: string;
  personBId: string;
  relationshipCode?: string;
};

export type CousinRelationshipContext = {
  personAParent: PersonSummary;
  personBParent: PersonSummary;
  parentRelationshipCode: string;
  personABranch?: string;
  personBBranch?: string;
};

export type CommonAncestorResult = {
  ancestor: PersonSummary;
  distanceFromA: number;
  distanceFromB: number;
  pathFromA: RelationshipPathStep[];
  pathFromB: RelationshipPathStep[];
};

export type GenealogyRelationshipResult = {
  personA: PersonSummary;
  personB: PersonSummary;
  status: RelationshipStatus;
  relationshipStatus?: RelationshipStatus;
  relationshipCode?: string;
  relationshipFromAToB?: string;
  relationshipFromBToA?: string;
  kinshipTermAtoB?: string;
  kinshipTermBtoA?: string;
  generationDifference?: number;
  paternalOrMaternal?: FamilySide;
  bloodRelation: boolean;
  path: RelationshipPathStep[];
  explanation: string;
  missingFacts: string[];
  possibleTerms?: string[];
  commonAncestor?: CommonAncestorResult;
  addressingStatus?: AddressingStatus;
  addressing?: { AtoB?: string; BtoA?: string };
  verifiedFacts?: VerifiedFamilyFact[];
  cousin?: CousinRelationshipContext;
};

export type RelationshipCandidateValidation = {
  status: RelationshipValidationStatus;
  candidateRelationshipCode: string;
  validatedRelationshipCode?: string;
  correctRelationshipCode?: string;
  evidence: VerifiedFamilyFact[];
  verifiedPath: RelationshipPathStep[];
  missingFacts: string[];
};

export type PersonResolution = {
  status: 'RESOLVED' | 'AMBIGUOUS' | 'CANDIDATES' | 'UNKNOWN';
  query: string;
  people: Member[];
};

type ParentLink = { parent: Member; kind: ParentageKind };
type AncestorPath = { distance: number; path: RelationshipPathStep[]; firstSide: FamilySide };

function normalise(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLocaleLowerCase('vi')
    .replace(/\s+/g, ' ')
    .trim();
}

function originalNames(person: Member) {
  return [...new Set([
    person.name,
    person.displayName,
  ].filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim())
    .filter((value) => value.length >= 3))];
}

function explicitAliases(person: Member) {
  return [...new Set([
    person.tabooName,
    person.styleName,
    ...(person.aliases || []),
  ].filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim())
    .filter((value) => value.length >= 3))];
}

function searchableNames(person: Member) {
  return [...new Set([...originalNames(person), ...explicitAliases(person)].map(normalise))];
}

function summary(person: Member, members: Member[]): PersonSummary {
  return {
    id: person.id,
    name: memberName(person),
    gender: person.gender,
    generation: person.generation,
    branch: memberBranchName(person, members),
    ...(person.born !== undefined ? { birthYear: person.born } : {}),
    ...(person.dataStatus ? { dataStatus: person.dataStatus } : {}),
  };
}

function ageComparedTo(left: Member, right: Member): RelativeAge {
  if (left.siblingOrder !== undefined && right.siblingOrder !== undefined && left.siblingOrder !== right.siblingOrder) {
    return left.siblingOrder < right.siblingOrder ? 'older' : 'younger';
  }
  if (left.born !== undefined && right.born !== undefined && left.born !== right.born) {
    return left.born < right.born ? 'older' : 'younger';
  }
  return 'unknown';
}

function parentLinks(person: Member, byId: Map<string, Member>): ParentLink[] {
  return parentRelationsOf(person)
    .map((relation) => {
      const parent = byId.get(relation.parentId);
      return parent ? { parent, kind: relation.kind } : null;
    })
    .filter((relation): relation is ParentLink => relation !== null);
}

function biologicalParentIds(person: Member, byId: Map<string, Member>) {
  return new Set(parentLinks(person, byId)
    .filter((link) => link.kind === 'biological')
    .map((link) => link.parent.id));
}

function childLinks(person: Member, members: Member[]) {
  return members.flatMap((child) => parentRelationsOf(child)
    .filter((relation) => relation.parentId === person.id)
    .map((relation) => ({ child, kind: relation.kind })));
}

function relationLabelForParent(parent: Member, kind: ParentageKind) {
  return parentTerm(parent.gender, kind);
}

function relationLabelForChild(child: Member, kind: ParentageKind) {
  return childTerm(child.gender, kind);
}

function reversedPath(path: RelationshipPathStep[]) {
  return [...path].reverse().map((step) => ({
    fromId: step.toId,
    fromName: step.toName,
    relation: step.relation,
    toId: step.fromId,
    toName: step.fromName,
  }));
}

function parentPath(child: Member, parent: Member, kind: ParentageKind): RelationshipPathStep {
  return {
    fromId: child.id,
    fromName: memberName(child),
    relation: relationLabelForParent(parent, kind),
    toId: parent.id,
    toName: memberName(parent),
  };
}

function siblingKind(first: Member, second: Member, byId: Map<string, Member>): SiblingKind | null {
  const firstBiological = biologicalParentIds(first, byId);
  const secondBiological = biologicalParentIds(second, byId);
  const shared = [...firstBiological].filter((id) => secondBiological.has(id));
  const sharedFather = shared.some((id) => byId.get(id)?.gender === 'male');
  const sharedMother = shared.some((id) => byId.get(id)?.gender === 'female');
  if (sharedFather && sharedMother) return 'full' as const;
  const firstHasMother = [...firstBiological].some((id) => byId.get(id)?.gender === 'female');
  const secondHasMother = [...secondBiological].some((id) => byId.get(id)?.gender === 'female');
  const firstHasFather = [...firstBiological].some((id) => byId.get(id)?.gender === 'male');
  const secondHasFather = [...secondBiological].some((id) => byId.get(id)?.gender === 'male');
  if (sharedFather) return firstHasMother && secondHasMother
    ? 'paternal-half' as const
    : 'shared-father-unknown-mother' as const;
  if (sharedMother) return firstHasFather && secondHasFather
    ? 'maternal-half' as const
    : 'shared-mother-unknown-father' as const;

  const firstStep = new Set(parentLinks(first, byId).filter((link) => link.kind === 'step').map((link) => link.parent.id));
  const secondStep = new Set(parentLinks(second, byId).filter((link) => link.kind === 'step').map((link) => link.parent.id));
  return [...firstStep].some((id) => secondStep.has(id)) ? 'step' as const : null;
}

function siblingPath(first: Member, second: Member, byId: Map<string, Member>) {
  const sharedId = [...biologicalParentIds(first, byId)].find((id) => biologicalParentIds(second, byId).has(id));
  const parent = sharedId ? byId.get(sharedId) : undefined;
  if (!parent) return [];
  const firstLink = parentLinks(first, byId).find((link) => link.parent.id === parent.id);
  const secondLink = parentLinks(second, byId).find((link) => link.parent.id === parent.id);
  if (!firstLink || !secondLink) return [];
  return [
    parentPath(first, parent, firstLink.kind),
    {
      fromId: parent.id,
      fromName: memberName(parent),
      relation: relationLabelForChild(second, secondLink.kind),
      toId: second.id,
      toName: memberName(second),
    },
  ];
}

function ancestorPaths(person: Member, byId: Map<string, Member>) {
  const found = new Map<string, AncestorPath>();
  const queue: Array<{ person: Member; distance: number; path: RelationshipPathStep[]; firstSide: FamilySide }> = [];

  for (const link of parentLinks(person, byId)) {
    if (link.kind === 'step') continue;
    queue.push({
      person: link.parent,
      distance: 1,
      path: [parentPath(person, link.parent, link.kind)],
      firstSide: link.parent.gender === 'male' ? 'paternal' : link.parent.gender === 'female' ? 'maternal' : 'unknown',
    });
  }

  while (queue.length) {
    const current = queue.shift()!;
    const existing = found.get(current.person.id);
    if (existing && existing.distance <= current.distance) continue;
    found.set(current.person.id, {
      distance: current.distance,
      path: current.path,
      firstSide: current.firstSide,
    });
    for (const link of parentLinks(current.person, byId)) {
      if (link.kind === 'step') continue;
      queue.push({
        person: link.parent,
        distance: current.distance + 1,
        path: [...current.path, parentPath(current.person, link.parent, link.kind)],
        firstSide: current.firstSide,
      });
    }
  }
  return found;
}

function connectedPath(first: Member, second: Member, members: Member[], byId: Map<string, Member>) {
  const queue: Array<{ person: Member; path: RelationshipPathStep[] }> = [{ person: first, path: [] }];
  const visited = new Set([first.id]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current.person.id === second.id) return current.path;
    const neighbours: Array<{ person: Member; relation: string }> = [
      ...parentLinks(current.person, byId).map((link) => ({ person: link.parent, relation: relationLabelForParent(link.parent, link.kind) })),
      ...childLinks(current.person, members).map((link) => ({ person: link.child, relation: relationLabelForChild(link.child, link.kind) })),
      ...spouseRelationsOf(current.person).map((relation) => ({ person: byId.get(relation.spouseId), relation: 'phối ngẫu' })),
    ].filter((item): item is { person: Member; relation: string } => Boolean(item.person));
    for (const neighbour of neighbours) {
      if (visited.has(neighbour.person.id)) continue;
      visited.add(neighbour.person.id);
      queue.push({
        person: neighbour.person,
        path: [...current.path, {
          fromId: current.person.id,
          fromName: memberName(current.person),
          relation: neighbour.relation,
          toId: neighbour.person.id,
          toName: memberName(neighbour.person),
        }],
      });
    }
  }
  return [];
}

function relationshipBase(
  personA: Member,
  personB: Member,
  members: Member[],
  values: Omit<GenealogyRelationshipResult, 'personA' | 'personB'>,
): GenealogyRelationshipResult {
  const relationshipStatus = values.relationshipStatus || values.status;
  const addressingStatus = values.addressingStatus || (
    relationshipStatus === 'EXACT' && values.kinshipTermAtoB && values.kinshipTermBtoA
      ? 'EXACT'
      : relationshipStatus
  );
  return {
    personA: summary(personA, members),
    personB: summary(personB, members),
    ...values,
    relationshipStatus,
    addressingStatus,
    ...(values.addressing || values.kinshipTermAtoB || values.kinshipTermBtoA
      ? {
          addressing: values.addressing || {
            ...(values.kinshipTermAtoB ? { AtoB: values.kinshipTermAtoB } : {}),
            ...(values.kinshipTermBtoA ? { BtoA: values.kinshipTermBtoA } : {}),
          },
        }
      : {}),
    ...(values.verifiedFacts ? {} : { verifiedFacts: [] }),
  };
}

export function findCommonAncestor(
  firstId: string,
  secondId: string,
  members: Member[],
): CommonAncestorResult | undefined {
  const byId = new Map(members.map((person) => [person.id, person]));
  const first = byId.get(firstId);
  const second = byId.get(secondId);
  if (!first || !second) return undefined;
  const firstAncestors = ancestorPaths(first, byId);
  const secondAncestors = ancestorPaths(second, byId);
  const common = [...firstAncestors.entries()]
    .filter(([id]) => secondAncestors.has(id))
    .sort(([leftId, left], [rightId, right]) => {
      const leftTotal = left.distance + secondAncestors.get(leftId)!.distance;
      const rightTotal = right.distance + secondAncestors.get(rightId)!.distance;
      return leftTotal - rightTotal || left.distance - right.distance || left.path.length - right.path.length;
    });
  const best = common[0];
  if (!best) return undefined;
  const ancestor = byId.get(best[0]);
  const secondPath = secondAncestors.get(best[0])!;
  if (!ancestor) return undefined;
  return {
    ancestor: summary(ancestor, members),
    distanceFromA: best[1].distance,
    distanceFromB: secondPath.distance,
    pathFromA: best[1].path,
    pathFromB: secondPath.path,
  };
}

export function resolvePeople(members: Member[], message: string): PersonResolution[] {
  const groups = new Map<string, Member[]>();

  const phrasePattern = (phrase: string, unicode = false) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return unicode
      ? new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'iu')
      : new RegExp(`(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, 'i');
  };

  const addMatch = (query: string, person: Member) => {
    const people = groups.get(query) || [];
    people.push(person);
    groups.set(query, people);
  };

  const resolvedGroups = (statusWhenSingle: PersonResolution['status']) =>
    [...groups.entries()]
      .sort(([left], [right]) => right.length - left.length || right.localeCompare(left, 'vi'))
      .map(([query, people]) => ({
        status: people.length === 1 ? statusWhenSingle : 'AMBIGUOUS' as const,
        query,
        people,
      }));

  for (const person of members) {
    const matched = originalNames(person).find((name) => phrasePattern(name, true).test(message));
    if (matched) addMatch(matched, person);
  }

  for (const person of members) {
    const matched = explicitAliases(person).find((alias) => phrasePattern(alias, true).test(message));
    if (matched) addMatch(matched, person);
  }
  if (groups.size) return resolvedGroups('RESOLVED');

  const normalizedMessage = normalise(message);
  for (const person of members) {
    const matched = searchableNames(person).find((name) => phrasePattern(name).test(normalizedMessage));
    if (matched) addMatch(matched, person);
  }
  // Normalized lookup intentionally returns candidates, even if one happens
  // to be found. It is never sufficient to decide a person's identity.
  return resolvedGroups('CANDIDATES');
}

export function getRelationship(
  firstId: string,
  secondId: string,
  members: Member[],
): GenealogyRelationshipResult | undefined {
  const byId = new Map(members.map((person) => [person.id, person]));
  const first = byId.get(firstId);
  const second = byId.get(secondId);
  if (!first || !second) return undefined;

  if (first.id === second.id) {
    return relationshipBase(first, second, members, {
      status: 'EXACT', relationshipCode: 'SELF', relationshipFromAToB: 'chính mình', relationshipFromBToA: 'chính mình',
      kinshipTermAtoB: 'chính mình', kinshipTermBtoA: 'chính mình', generationDifference: 0, paternalOrMaternal: 'both', bloodRelation: true,
      path: [], explanation: 'Hai hồ sơ cùng là một người.', missingFacts: [],
    });
  }

  const secondParentLink = parentLinks(second, byId).find((link) => link.parent.id === first.id);
  if (secondParentLink) {
    const term = parentTerm(first.gender, secondParentLink.kind);
    return relationshipBase(first, second, members, {
      status: 'EXACT', relationshipCode: `${secondParentLink.kind.toUpperCase()}_PARENT`, relationshipFromAToB: term,
      relationshipFromBToA: childTerm(second.gender, secondParentLink.kind), kinshipTermAtoB: term,
      kinshipTermBtoA: childTerm(second.gender, secondParentLink.kind), generationDifference: -1, paternalOrMaternal: 'unknown',
      bloodRelation: secondParentLink.kind === 'biological', path: [parentPath(second, first, secondParentLink.kind)],
      explanation: `${memberName(first)} được ghi nhận là ${term} của ${memberName(second)}.`, missingFacts: [],
    });
  }

  const firstParentLink = parentLinks(first, byId).find((link) => link.parent.id === second.id);
  if (firstParentLink) {
    const term = childTerm(first.gender, firstParentLink.kind);
    return relationshipBase(first, second, members, {
      status: 'EXACT', relationshipCode: `${firstParentLink.kind.toUpperCase()}_CHILD`, relationshipFromAToB: term,
      relationshipFromBToA: parentTerm(second.gender, firstParentLink.kind), kinshipTermAtoB: term,
      kinshipTermBtoA: parentTerm(second.gender, firstParentLink.kind), generationDifference: 1, paternalOrMaternal: 'unknown',
      bloodRelation: firstParentLink.kind === 'biological', path: [parentPath(first, second, firstParentLink.kind)],
      explanation: `${memberName(first)} được ghi nhận là ${term} của ${memberName(second)}.`, missingFacts: [],
    });
  }

  if (spouseRelationsOf(first).some((relation) => relation.spouseId === second.id) || spouseRelationsOf(second).some((relation) => relation.spouseId === first.id)) {
    const forward = first.gender === 'male' ? 'chồng' : first.gender === 'female' ? 'vợ' : 'phối ngẫu';
    const reverse = second.gender === 'male' ? 'chồng' : second.gender === 'female' ? 'vợ' : 'phối ngẫu';
    return relationshipBase(first, second, members, {
      status: 'EXACT', relationshipCode: 'SPOUSE', relationshipFromAToB: forward, relationshipFromBToA: reverse,
      kinshipTermAtoB: forward, kinshipTermBtoA: reverse, generationDifference: 0, paternalOrMaternal: 'unknown', bloodRelation: false,
      path: [{ fromId: first.id, fromName: memberName(first), relation: 'phối ngẫu', toId: second.id, toName: memberName(second) }],
      explanation: `${memberName(first)} và ${memberName(second)} là phối ngẫu được ghi nhận trong gia phả.`, missingFacts: [],
    });
  }

  const sibling = siblingKind(first, second, byId);
  if (sibling) {
    const firstAge = ageComparedTo(first, second);
    const secondAge = firstAge === 'older' ? 'younger' : firstAge === 'younger' ? 'older' : 'unknown';
    const code = sibling === 'full'
      ? 'FULL_SIBLING'
      : sibling === 'paternal-half'
        ? 'PATERNAL_HALF_SIBLING'
        : sibling === 'maternal-half'
          ? 'MATERNAL_HALF_SIBLING'
          : sibling === 'shared-father-unknown-mother'
            ? 'VERIFIED_SHARED_FATHER'
            : sibling === 'shared-mother-unknown-father'
              ? 'VERIFIED_SHARED_MOTHER'
              : 'STEP_SIBLING';
    return relationshipBase(first, second, members, {
      status: 'EXACT', relationshipCode: code, relationshipFromAToB: siblingTerm(first.gender, firstAge, sibling),
      relationshipFromBToA: siblingTerm(second.gender, secondAge, sibling), kinshipTermAtoB: siblingTerm(first.gender, firstAge, sibling),
      kinshipTermBtoA: siblingTerm(second.gender, secondAge, sibling), generationDifference: 0,
      paternalOrMaternal: sibling === 'paternal-half' || sibling === 'shared-father-unknown-mother'
        ? 'paternal'
        : sibling === 'maternal-half' || sibling === 'shared-mother-unknown-father'
          ? 'maternal'
          : 'both',
      bloodRelation: sibling !== 'step', path: siblingPath(first, second, byId),
      explanation: `${memberName(first)} và ${memberName(second)} là ${siblingTerm(first.gender, firstAge, sibling)} được ghi nhận trong gia phả.`,
      missingFacts: firstAge === 'unknown' ? ['Chưa có thứ tự sinh hoặc năm sinh đủ để xác định ai lớn tuổi hơn.'] : [],
      addressingStatus: firstAge === 'unknown' ? 'AMBIGUOUS' : 'EXACT',
      verifiedFacts: [{
        type: 'SIBLING',
        personAId: first.id,
        personBId: second.id,
        relationshipCode: code,
      }],
    });
  }

  const firstBiologicalParents = parentLinks(first, byId).filter((link) => link.kind === 'biological');
  const secondBiologicalParents = parentLinks(second, byId).filter((link) => link.kind === 'biological');
  for (const firstParentLink of firstBiologicalParents) {
    for (const secondParentLink of secondBiologicalParents) {
      const parentSibling = siblingKind(firstParentLink.parent, secondParentLink.parent, byId);
      if (!parentSibling || parentSibling === 'step') continue;

      const parentRelationship = getRelationship(
        firstParentLink.parent.id,
        secondParentLink.parent.id,
        members,
      );
      const commonAncestor = findCommonAncestor(first.id, second.id, members);
      const parentAge = ageComparedTo(firstParentLink.parent, secondParentLink.parent);
      const firstAge = ageComparedTo(first, second);
      const secondAge = firstAge === 'older' ? 'younger' : firstAge === 'younger' ? 'older' : 'unknown';
      const side = firstParentLink.parent.gender === 'male' && secondParentLink.parent.gender === 'male'
        ? 'paternal' as const
        : firstParentLink.parent.gender === 'female' && secondParentLink.parent.gender === 'female'
          ? 'maternal' as const
          : 'unknown' as const;
      const relationshipCode = side === 'paternal'
        ? 'PATERNAL_FIRST_COUSIN'
        : side === 'maternal'
          ? 'MATERNAL_FIRST_COUSIN'
          : 'FIRST_COUSIN';
      const personABranch = side === 'paternal'
        ? parentAge === 'older' ? 'con bác' : parentAge === 'younger' ? 'con chú' : undefined
        : undefined;
      const personBBranch = side === 'paternal'
        ? parentAge === 'older' ? 'con chú' : parentAge === 'younger' ? 'con bác' : undefined
        : undefined;
      const path = [
        parentPath(first, firstParentLink.parent, firstParentLink.kind),
        ...siblingPath(firstParentLink.parent, secondParentLink.parent, byId),
        {
          fromId: secondParentLink.parent.id,
          fromName: memberName(secondParentLink.parent),
          relation: relationLabelForChild(second, secondParentLink.kind),
          toId: second.id,
          toName: memberName(second),
        },
      ];
      const parentFacts: VerifiedFamilyFact[] = [
        { type: 'BIOLOGICAL_PARENT', personAId: firstParentLink.parent.id, personBId: first.id },
        { type: 'BIOLOGICAL_PARENT', personAId: secondParentLink.parent.id, personBId: second.id },
        {
          type: 'SIBLING',
          personAId: firstParentLink.parent.id,
          personBId: secondParentLink.parent.id,
          relationshipCode: parentRelationship?.relationshipCode || 'VERIFIED_SIBLING',
        },
      ];
      if (commonAncestor?.distanceFromA === 2 && commonAncestor.distanceFromB === 2) {
        parentFacts.push(
          { type: 'BIOLOGICAL_PARENT', personAId: commonAncestor.ancestor.id, personBId: firstParentLink.parent.id },
          { type: 'BIOLOGICAL_PARENT', personAId: commonAncestor.ancestor.id, personBId: secondParentLink.parent.id },
        );
      }
      const branchDetail = personABranch && personBBranch
        ? ` ${memberName(first)} thuộc nhánh ${personABranch}, còn ${memberName(second)} thuộc nhánh ${personBBranch}.`
        : '';
      const ageDetail = firstAge === 'unknown'
        ? ' Chưa có đủ năm sinh hoặc thứ tự sinh để xác định ai nên xưng anh/chị/em họ.'
        : ` ${memberName(first)} ${firstAge === 'older' ? 'lớn tuổi hơn' : 'nhỏ tuổi hơn'} ${memberName(second)} nên cách xưng hô anh/em họ đã được xác định.`;
      return relationshipBase(first, second, members, {
        status: 'EXACT',
        relationshipCode,
        relationshipFromAToB: cousinTerm(firstAge),
        relationshipFromBToA: cousinTerm(secondAge),
        kinshipTermAtoB: cousinTerm(firstAge),
        kinshipTermBtoA: cousinTerm(secondAge),
        generationDifference: 0,
        paternalOrMaternal: side,
        bloodRelation: true,
        path,
        commonAncestor,
        explanation: `${memberName(first)} và ${memberName(second)} là ${side === 'paternal' ? 'anh em họ bên nội (anh em con chú bác)' : side === 'maternal' ? 'anh em họ bên ngoại' : 'anh em họ'}. Cha/mẹ của hai người là anh chị em được xác nhận trong gia phả.${branchDetail}${ageDetail}`,
        missingFacts: [
          ...(parentAge === 'unknown' && side === 'paternal'
            ? ['Chưa có thứ tự sinh hoặc năm sinh đủ để xác định nhánh con bác/con chú.']
            : []),
          ...(firstAge === 'unknown'
            ? ['Chưa có thứ tự sinh hoặc năm sinh đủ để xác định cách xưng hô anh/em họ.']
            : []),
        ],
        addressingStatus: firstAge === 'unknown' ? 'AMBIGUOUS' : 'EXACT',
        verifiedFacts: parentFacts,
        cousin: {
          personAParent: summary(firstParentLink.parent, members),
          personBParent: summary(secondParentLink.parent, members),
          parentRelationshipCode: parentRelationship?.relationshipCode || 'VERIFIED_SIBLING',
          ...(personABranch ? { personABranch } : {}),
          ...(personBBranch ? { personBBranch } : {}),
        },
      });
    }
  }

  const secondAncestors = ancestorPaths(second, byId);
  const firstAsAncestor = secondAncestors.get(first.id);
  if (firstAsAncestor) {
    const term = ancestorTerm(first.gender, firstAsAncestor.distance, firstAsAncestor.firstSide);
    return relationshipBase(first, second, members, {
      status: 'EXACT', relationshipCode: `ANCESTOR_${firstAsAncestor.distance}`, relationshipFromAToB: term,
      relationshipFromBToA: descendantTerm(second.gender, firstAsAncestor.distance, firstAsAncestor.firstSide), kinshipTermAtoB: term,
      kinshipTermBtoA: descendantTerm(second.gender, firstAsAncestor.distance, firstAsAncestor.firstSide), generationDifference: -firstAsAncestor.distance,
      paternalOrMaternal: firstAsAncestor.firstSide, bloodRelation: true, path: reversedPath(firstAsAncestor.path),
      explanation: `${memberName(first)} là ${term} của ${memberName(second)} theo đường huyết thống đã ghi nhận.`, missingFacts: [],
    });
  }

  const firstAncestors = ancestorPaths(first, byId);
  const secondAsAncestor = firstAncestors.get(second.id);
  if (secondAsAncestor) {
    const term = descendantTerm(first.gender, secondAsAncestor.distance, secondAsAncestor.firstSide);
    return relationshipBase(first, second, members, {
      status: 'EXACT', relationshipCode: `DESCENDANT_${secondAsAncestor.distance}`, relationshipFromAToB: term,
      relationshipFromBToA: ancestorTerm(second.gender, secondAsAncestor.distance, secondAsAncestor.firstSide), kinshipTermAtoB: term,
      kinshipTermBtoA: ancestorTerm(second.gender, secondAsAncestor.distance, secondAsAncestor.firstSide), generationDifference: secondAsAncestor.distance,
      paternalOrMaternal: secondAsAncestor.firstSide, bloodRelation: true, path: secondAsAncestor.path,
      explanation: `${memberName(first)} là ${term} của ${memberName(second)} theo đường huyết thống đã ghi nhận.`, missingFacts: [],
    });
  }

  for (const parentLink of parentLinks(second, byId).filter((link) => link.kind !== 'step')) {
    const parentSibling = siblingKind(first, parentLink.parent, byId);
    if (!parentSibling || parentSibling === 'step') continue;
    const side = parentLink.parent.gender === 'male' ? 'paternal' : parentLink.parent.gender === 'female' ? 'maternal' : 'unknown';
    if (side === 'unknown') continue;
    const age = ageComparedTo(first, parentLink.parent);
    const linkPath = [
      parentPath(second, parentLink.parent, parentLink.kind),
      ...siblingPath(parentLink.parent, first, byId),
    ];
    if (age === 'unknown') {
      const possibleTerms = possibleAuntOrUncleTerms(first.gender, side);
      return relationshipBase(first, second, members, {
        status: 'AMBIGUOUS', relationshipCode: `${side.toUpperCase()}_PARENT_SIBLING_UNKNOWN_ORDER`,
        relationshipFromAToB: `anh/em của ${parentTerm(parentLink.parent.gender, parentLink.kind)}`,
        relationshipFromBToA: 'cháu', generationDifference: -1, paternalOrMaternal: side, bloodRelation: true, path: linkPath,
        explanation: `${memberName(first)} là anh/em của ${parentTerm(parentLink.parent.gender, parentLink.kind)} ${memberName(second)}. Dữ liệu chưa đủ để xác định chính xác cách gọi.`,
        missingFacts: [`Chưa biết ${memberName(first)} lớn hay nhỏ tuổi hơn ${parentTerm(parentLink.parent.gender, parentLink.kind)} ${memberName(parentLink.parent)}.`],
        possibleTerms,
      });
    }
    const kinship = auntOrUncleTerm({ gender: first.gender, side, age });
    return relationshipBase(first, second, members, {
      status: 'EXACT', relationshipCode: kinship.code, relationshipFromAToB: kinship.term, relationshipFromBToA: 'cháu',
      kinshipTermAtoB: kinship.term, kinshipTermBtoA: 'cháu', generationDifference: -1, paternalOrMaternal: side, bloodRelation: true,
      path: linkPath, explanation: `${memberName(first)} là ${kinship.term} của ${memberName(second)} theo đường ${side === 'paternal' ? 'nội' : 'ngoại'} được ghi nhận.`, missingFacts: [],
    });
  }

  const commonAncestor = findCommonAncestor(first.id, second.id, members);
  const path = connectedPath(first, second, members, byId);
  if (commonAncestor || path.length) {
    return relationshipBase(first, second, members, {
      status: 'UNSUPPORTED', relationshipCode: 'CONNECTED_RELATION_UNSUPPORTED', generationDifference: first.generation - second.generation,
      paternalOrMaternal: 'unknown', bloodRelation: Boolean(commonAncestor), path,
      explanation: commonAncestor
        ? `${memberName(first)} và ${memberName(second)} có tổ tiên chung gần nhất là ${commonAncestor.ancestor.name}, nhưng hệ thống chưa có quy tắc xưng hô chính xác cho trường hợp này.`
        : `Gia phả có ghi nhận đường liên kết giữa ${memberName(first)} và ${memberName(second)}, nhưng chưa đủ quy tắc để xác định cách xưng hô chính xác.`,
      missingFacts: [], ...(commonAncestor ? { commonAncestor } : {}),
    });
  }

  return relationshipBase(first, second, members, {
    status: 'UNKNOWN', relationshipCode: 'UNKNOWN', generationDifference: first.generation - second.generation,
    paternalOrMaternal: 'unknown', bloodRelation: false, path: [],
    explanation: `Hiện gia phả chưa có dữ liệu đủ để xác nhận quan hệ giữa ${memberName(first)} và ${memberName(second)}.`, missingFacts: ['Chưa có đường quan hệ cha/mẹ, hôn nhân hoặc tổ tiên chung được xác nhận.'],
  });
}

function normalizedRelationshipCode(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function candidateMatchesRelationship(candidate: string, actual: string | undefined) {
  if (!actual) return false;
  const normalizedCandidate = normalizedRelationshipCode(candidate);
  const normalizedActual = normalizedRelationshipCode(actual);
  return normalizedCandidate === normalizedActual || (
    normalizedCandidate === 'FIRST_COUSIN' &&
    /(?:PATERNAL|MATERNAL)_FIRST_COUSIN$/.test(normalizedActual)
  );
}

/**
 * Validates a candidate derived by an AI model against the deterministic graph
 * result. The graph remains authoritative even when the candidate is wrong.
 */
export function validateRelationship(
  firstId: string,
  secondId: string,
  members: Member[],
  candidateRelationshipCode: string,
): RelationshipCandidateValidation {
  const relationship = getRelationship(firstId, secondId, members);
  const candidate = normalizedRelationshipCode(candidateRelationshipCode);
  if (!relationship) {
    return {
      status: 'UNKNOWN',
      candidateRelationshipCode: candidate,
      evidence: [],
      verifiedPath: [],
      missingFacts: ['Không tìm thấy đủ hai hồ sơ để kiểm tra quan hệ.'],
    };
  }
  if (relationship.status === 'UNKNOWN') {
    return {
      status: 'UNKNOWN',
      candidateRelationshipCode: candidate,
      evidence: relationship.verifiedFacts || [],
      verifiedPath: relationship.path,
      missingFacts: relationship.missingFacts,
    };
  }
  if (relationship.status === 'UNSUPPORTED') {
    return {
      status: 'UNSUPPORTED',
      candidateRelationshipCode: candidate,
      validatedRelationshipCode: relationship.relationshipCode,
      evidence: relationship.verifiedFacts || [],
      verifiedPath: relationship.path,
      missingFacts: relationship.missingFacts,
    };
  }
  if (relationship.status === 'AMBIGUOUS') {
    return {
      status: 'AMBIGUOUS',
      candidateRelationshipCode: candidate,
      validatedRelationshipCode: relationship.relationshipCode,
      evidence: relationship.verifiedFacts || [],
      verifiedPath: relationship.path,
      missingFacts: relationship.missingFacts,
    };
  }
  if (candidateMatchesRelationship(candidate, relationship.relationshipCode)) {
    return {
      status: 'VALID',
      candidateRelationshipCode: candidate,
      validatedRelationshipCode: relationship.relationshipCode,
      evidence: relationship.verifiedFacts || [],
      verifiedPath: relationship.path,
      missingFacts: relationship.missingFacts,
    };
  }
  return {
    status: 'INVALID',
    candidateRelationshipCode: candidate,
    correctRelationshipCode: relationship.relationshipCode,
    evidence: relationship.verifiedFacts || [],
    verifiedPath: relationship.path,
    missingFacts: relationship.missingFacts,
  };
}

export type GenealogyValidation = { errors: string[]; warnings: string[] };

export function validateGenealogyRelations(members: Member[]): GenealogyValidation {
  const byId = new Map(members.map((person) => [person.id, person]));
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const person of members) {
    const relations = parentRelationsOf(person);
    const biologicalFathers = relations.filter((relation) => relation.kind === 'biological' && byId.get(relation.parentId)?.gender === 'male');
    const biologicalMothers = relations.filter((relation) => relation.kind === 'biological' && byId.get(relation.parentId)?.gender === 'female');
    if (new Set(person.parents).size !== person.parents.length) errors.push(`${memberName(person)} có liên kết cha/mẹ bị trùng.`);
    if (relations.some((relation) => relation.parentId === person.id)) errors.push(`${memberName(person)} không thể là cha/mẹ của chính mình.`);
    if (biologicalFathers.length > 1) errors.push(`${memberName(person)} có nhiều hơn một cha sinh học.`);
    if (biologicalMothers.length > 1) errors.push(`${memberName(person)} có nhiều hơn một mẹ sinh học.`);
    if (person.spouses.includes(person.id)) errors.push(`${memberName(person)} không thể là phối ngẫu của chính mình.`);
    for (const relation of relations) {
      const parent = byId.get(relation.parentId);
      if (!parent) {
        warnings.push(`${memberName(person)} có liên kết cha/mẹ tới một hồ sơ không còn tồn tại.`);
        continue;
      }
      if (person.born !== undefined && parent.born !== undefined && parent.born >= person.born) {
        warnings.push(`Năm sinh của ${memberName(parent)} không sớm hơn ${memberName(person)}; cần kiểm tra lại dữ liệu cha/mẹ.`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(person: Member): boolean {
    if (visiting.has(person.id)) return true;
    if (visited.has(person.id)) return false;
    visiting.add(person.id);
    const isCircular = parentRelationsOf(person).some((relation) => {
      const parent = byId.get(relation.parentId);
      return parent ? visit(parent) : false;
    });
    visiting.delete(person.id);
    visited.add(person.id);
    return isCircular;
  }
  for (const person of members) {
    if (visit(person)) {
      errors.push('Phát hiện vòng quan hệ tổ tiên. Hãy kiểm tra lại liên kết cha/mẹ trước khi lưu.');
      break;
    }
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}
