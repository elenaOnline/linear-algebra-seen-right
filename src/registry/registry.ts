import { invariantViolation } from '../types/errors.ts';
import type { MathObject, MathObjectKind, Visualizer } from './types.ts';
import type { SessionView } from '../types/session-view.ts';

export class VisualizerRegistry {
  private readonly entries = new Map<MathObjectKind, Visualizer<MathObject>[]>();
  private readonly byId = new Map<string, Visualizer<MathObject>>();

  register<T extends MathObject>(
    kind: MathObjectKind,
    visualizers: readonly Visualizer<T>[],
  ): void {
    for (const v of visualizers) {
      if (this.byId.has(v.id)) {
        invariantViolation(`Duplicate visualizer id: "${v.id}"`);
      }
      const cast = v as unknown as Visualizer<MathObject>;
      this.byId.set(v.id, cast);
      const bucket = this.entries.get(kind) ?? [];
      bucket.push(cast);
      this.entries.set(kind, bucket);
    }
  }

  getApplicable<T extends MathObject>(
    kind: MathObjectKind,
    obj: T,
    session: SessionView,
  ): Visualizer<T>[] {
    const bucket = this.entries.get(kind) ?? [];
    return bucket.filter((v) => v.applicable(obj, session));
  }

  getById(id: string): Visualizer<MathObject> | undefined {
    return this.byId.get(id);
  }

  getAll(kind: MathObjectKind): Visualizer<MathObject>[] {
    return this.entries.get(kind) ?? [];
  }
}
