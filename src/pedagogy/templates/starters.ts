// Five starter scene templates for Phase 8.
// Each build() is pure — no store access, no side effects.

import { mkVectorSpaceFn } from '../../types/space.ts';
import { mkConcreteVector } from '../../types/vector.ts';
import { mkLinearMapByMatrix } from '../../types/map.ts';
import { mkMatrix } from '../../types/matrix.ts';
import { rational } from '../../types/scalar.ts';
import type { BasisId } from '../../types/ids.ts';
import { invariantViolation } from '../../types/errors.ts';
import type { SceneBuild, SceneTemplate } from './types.ts';

function ok<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) invariantViolation(`scene template build failed: ${String(r.error)}`);
  return r.value;
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

// ── span-of-two-vectors-in-r2 ────────────────────────────────────────────

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
  description: 'A linear combination 3v₁ + 2v₂ of two basis vectors in ℝ².',
  tags: ['linear-combination', 'chapter-2', 'r2'],
  parameters: [],
  build: (): SceneBuild => {
    const space = ok(mkVectorSpaceFn('R', 2));
    const v1 = ok(mkConcreteVector('R', space.id, [rational(1), rational(0)]));
    const v2 = ok(mkConcreteVector('R', space.id, [rational(0), rational(1)]));
    const combo = ok(mkConcreteVector('R', space.id, [rational(3), rational(2)]));
    return {
      spaces: [space],
      bases: [],
      vectors: [v1, v2, combo],
      maps: [],
      namedObjects: [
        { name: 'v₁', ref: { kind: 'vector', id: v1.id } },
        { name: 'v₂', ref: { kind: 'vector', id: v2.id } },
        { name: 'w', ref: { kind: 'vector', id: combo.id } },
      ],
      views: [
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v1.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: v2.id, refKind: 'vector' },
        { kind: 'geometric_2d', visualizerId: 'arrow-2d', objectId: combo.id, refKind: 'vector' },
        {
          kind: 'symbolic',
          visualizerId: 'coordinate-display',
          objectId: combo.id,
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
    const basisId = domain.id as unknown as BasisId;
    const codomainBasisId = codomain.id as unknown as BasisId;
    // [[1,0],[0,0]] — rank 1, nullity 1
    const mat = ok(
      mkMatrix(
        'R',
        [
          [rational(1), rational(0)],
          [rational(0), rational(0)],
        ],
        basisId,
        codomainBasisId,
      ),
    );
    const A = ok(mkLinearMapByMatrix(domain.id, codomain.id, mat, basisId, codomainBasisId));
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

// Placeholder for templates referenced in overrides that don't have rich builds yet
function placeholder(id: string, title: string): SceneTemplate {
  return {
    id,
    title,
    description: title,
    tags: [],
    parameters: [],
    build: (): SceneBuild => ({
      spaces: [],
      bases: [],
      vectors: [],
      maps: [],
      namedObjects: [],
      views: [],
    }),
  };
}

export const STARTER_TEMPLATES: readonly SceneTemplate[] = [
  rnTemplate,
  spanTemplate,
  linearCombTemplate,
  basisTemplate,
  rankNullityTemplate,
  placeholder('complex-arithmetic', 'Complex arithmetic'),
  placeholder('rn-as-fn', 'ℝⁿ as Fⁿ'),
  placeholder('vector-addition-r2', 'Vector addition in ℝ²'),
  placeholder('polynomial-space', 'Polynomial space'),
  placeholder('line-through-origin-r2', 'Line through origin in ℝ²'),
  placeholder('zero-subspace', 'Zero subspace'),
  placeholder('affine-line-r2', 'Affine line (non-subspace)'),
  placeholder('sum-of-two-lines-r2', 'Sum of two lines in ℝ²'),
  placeholder('direct-sum-two-lines', 'Direct sum of two lines'),
  placeholder('non-direct-sum', 'Non-direct sum example'),
  placeholder('span-one-vector', 'Span of one vector'),
  placeholder('linearly-dependent-pair', 'Linearly dependent pair'),
  placeholder('non-standard-basis', 'Non-standard basis for ℝ²'),
  placeholder('gram-schmidt-stepwise', 'Gram-Schmidt stepwise'),
];
