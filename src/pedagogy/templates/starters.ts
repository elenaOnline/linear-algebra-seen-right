// Scene templates for the LADR sandbox pedagogy layer.
// Each build() is pure — no store access, no side effects.

import { mkVectorSpaceFn } from '../../types/space.ts';
import { mkConcreteVector, mkDerivedVector } from '../../types/vector.ts';
import { mkLinearMapByMatrix } from '../../types/map.ts';
import { mkMatrix } from '../../types/matrix.ts';
import { rational, float } from '../../types/scalar.ts';
import type { BasisId } from '../../types/ids.ts';
import { invariantViolation } from '../../types/errors.ts';
import type { SceneBuild, SceneTemplate } from './types.ts';

function ok<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) invariantViolation(`scene template build failed: ${String(r.error)}`);
  return r.value;
}

function bid(spaceId: string): BasisId {
  return spaceId as unknown as BasisId;
}

// ── rn-vector-space ───────────────────────────────────────────────────────

const rnTemplate: SceneTemplate = {
  id: 'rn-vector-space',
  title: 'ℝⁿ as a vector space',
  description: 'ℝⁿ with its standard structure, displayed symbolically and geometrically.',
  tags: ['vector-space', 'chapter-1', 'r2'],
  parameters: [{ name: 'n', kind: 'integer', default: 2, range: [2, 3] }],
  build: (params): SceneBuild => {
    const n = (params['n'] as number | undefined) ?? 2;
    const space = ok(mkVectorSpaceFn('R', n));
    const views: Array<SceneBuild['views'][number]> = [
      { kind: 'symbolic', visualizerId: 'basis-display', objectId: space.id, refKind: 'space' },
    ];
    if (n === 2)
      views.push({
        kind: 'geometric_2d',
        visualizerId: 'coordinate-axes-2d',
        objectId: space.id,
        refKind: 'space',
      });
    if (n === 3)
      views.push({
        kind: 'geometric_3d',
        visualizerId: 'coordinate-axes-3d',
        objectId: space.id,
        refKind: 'space',
      });
    return {
      spaces: [space],
      bases: [],
      vectors: [],
      maps: [],
      namedObjects: [{ name: n === 2 ? 'ℝ²' : 'ℝ³', ref: { kind: 'space', id: space.id } }],
      views,
    };
  },
};

// ── rn-as-fn ──────────────────────────────────────────────────────────────

const rnAsFnTemplate: SceneTemplate = {
  id: 'rn-as-fn',
  title: 'ℝⁿ as 𝔽ⁿ',
  description: 'ℝ² with a sample point (3, −1) illustrating coordinate notation in 𝔽ⁿ.',
  tags: ['fn', 'coordinates', 'chapter-1'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const v = ok(mkConcreteVector('R', space.id, [rational(3), rational(-1)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [v],
      maps: [],
      namedObjects: [
        { name: 'ℝ²', ref: { kind: 'space', id: space.id } },
        { name: 'x', ref: { kind: 'vector', id: v.id } },
      ],
      views: [
        {
          kind: 'geometric_2d',
          visualizerId: 'coordinate-axes-2d',
          objectId: space.id,
          refKind: 'space',
        },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v.id, refKind: 'vector' },
        {
          kind: 'symbolic',
          visualizerId: 'coordinate-display',
          objectId: v.id,
          refKind: 'vector',
        },
      ],
    };
  },
};

// ── complex-arithmetic ────────────────────────────────────────────────────

const complexArithmeticTemplate: SceneTemplate = {
  id: 'complex-arithmetic',
  title: 'Complex numbers as vectors in ℝ²',
  description:
    'Two complex numbers z₁ = 3+4i and z₂ = −1+2i shown as vectors in ℝ² via the identification (a+bi) ↔ (a,b).',
  tags: ['complex-numbers', 'chapter-1'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const z1 = ok(mkConcreteVector('R', space.id, [rational(3), rational(4)]));
    const z2 = ok(mkConcreteVector('R', space.id, [rational(-1), rational(2)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [z1, z2],
      maps: [],
      namedObjects: [
        { name: 'z₁', ref: { kind: 'vector', id: z1.id } },
        { name: 'z₂', ref: { kind: 'vector', id: z2.id } },
      ],
      views: [
        {
          kind: 'geometric_2d',
          visualizerId: 'coordinate-axes-2d',
          objectId: space.id,
          refKind: 'space',
        },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: z1.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: z2.id, refKind: 'vector' },
        {
          kind: 'symbolic',
          visualizerId: 'coordinate-display',
          objectId: z1.id,
          refKind: 'vector',
        },
        {
          kind: 'symbolic',
          visualizerId: 'coordinate-display',
          objectId: z2.id,
          refKind: 'vector',
        },
      ],
    };
  },
};

// ── vector-addition-r2 ────────────────────────────────────────────────────

const vectorAdditionTemplate: SceneTemplate = {
  id: 'vector-addition-r2',
  title: 'Vector addition in ℝ²',
  description:
    'Two vectors v₁ = (1,2) and v₂ = (3,−1). Their sum w = v₁ + v₂ is a live derived vector — drag v₁ or v₂ and w updates automatically.',
  tags: ['addition', 'chapter-1', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const v1 = ok(mkConcreteVector('R', space.id, [rational(1), rational(2)]));
    const v2 = ok(mkConcreteVector('R', space.id, [rational(3), rational(-1)]));
    // w is derived: w = v1 + v2 = (4, 1) initially, recomputed on drag
    const w = mkDerivedVector('R', space.id, { op: 'add', left: v1.id, right: v2.id }, [
      float(4),
      float(1),
    ]);
    return {
      spaces: [space],
      bases: [],
      vectors: [v1, v2, w],
      maps: [],
      namedObjects: [
        { name: 'v₁', ref: { kind: 'vector', id: v1.id } },
        { name: 'v₂', ref: { kind: 'vector', id: v2.id } },
        { name: 'w', ref: { kind: 'vector', id: w.id } },
      ],
      views: [
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v1.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v2.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: w.id, refKind: 'vector' },
        {
          kind: 'symbolic',
          visualizerId: 'coordinate-display',
          objectId: w.id,
          refKind: 'vector',
        },
      ],
    };
  },
};

// ── polynomial-space ──────────────────────────────────────────────────────

const polynomialSpaceTemplate: SceneTemplate = {
  id: 'polynomial-space',
  title: 'Polynomial space 𝒫₂(ℝ)',
  description:
    'ℝ³ as a stand-in for 𝒫₂(ℝ) — polynomials of degree ≤ 2 form a 3-dimensional vector space with basis {1, x, x²}.',
  tags: ['polynomial', 'chapter-2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 3));
    return {
      spaces: [space],
      bases: [],
      vectors: [],
      maps: [],
      namedObjects: [{ name: '𝒫₂', ref: { kind: 'space', id: space.id } }],
      views: [
        {
          kind: 'symbolic',
          visualizerId: 'basis-display',
          objectId: space.id,
          refKind: 'space',
        },
        {
          kind: 'geometric_3d',
          visualizerId: 'coordinate-axes-3d',
          objectId: space.id,
          refKind: 'space',
        },
      ],
    };
  },
};

// ── line-through-origin-r2 ────────────────────────────────────────────────

const lineThroughOriginTemplate: SceneTemplate = {
  id: 'line-through-origin-r2',
  title: 'Line through the origin (subspace of ℝ²)',
  description:
    'The line span{(1,2)} ⊆ ℝ² is a subspace: it passes through the origin and is closed under addition and scalar multiplication.',
  tags: ['subspace', 'chapter-1', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const v = ok(mkConcreteVector('R', space.id, [rational(1), rational(2)]));
    const neg = ok(mkConcreteVector('R', space.id, [rational(-1), rational(-2)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [v, neg],
      maps: [],
      namedObjects: [
        { name: 'v', ref: { kind: 'vector', id: v.id } },
        { name: '−v', ref: { kind: 'vector', id: neg.id } },
      ],
      views: [
        {
          kind: 'geometric_2d',
          visualizerId: 'coordinate-axes-2d',
          objectId: space.id,
          refKind: 'space',
        },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: neg.id, refKind: 'vector' },
      ],
    };
  },
};

// ── zero-subspace ─────────────────────────────────────────────────────────

const zeroSubspaceTemplate: SceneTemplate = {
  id: 'zero-subspace',
  title: 'The zero subspace {0}',
  description:
    'The trivial subspace {0} of ℝ² — the single vector at the origin. It satisfies all three subspace conditions trivially.',
  tags: ['subspace', 'chapter-1', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const zero = ok(mkConcreteVector('R', space.id, [rational(0), rational(0)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [zero],
      maps: [],
      namedObjects: [{ name: '0', ref: { kind: 'vector', id: zero.id } }],
      views: [
        {
          kind: 'geometric_2d',
          visualizerId: 'coordinate-axes-2d',
          objectId: space.id,
          refKind: 'space',
        },
        {
          kind: 'symbolic',
          visualizerId: 'coordinate-display',
          objectId: zero.id,
          refKind: 'vector',
        },
      ],
    };
  },
};

// ── affine-line-r2 ────────────────────────────────────────────────────────

const affineLineTemplate: SceneTemplate = {
  id: 'affine-line-r2',
  title: 'Affine line — not a subspace',
  description:
    'The set {(x,1) : x ∈ ℝ} is a horizontal line in ℝ² that does not pass through the origin. It fails the subspace test: (1,1)+(1,1)=(2,2) is not on the line.',
  tags: ['subspace', 'chapter-1', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const p = ok(mkConcreteVector('R', space.id, [rational(1), rational(1)]));
    const q = ok(mkConcreteVector('R', space.id, [rational(-1), rational(1)]));
    const badSum = ok(mkConcreteVector('R', space.id, [rational(2), rational(2)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [p, q, badSum],
      maps: [],
      namedObjects: [
        { name: 'p', ref: { kind: 'vector', id: p.id } },
        { name: 'q', ref: { kind: 'vector', id: q.id } },
        { name: 'p+p', ref: { kind: 'vector', id: badSum.id } },
      ],
      views: [
        {
          kind: 'geometric_2d',
          visualizerId: 'coordinate-axes-2d',
          objectId: space.id,
          refKind: 'space',
        },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: p.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: q.id, refKind: 'vector' },
        {
          kind: 'geometric_2d',
          visualizerId: 'arrow-2d',
          objectId: badSum.id,
          refKind: 'vector',
        },
      ],
    };
  },
};

// ── sum-of-two-lines-r2 ───────────────────────────────────────────────────

const sumOfTwoLinesTemplate: SceneTemplate = {
  id: 'sum-of-two-lines-r2',
  title: 'Sum of two lines in ℝ²',
  description:
    'The x-axis span{e₁} and y-axis span{e₂} are distinct lines in ℝ². Their sum span{e₁} + span{e₂} = ℝ².',
  tags: ['subspace', 'sum', 'chapter-1', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const e1 = ok(mkConcreteVector('R', space.id, [rational(1), rational(0)]));
    const e2 = ok(mkConcreteVector('R', space.id, [rational(0), rational(1)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [e1, e2],
      maps: [],
      namedObjects: [
        { name: 'e₁', ref: { kind: 'vector', id: e1.id } },
        { name: 'e₂', ref: { kind: 'vector', id: e2.id } },
      ],
      views: [
        {
          kind: 'geometric_2d',
          visualizerId: 'coordinate-axes-2d',
          objectId: space.id,
          refKind: 'space',
        },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: e1.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: e2.id, refKind: 'vector' },
      ],
    };
  },
};

// ── direct-sum-two-lines ──────────────────────────────────────────────────

const directSumTwoLinesTemplate: SceneTemplate = {
  id: 'direct-sum-two-lines',
  title: 'Direct sum of two lines in ℝ²',
  description:
    'span{e₁} ⊕ span{e₂} = ℝ². The two lines intersect only at the origin, so every vector in ℝ² has a unique decomposition into x-component and y-component.',
  tags: ['direct-sum', 'chapter-1', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const e1 = ok(mkConcreteVector('R', space.id, [rational(1), rational(0)]));
    const e2 = ok(mkConcreteVector('R', space.id, [rational(0), rational(1)]));
    const v = ok(mkConcreteVector('R', space.id, [rational(2), rational(3)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [e1, e2, v],
      maps: [],
      namedObjects: [
        { name: 'e₁', ref: { kind: 'vector', id: e1.id } },
        { name: 'e₂', ref: { kind: 'vector', id: e2.id } },
        { name: 'v', ref: { kind: 'vector', id: v.id } },
      ],
      views: [
        {
          kind: 'geometric_2d',
          visualizerId: 'coordinate-axes-2d',
          objectId: space.id,
          refKind: 'space',
        },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: e1.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: e2.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v.id, refKind: 'vector' },
        { kind: 'symbolic', visualizerId: 'coordinate-display', objectId: v.id, refKind: 'vector' },
      ],
    };
  },
};

// ── non-direct-sum ────────────────────────────────────────────────────────

const nonDirectSumTemplate: SceneTemplate = {
  id: 'non-direct-sum',
  title: 'Sum that is not direct',
  description:
    'Let U₁ = U₂ = span{e₁} in ℝ². Then U₁ + U₂ = span{e₁}, but the sum is not direct because every nonzero vector in span{e₁} has multiple decompositions (e.g. e₁ = e₁ + 0 = ½e₁ + ½e₁).',
  tags: ['direct-sum', 'chapter-1', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const u = ok(mkConcreteVector('R', space.id, [rational(1), rational(0)]));
    const v = ok(mkConcreteVector('R', space.id, [rational(2), rational(0)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [u, v],
      maps: [],
      namedObjects: [
        { name: 'u', ref: { kind: 'vector', id: u.id } },
        { name: '2u', ref: { kind: 'vector', id: v.id } },
      ],
      views: [
        {
          kind: 'geometric_2d',
          visualizerId: 'coordinate-axes-2d',
          objectId: space.id,
          refKind: 'space',
        },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: u.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v.id, refKind: 'vector' },
      ],
    };
  },
};

// ── span-one-vector ───────────────────────────────────────────────────────

const spanOneVectorTemplate: SceneTemplate = {
  id: 'span-one-vector',
  title: 'Span of a single vector',
  description:
    'The span of v = (1,2) is the line through the origin in ℝ² in the direction of v. It is a proper subspace of ℝ² — not all of ℝ².',
  tags: ['span', 'chapter-2', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const v = ok(mkConcreteVector('R', space.id, [rational(1), rational(2)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [v],
      maps: [],
      namedObjects: [{ name: 'v', ref: { kind: 'vector', id: v.id } }],
      views: [
        {
          kind: 'geometric_2d',
          visualizerId: 'coordinate-axes-2d',
          objectId: space.id,
          refKind: 'space',
        },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v.id, refKind: 'vector' },
        { kind: 'symbolic', visualizerId: 'coordinate-display', objectId: v.id, refKind: 'vector' },
      ],
    };
  },
};

// ── linearly-dependent-pair ───────────────────────────────────────────────

const linearlyDependentPairTemplate: SceneTemplate = {
  id: 'linearly-dependent-pair',
  title: 'Linearly dependent pair',
  description:
    'v₁ = (1,2) and v₂ = (2,4) in ℝ². Both arrows point along the same line — v₂ = 2v₁, so 2v₁ − v₂ = 0 is a nontrivial linear relation.',
  tags: ['linear-dependence', 'chapter-2', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const v1 = ok(mkConcreteVector('R', space.id, [rational(1), rational(2)]));
    const v2 = ok(mkConcreteVector('R', space.id, [rational(2), rational(4)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [v1, v2],
      maps: [],
      namedObjects: [
        { name: 'v₁', ref: { kind: 'vector', id: v1.id } },
        { name: 'v₂', ref: { kind: 'vector', id: v2.id } },
      ],
      views: [
        {
          kind: 'geometric_2d',
          visualizerId: 'coordinate-axes-2d',
          objectId: space.id,
          refKind: 'space',
        },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v1.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v2.id, refKind: 'vector' },
        {
          kind: 'symbolic',
          visualizerId: 'coordinate-display',
          objectId: v1.id,
          refKind: 'vector',
        },
        {
          kind: 'symbolic',
          visualizerId: 'coordinate-display',
          objectId: v2.id,
          refKind: 'vector',
        },
      ],
    };
  },
};

// ── non-standard-basis ────────────────────────────────────────────────────

const nonStandardBasisTemplate: SceneTemplate = {
  id: 'non-standard-basis',
  title: 'Non-standard basis for ℝ²',
  description:
    'b₁ = (1,1) and b₂ = (1,−1) form a basis for ℝ². A sample vector v = (2,0) is shown; in this basis, v = b₁ + b₂ (since (1,1)+(1,−1)=(2,0)).',
  tags: ['basis', 'chapter-2', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const b1 = ok(mkConcreteVector('R', space.id, [rational(1), rational(1)]));
    const b2 = ok(mkConcreteVector('R', space.id, [rational(1), rational(-1)]));
    const v = ok(mkConcreteVector('R', space.id, [rational(2), rational(0)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [b1, b2, v],
      maps: [],
      namedObjects: [
        { name: 'b₁', ref: { kind: 'vector', id: b1.id } },
        { name: 'b₂', ref: { kind: 'vector', id: b2.id } },
        { name: 'v', ref: { kind: 'vector', id: v.id } },
      ],
      views: [
        {
          kind: 'geometric_2d',
          visualizerId: 'coordinate-axes-2d',
          objectId: space.id,
          refKind: 'space',
        },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: b1.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: b2.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v.id, refKind: 'vector' },
        { kind: 'symbolic', visualizerId: 'coordinate-display', objectId: v.id, refKind: 'vector' },
      ],
    };
  },
};

// ── gram-schmidt-stepwise ─────────────────────────────────────────────────

const gramSchmidtTemplate: SceneTemplate = {
  id: 'gram-schmidt-stepwise',
  title: 'Gram-Schmidt orthogonalization',
  description:
    'Starting from v₁ = (1,1) and v₂ = (0,1), Gram-Schmidt produces e₁ = (1,0)/‖…‖ and e₂ = (0,1). The original and orthogonalized vectors are shown side by side.',
  tags: ['gram-schmidt', 'orthogonalization', 'chapter-6', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    // Original vectors
    const v1 = ok(mkConcreteVector('R', space.id, [rational(1), rational(1)]));
    const v2 = ok(mkConcreteVector('R', space.id, [rational(0), rational(1)]));
    // After Gram-Schmidt: e1 = (1/√2)(1,1) — show rational approx (1,0) after normalization step
    // We show the result of removing the projection of v2 onto v1:
    // proj_{v1}(v2) = (v2·v1/v1·v1)v1 = (1/2)(1,1) = (1/2, 1/2)
    // v2 - proj = (0,1) - (1/2,1/2) = (-1/2, 1/2) — orthogonal component
    const orthoComp = ok(mkConcreteVector('R', space.id, [rational(-1, 2), rational(1, 2)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [v1, v2, orthoComp],
      maps: [],
      namedObjects: [
        { name: 'v₁', ref: { kind: 'vector', id: v1.id } },
        { name: 'v₂', ref: { kind: 'vector', id: v2.id } },
        { name: 'v₂⊥', ref: { kind: 'vector', id: orthoComp.id } },
      ],
      views: [
        {
          kind: 'geometric_2d',
          visualizerId: 'coordinate-axes-2d',
          objectId: space.id,
          refKind: 'space',
        },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v1.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v2.id, refKind: 'vector' },
        {
          kind: 'geometric_2d',
          visualizerId: 'arrow-2d',
          objectId: orthoComp.id,
          refKind: 'vector',
        },
      ],
    };
  },
};

// ── span-of-two-vectors-in-r2 ─────────────────────────────────────────────

const spanTemplate: SceneTemplate = {
  id: 'span-of-two-vectors-in-r2',
  title: 'Span of two vectors in ℝ²',
  description: 'Two vectors in ℝ² and their span (all linear combinations).',
  tags: ['span', 'chapter-2', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const v1 = ok(mkConcreteVector('R', space.id, [rational(1), rational(0)]));
    const v2 = ok(mkConcreteVector('R', space.id, [rational(0), rational(1)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [v1, v2],
      maps: [],
      namedObjects: [
        { name: 'v₁', ref: { kind: 'vector', id: v1.id } },
        { name: 'v₂', ref: { kind: 'vector', id: v2.id } },
      ],
      views: [
        {
          kind: 'symbolic',
          visualizerId: 'coordinate-display',
          objectId: v1.id,
          refKind: 'vector',
        },
        {
          kind: 'symbolic',
          visualizerId: 'coordinate-display',
          objectId: v2.id,
          refKind: 'vector',
        },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v1.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v2.id, refKind: 'vector' },
      ],
    };
  },
};

// ── linear-combination-builder ────────────────────────────────────────────

const linearCombTemplate: SceneTemplate = {
  id: 'linear-combination-builder',
  title: 'Linear combination',
  description:
    'Scaled vectors 3v₁ and 2v₂ and their sum w = 3v₁ + 2v₂. The intermediate scaled vectors and the sum are all live — drag v₁ or v₂ to see all three update.',
  tags: ['linear-combination', 'chapter-2', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const v1 = ok(mkConcreteVector('R', space.id, [rational(1), rational(0)]));
    const v2 = ok(mkConcreteVector('R', space.id, [rational(0), rational(1)]));
    // a = 3 * v1 (derived), b = 2 * v2 (derived), w = a + b (derived)
    const a = mkDerivedVector('R', space.id, { op: 'scale', scalar: rational(3), vector: v1.id }, [
      float(3),
      float(0),
    ]);
    const b = mkDerivedVector('R', space.id, { op: 'scale', scalar: rational(2), vector: v2.id }, [
      float(0),
      float(2),
    ]);
    const w = mkDerivedVector('R', space.id, { op: 'add', left: a.id, right: b.id }, [
      float(3),
      float(2),
    ]);
    return {
      spaces: [space],
      bases: [],
      vectors: [v1, v2, a, b, w],
      maps: [],
      namedObjects: [
        { name: 'v₁', ref: { kind: 'vector', id: v1.id } },
        { name: 'v₂', ref: { kind: 'vector', id: v2.id } },
        { name: '3v₁', ref: { kind: 'vector', id: a.id } },
        { name: '2v₂', ref: { kind: 'vector', id: b.id } },
        { name: 'w', ref: { kind: 'vector', id: w.id } },
      ],
      views: [
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v1.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v2.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: w.id, refKind: 'vector' },
        {
          kind: 'symbolic',
          visualizerId: 'coordinate-display',
          objectId: w.id,
          refKind: 'vector',
        },
      ],
    };
  },
};

// ── basis-as-coordinates ──────────────────────────────────────────────────

const basisTemplate: SceneTemplate = {
  id: 'basis-as-coordinates',
  title: 'Basis and coordinates',
  description: 'Standard basis e₁, e₂ for ℝ² with a sample vector and its coordinates.',
  tags: ['basis', 'coordinates', 'chapter-2', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const v = ok(mkConcreteVector('R', space.id, [rational(3, 4), rational(-1, 2)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [v],
      maps: [],
      namedObjects: [{ name: 'v', ref: { kind: 'vector', id: v.id } }],
      views: [
        {
          kind: 'geometric_2d',
          visualizerId: 'coordinate-axes-2d',
          objectId: space.id,
          refKind: 'space',
        },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v.id, refKind: 'vector' },
        { kind: 'symbolic', visualizerId: 'coordinate-display', objectId: v.id, refKind: 'vector' },
      ],
    };
  },
};

// ── rank-nullity-2d ───────────────────────────────────────────────────────

const rankNullityTemplate: SceneTemplate = {
  id: 'rank-nullity-2d',
  title: 'Rank-nullity theorem',
  description: 'A 2×2 linear map (rank 1) showing kernel, range, and rank-nullity.',
  tags: ['rank', 'nullity', 'linear-map', 'chapter-3', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const domain = ok(mkVectorSpaceFn('R', 2));
    const codomain = ok(mkVectorSpaceFn('R', 2));
    const domBid = bid(domain.id);
    const codBid = bid(codomain.id);
    // [[1,0],[0,0]] — rank 1, nullity 1
    const mat = ok(
      mkMatrix(
        'R',
        [
          [rational(1), rational(0)],
          [rational(0), rational(0)],
        ],
        domBid,
        codBid,
      ),
    );
    const A = ok(mkLinearMapByMatrix(domain.id, codomain.id, mat, domBid, codBid));
    return {
      spaces: [domain, codomain],
      bases: [],
      vectors: [],
      maps: [A],
      namedObjects: [{ name: 'A', ref: { kind: 'map', id: A.id } }],
      views: [
        { kind: 'matrix', visualizerId: 'matrix-heatmap', objectId: A.id, refKind: 'map' },
        { kind: 'diagram', visualizerId: 'kernel-range-diagram', objectId: A.id, refKind: 'map' },
        { kind: 'chart', visualizerId: 'dimension-bars', objectId: A.id, refKind: 'map' },
      ],
    };
  },
};

// ── linear-map-matrix ─────────────────────────────────────────────────────
// A general 2×2 linear map shown via its matrix and kernel-range structure.

const linearMapMatrixTemplate: SceneTemplate = {
  id: 'linear-map-matrix',
  title: 'Linear map and its matrix',
  description:
    'The map T: ℝ² → ℝ² defined by T(x,y) = (x+y, x−y) shown via its matrix [[1,1],[1,−1]] with heatmap and kernel-range diagram.',
  tags: ['linear-map', 'matrix', 'chapter-3', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const domain = ok(mkVectorSpaceFn('R', 2));
    const codomain = ok(mkVectorSpaceFn('R', 2));
    const domBid = bid(domain.id);
    const codBid = bid(codomain.id);
    const mat = ok(
      mkMatrix(
        'R',
        [
          [rational(1), rational(1)],
          [rational(1), rational(-1)],
        ],
        domBid,
        codBid,
      ),
    );
    const T = ok(mkLinearMapByMatrix(domain.id, codomain.id, mat, domBid, codBid));
    return {
      spaces: [domain, codomain],
      bases: [],
      vectors: [],
      maps: [T],
      namedObjects: [{ name: 'T', ref: { kind: 'map', id: T.id } }],
      views: [
        { kind: 'matrix', visualizerId: 'matrix-heatmap', objectId: T.id, refKind: 'map' },
        { kind: 'diagram', visualizerId: 'kernel-range-diagram', objectId: T.id, refKind: 'map' },
        {
          kind: 'geometric_2d',
          visualizerId: 'grid-deformation-2d',
          objectId: T.id,
          refKind: 'map',
        },
      ],
    };
  },
};

// ── null-space-demo ───────────────────────────────────────────────────────
// A rank-1 projection onto the x-axis: clear 1-dimensional null space.

const nullSpaceDemoTemplate: SceneTemplate = {
  id: 'null-space-demo',
  title: 'Null space of a projection',
  description:
    'The projection P: ℝ² → ℝ² defined by P(x,y) = (x,0). The null space is the y-axis {(0,y) : y ∈ ℝ}, and the range is the x-axis.',
  tags: ['null-space', 'kernel', 'linear-map', 'chapter-3', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const domain = ok(mkVectorSpaceFn('R', 2));
    const codomain = ok(mkVectorSpaceFn('R', 2));
    const domBid = bid(domain.id);
    const codBid = bid(codomain.id);
    const mat = ok(
      mkMatrix(
        'R',
        [
          [rational(1), rational(0)],
          [rational(0), rational(0)],
        ],
        domBid,
        codBid,
      ),
    );
    const P = ok(mkLinearMapByMatrix(domain.id, codomain.id, mat, domBid, codBid));
    return {
      spaces: [domain, codomain],
      bases: [],
      vectors: [],
      maps: [P],
      namedObjects: [{ name: 'P', ref: { kind: 'map', id: P.id } }],
      views: [
        { kind: 'matrix', visualizerId: 'matrix-heatmap', objectId: P.id, refKind: 'map' },
        { kind: 'diagram', visualizerId: 'kernel-range-diagram', objectId: P.id, refKind: 'map' },
        { kind: 'chart', visualizerId: 'dimension-bars', objectId: P.id, refKind: 'map' },
      ],
    };
  },
};

// ── injective-map-r2 ──────────────────────────────────────────────────────
// Full-rank 2×2 map (shear): null space = {0}, so injective.

const injectiveMapTemplate: SceneTemplate = {
  id: 'injective-map-r2',
  title: 'Injective linear map on ℝ²',
  description:
    'The shear T(x,y) = (x+y, y). This map is injective: null T = {0}. Rank = 2, nullity = 0.',
  tags: ['injective', 'linear-map', 'chapter-3', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const domain = ok(mkVectorSpaceFn('R', 2));
    const codomain = ok(mkVectorSpaceFn('R', 2));
    const domBid = bid(domain.id);
    const codBid = bid(codomain.id);
    // [[1,1],[0,1]] — shear, det=1, full rank
    const mat = ok(
      mkMatrix(
        'R',
        [
          [rational(1), rational(1)],
          [rational(0), rational(1)],
        ],
        domBid,
        codBid,
      ),
    );
    const T = ok(mkLinearMapByMatrix(domain.id, codomain.id, mat, domBid, codBid));
    return {
      spaces: [domain, codomain],
      bases: [],
      vectors: [],
      maps: [T],
      namedObjects: [{ name: 'T', ref: { kind: 'map', id: T.id } }],
      views: [
        { kind: 'matrix', visualizerId: 'matrix-heatmap', objectId: T.id, refKind: 'map' },
        { kind: 'diagram', visualizerId: 'kernel-range-diagram', objectId: T.id, refKind: 'map' },
        {
          kind: 'geometric_2d',
          visualizerId: 'grid-deformation-2d',
          objectId: T.id,
          refKind: 'map',
        },
      ],
    };
  },
};

// ── invertible-map-r2 ─────────────────────────────────────────────────────
// Rotation by π/3 — orthogonal, hence invertible.

const invertibleMapTemplate: SceneTemplate = {
  id: 'invertible-map-r2',
  title: 'Invertible linear map on ℝ²',
  description:
    'Rotation by 60°: T(x,y) = (½x − (√3/2)y, (√3/2)x + ½y). Rational approximation used. det(T) = 1, so T is invertible and its inverse is rotation by −60°.',
  tags: ['invertible', 'isomorphism', 'linear-map', 'chapter-3', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const domain = ok(mkVectorSpaceFn('R', 2));
    const codomain = ok(mkVectorSpaceFn('R', 2));
    const domBid = bid(domain.id);
    const codBid = bid(codomain.id);
    // Rational approximation of rotation by π/3: cos(60°)=1/2, sin(60°)≈866/1000
    // [[1/2, -866/1000], [866/1000, 1/2]]
    const mat = ok(
      mkMatrix(
        'R',
        [
          [rational(1, 2), rational(-866, 1000)],
          [rational(866, 1000), rational(1, 2)],
        ],
        domBid,
        codBid,
      ),
    );
    const T = ok(mkLinearMapByMatrix(domain.id, codomain.id, mat, domBid, codBid));
    return {
      spaces: [domain, codomain],
      bases: [],
      vectors: [],
      maps: [T],
      namedObjects: [{ name: 'T', ref: { kind: 'map', id: T.id } }],
      views: [
        { kind: 'matrix', visualizerId: 'matrix-heatmap', objectId: T.id, refKind: 'map' },
        {
          kind: 'geometric_2d',
          visualizerId: 'grid-deformation-2d',
          objectId: T.id,
          refKind: 'map',
        },
        { kind: 'diagram', visualizerId: 'kernel-range-diagram', objectId: T.id, refKind: 'map' },
      ],
    };
  },
};

// ── matrix-product-r2 ─────────────────────────────────────────────────────
// Two 2×2 maps and their composition, shown as separate objects.

const matrixProductTemplate: SceneTemplate = {
  id: 'matrix-product-r2',
  title: 'Matrix multiplication as composition',
  description:
    'A = [[2,0],[0,1]] (x-scaling) and B = [[1,1],[0,1]] (shear). AB = [[2,2],[0,1]] — scaling then shearing. Both maps and their product are shown.',
  tags: ['matrix-multiplication', 'composition', 'chapter-3', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const b = bid(space.id);
    const matA = ok(
      mkMatrix(
        'R',
        [
          [rational(2), rational(0)],
          [rational(0), rational(1)],
        ],
        b,
        b,
      ),
    );
    const matB = ok(
      mkMatrix(
        'R',
        [
          [rational(1), rational(1)],
          [rational(0), rational(1)],
        ],
        b,
        b,
      ),
    );
    // AB: row-by-col: [[2*1+0*0, 2*1+0*1],[0*1+1*0, 0*1+1*1]] = [[2,2],[0,1]]
    const matAB = ok(
      mkMatrix(
        'R',
        [
          [rational(2), rational(2)],
          [rational(0), rational(1)],
        ],
        b,
        b,
      ),
    );
    const A = ok(mkLinearMapByMatrix(space.id, space.id, matA, b, b));
    const B = ok(mkLinearMapByMatrix(space.id, space.id, matB, b, b));
    const AB = ok(mkLinearMapByMatrix(space.id, space.id, matAB, b, b));
    return {
      spaces: [space],
      bases: [],
      vectors: [],
      maps: [A, B, AB],
      namedObjects: [
        { name: 'A', ref: { kind: 'map', id: A.id } },
        { name: 'B', ref: { kind: 'map', id: B.id } },
        { name: 'AB', ref: { kind: 'map', id: AB.id } },
      ],
      views: [
        { kind: 'matrix', visualizerId: 'matrix-heatmap', objectId: A.id, refKind: 'map' },
        { kind: 'matrix', visualizerId: 'matrix-heatmap', objectId: B.id, refKind: 'map' },
        { kind: 'matrix', visualizerId: 'matrix-heatmap', objectId: AB.id, refKind: 'map' },
      ],
    };
  },
};

// ── Exports ───────────────────────────────────────────────────────────────

export const STARTER_TEMPLATES: readonly SceneTemplate[] = [
  // Chapter 1
  rnTemplate,
  rnAsFnTemplate,
  complexArithmeticTemplate,
  vectorAdditionTemplate,
  polynomialSpaceTemplate,
  lineThroughOriginTemplate,
  zeroSubspaceTemplate,
  affineLineTemplate,
  sumOfTwoLinesTemplate,
  directSumTwoLinesTemplate,
  nonDirectSumTemplate,
  // Chapter 2
  spanTemplate,
  spanOneVectorTemplate,
  linearCombTemplate,
  linearlyDependentPairTemplate,
  basisTemplate,
  nonStandardBasisTemplate,
  gramSchmidtTemplate,
  // Chapter 3
  rankNullityTemplate,
  linearMapMatrixTemplate,
  nullSpaceDemoTemplate,
  injectiveMapTemplate,
  invertibleMapTemplate,
  matrixProductTemplate,
];
