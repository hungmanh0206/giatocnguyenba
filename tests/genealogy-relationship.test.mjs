import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findCommonAncestor,
  getRelationship,
  resolvePeople,
  validateGenealogyRelations,
} from '../lib/genealogy/relationship-engine.ts';

function person({
  id,
  name = id,
  gender = 'unknown',
  born,
  generation = 1,
  parents = [],
  spouses = [],
  parentRelations,
  siblingOrder,
}) {
  return {
    id,
    name,
    gender,
    isClanMember: true,
    lineageType: gender === 'female' ? 'maternal-terminal' : 'direct',
    generation,
    branch: 1,
    parents,
    spouses,
    ...(born !== undefined ? { born } : {}),
    ...(siblingOrder !== undefined ? { siblingOrder } : {}),
    ...(parentRelations ? { parentRelations } : {}),
  };
}

test('relationship engine determines chú and bác from verified sibling order', () => {
  const youngerUncle = [
    person({ id: 'root', gender: 'male' }),
    person({ id: 'a', name: 'Anh của bố', gender: 'male', born: 1960, generation: 2, parents: ['root'] }),
    person({ id: 'b', name: 'Em của bố', gender: 'male', born: 1965, generation: 2, parents: ['root'] }),
    person({ id: 'c', name: 'Cháu', gender: 'male', generation: 3, parents: ['a'] }),
  ];
  const result = getRelationship('b', 'c', youngerUncle);
  assert.equal(result?.status, 'EXACT');
  assert.equal(result?.kinshipTermAtoB, 'chú');

  const olderUncle = youngerUncle.map((item) => item.id === 'b' ? { ...item, born: 1955 } : item);
  assert.equal(getRelationship('b', 'c', olderUncle)?.kinshipTermAtoB, 'bác');
});

test('relationship engine does not guess bác or chú when the relative order is absent', () => {
  const members = [
    person({ id: 'root', gender: 'male' }),
    person({ id: 'father', gender: 'male', generation: 2, parents: ['root'] }),
    person({ id: 'uncle', gender: 'male', generation: 2, parents: ['root'] }),
    person({ id: 'child', gender: 'female', generation: 3, parents: ['father'] }),
  ];
  const result = getRelationship('uncle', 'child', members);
  assert.equal(result?.status, 'AMBIGUOUS');
  assert.deepEqual(result?.possibleTerms, ['bác', 'chú']);
  assert.match(result?.missingFacts.join(' ') || '', /lớn hay nhỏ tuổi/i);
});

test('relationship engine distinguishes cô, cậu and dì by verified branch', () => {
  const members = [
    person({ id: 'root', gender: 'male' }),
    person({ id: 'father', gender: 'male', born: 1960, generation: 2, parents: ['root'] }),
    person({ id: 'aunt', gender: 'female', born: 1965, generation: 2, parents: ['root'] }),
    person({ id: 'mother', gender: 'female', born: 1960, generation: 2, parents: ['root'] }),
    person({ id: 'uncle-maternal', gender: 'male', born: 1965, generation: 2, parents: ['root'] }),
    person({ id: 'aunt-maternal', gender: 'female', born: 1966, generation: 2, parents: ['root'] }),
    person({ id: 'child-paternal', gender: 'female', generation: 3, parents: ['father'] }),
    person({ id: 'child-maternal', gender: 'female', generation: 3, parents: ['mother'] }),
  ];
  assert.equal(getRelationship('aunt', 'child-paternal', members)?.kinshipTermAtoB, 'cô');
  assert.equal(getRelationship('uncle-maternal', 'child-maternal', members)?.kinshipTermAtoB, 'cậu');
  assert.equal(getRelationship('aunt-maternal', 'child-maternal', members)?.kinshipTermAtoB, 'dì');
});

test('relationship engine distinguishes full and half siblings from parentage', () => {
  const members = [
    person({ id: 'father', gender: 'male' }),
    person({ id: 'mother-a', gender: 'female' }),
    person({ id: 'mother-b', gender: 'female' }),
    person({ id: 'other-father', gender: 'male' }),
    person({ id: 'full-a', gender: 'male', generation: 2, parents: ['father', 'mother-a'] }),
    person({ id: 'full-b', gender: 'female', generation: 2, parents: ['father', 'mother-a'] }),
    person({ id: 'paternal-half', gender: 'female', generation: 2, parents: ['father', 'mother-b'] }),
    person({ id: 'maternal-half', gender: 'female', generation: 2, parents: ['other-father', 'mother-a'] }),
  ];
  assert.equal(getRelationship('full-a', 'full-b', members)?.relationshipCode, 'FULL_SIBLING');
  assert.equal(getRelationship('full-a', 'paternal-half', members)?.relationshipCode, 'PATERNAL_HALF_SIBLING');
  assert.equal(getRelationship('full-a', 'maternal-half', members)?.relationshipCode, 'MATERNAL_HALF_SIBLING');
});

test('a spouse never becomes a biological parent without a parent-child link', () => {
  const members = [
    person({ id: 'a', name: 'Ông A', gender: 'male', spouses: ['d'] }),
    person({ id: 'd', name: 'Bà D', gender: 'female', spouses: ['a', 'e'] }),
    person({ id: 'e', name: 'Ông E', gender: 'male', spouses: ['d'] }),
    person({ id: 'f', name: 'Con riêng F', gender: 'female', generation: 2, parents: ['d', 'e'] }),
    person({ id: 'g', name: 'Con chung G', gender: 'male', generation: 2, parents: ['a', 'd'] }),
  ];
  const stepRelation = getRelationship('a', 'f', members);
  assert.notEqual(stepRelation?.relationshipCode, 'BIOLOGICAL_PARENT');
  assert.equal(stepRelation?.bloodRelation, false);
  assert.equal(getRelationship('a', 'g', members)?.relationshipCode, 'BIOLOGICAL_PARENT');
});

test('relationship engine returns the nearest verified common ancestor and leaves cousin naming unsupported', () => {
  const members = [
    person({ id: 'root', gender: 'male' }),
    person({ id: 'left-parent', gender: 'male', generation: 2, parents: ['root'] }),
    person({ id: 'right-parent', gender: 'female', generation: 2, parents: ['root'] }),
    person({ id: 'left-child', gender: 'male', generation: 3, parents: ['left-parent'] }),
    person({ id: 'right-child', gender: 'female', generation: 3, parents: ['right-parent'] }),
  ];
  const common = findCommonAncestor('left-child', 'right-child', members);
  assert.equal(common?.ancestor.id, 'root');
  assert.equal(common?.distanceFromA, 2);
  assert.equal(common?.distanceFromB, 2);
  assert.equal(getRelationship('left-child', 'right-child', members)?.status, 'UNSUPPORTED');
});

test('person resolver never picks a duplicate name and supports adopted parentage', () => {
  const members = [
    person({ id: 'hung-5', name: 'Nguyễn Bá Hùng', gender: 'male', generation: 5, born: 1958 }),
    person({ id: 'hung-6', name: 'Nguyễn Bá Hùng', gender: 'male', generation: 6, born: 1983 }),
    person({ id: 'adoptive-parent', gender: 'female' }),
    person({ id: 'adopted-child', gender: 'male', generation: 2, parents: ['adoptive-parent'], parentRelations: [{ parentId: 'adoptive-parent', kind: 'adoptive' }] }),
  ];
  const resolution = resolvePeople(members, 'Bố ông Nguyễn Bá Hùng là ai?');
  assert.equal(resolution[0]?.status, 'AMBIGUOUS');
  assert.equal(resolution[0]?.people.length, 2);
  assert.equal(getRelationship('adoptive-parent', 'adopted-child', members)?.kinshipTermAtoB, 'mẹ nuôi');
});

test('relationship validation blocks self links and circular ancestry, and warns on impossible years', () => {
  const members = [
    person({ id: 'a', gender: 'male', born: 1990, parents: ['b'] }),
    person({ id: 'b', gender: 'female', born: 2000, parents: ['a'] }),
    person({ id: 'self', gender: 'male', parents: ['self'] }),
  ];
  const validation = validateGenealogyRelations(members);
  assert.match(validation.errors.join(' '), /vòng quan hệ tổ tiên/i);
  assert.match(validation.errors.join(' '), /chính mình/i);
  assert.match(validation.warnings.join(' '), /Năm sinh/i);
});
