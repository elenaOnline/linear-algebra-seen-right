import type { VectorSpace } from '../../types/space.ts';
import type { Basis } from '../../types/basis.ts';
import type { Vector } from '../../types/vector.ts';
import type { LinearMap } from '../../types/map.ts';
import type { ViewKind, MathObjectRef } from '../../state/types.ts';

export type SceneBuild = {
  readonly spaces: readonly VectorSpace[];
  readonly bases: readonly Basis[];
  readonly vectors: readonly Vector[];
  readonly maps: readonly LinearMap[];
  readonly namedObjects: readonly { name: string; ref: MathObjectRef }[];
  readonly views: readonly {
    kind: ViewKind;
    visualizerId: string;
    objectId: string;
    refKind: MathObjectRef['kind'];
  }[];
};

export type TemplateParameter = {
  readonly name: string;
  readonly kind: 'scalar' | 'integer' | 'field' | 'choice';
  readonly default: unknown;
  readonly range?: readonly [number, number];
  readonly choices?: readonly string[];
};

export type SceneTemplate = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly parameters: readonly TemplateParameter[];
  readonly build: (params: Readonly<Record<string, unknown>>) => SceneBuild;
};
