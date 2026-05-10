import type { Matrix } from '../types/matrix.ts';
import type { Vector } from '../types/vector.ts';
import type { Basis } from '../types/basis.ts';
import type { InnerProduct } from '../types/inner-product.ts';
import type { LinearMap } from '../types/map.ts';
import type { Polynomial } from '../types/polynomial.ts';
import type { Scalar } from '../types/scalar.ts';
import type { Field } from '../types/field.ts';
import type { BasisId, SpaceId } from '../types/ids.ts';
import { mkMatrix } from '../types/matrix.ts';
import { mkPolynomial } from '../types/polynomial.ts';
import { float, rational, addScalar, mulScalar } from '../types/scalar.ts';
import { mkConcreteVector } from '../types/vector.ts';
import { mkBasis } from '../types/basis.ts';
import { invariantViolation } from '../types/errors.ts';

import type { SymbolicAdapter } from './symbolic/protocol.ts';
import type {
  EigenResult,
  SVDResult,
  QRResult,
  InverseResult,
  JordanResult,
  ExactNumerical,
} from './types.ts';

import { serializeMatrix, matrixProvenance } from './serialization/matrix.ts';
import { serializeScalar, deserializeScalar } from './serialization/scalar.ts';
import {
  numericalEigendecompose,
  numericalDeterminant,
  numericalRank,
  numericalNullSpace,
  numericalRref,
  numericalInverse,
  numericalSvd,
  numericalQr,
  numericalGramSchmidt,
  numericalLinearSolve,
} from './numerical/mlmatrix.ts';

export type { EigenResult, SVDResult, QRResult, InverseResult, JordanResult, ExactNumerical };

export interface ComputationEngine {
  /** Resolves when the symbolic track is ready. Numerical calls do not need to await this. */
  readonly ready: Promise<void>;

  eigendecompose(M: Matrix, opts?: { signal?: AbortSignal }): Promise<ExactNumerical<EigenResult>>;
  nullSpace(M: Matrix, opts?: { signal?: AbortSignal }): Promise<ExactNumerical<Basis>>;
  rank(M: Matrix, opts?: { signal?: AbortSignal }): Promise<ExactNumerical<number>>;
  rref(M: Matrix, opts?: { signal?: AbortSignal }): Promise<ExactNumerical<Matrix>>;
  inverse(M: Matrix, opts?: { signal?: AbortSignal }): Promise<InverseResult>;
  determinant(M: Matrix, opts?: { signal?: AbortSignal }): Promise<ExactNumerical<Scalar>>;
  minimalPoly(M: Matrix, opts?: { signal?: AbortSignal }): Promise<Polynomial>;
  characteristicPoly(M: Matrix, opts?: { signal?: AbortSignal }): Promise<Polynomial>;
  jordanForm(M: Matrix, opts?: { signal?: AbortSignal }): Promise<JordanResult>;
  svd(M: Matrix, opts?: { signal?: AbortSignal }): Promise<SVDResult>;
  qr(M: Matrix, opts?: { signal?: AbortSignal }): Promise<QRResult>;
  gramSchmidt(
    vectors: Vector[],
    ip: InnerProduct,
    opts?: { signal?: AbortSignal },
  ): Promise<ExactNumerical<Vector[]>>;
  linearCombinationSolver(
    target: Vector,
    generators: Vector[],
    opts?: { signal?: AbortSignal },
  ): Promise<ExactNumerical<Scalar[] | null>>;
  matrixOf(
    map: LinearMap,
    domainBasis: Basis,
    codomainBasis: Basis,
    field: Field,
    opts?: { signal?: AbortSignal },
  ): Promise<ExactNumerical<Matrix>>;
  applyMap(
    map: LinearMap,
    v: Vector,
    opts?: { signal?: AbortSignal },
  ): Promise<ExactNumerical<Vector>>;
}

function assertSquare(M: Matrix): void {
  if (M.rows !== M.cols) {
    invariantViolation(`operation requires square matrix, got ${M.rows}×${M.cols}`);
  }
}

function vectorToFloats(v: Vector): number[] {
  if (v.kind !== 'concrete') {
    invariantViolation('vectorToFloats: only concrete vectors are supported');
  }
  return v.components.map((s) => {
    if (s.kind === 'rational') return s.value.valueOf();
    if (s.kind === 'float') return s.value;
    if (s.kind === 'algebraic') return s.approx;
    return 0;
  });
}

function spaceIdOfMatrix(M: Matrix): SpaceId {
  return M.domainBasis as unknown as SpaceId;
}

class Engine implements ComputationEngine {
  readonly ready: Promise<void>;

  constructor(private readonly symbolic: SymbolicAdapter) {
    this.ready = symbolic.ready;
  }

  async eigendecompose(
    M: Matrix,
    opts?: { signal?: AbortSignal },
  ): Promise<ExactNumerical<EigenResult>> {
    assertSquare(M);
    const numerical = numericalEigendecompose(M);
    if (matrixProvenance(M) === 'numerical_only') return { exact: null, numerical };

    try {
      const result = await this.symbolic.eigendecompose(serializeMatrix(M).entries, opts?.signal);
      if (result.kind === 'error') return { exact: null, numerical };

      const spaceId = spaceIdOfMatrix(M);
      const values = result.values.map((v) => ({
        value: deserializeScalar(v.value),
        algebraicMultiplicity: v.multiplicity,
      }));
      const vectors = result.vectors.map((rowData) => {
        const components = rowData.map(deserializeScalar);
        const vr = mkConcreteVector(M.field, spaceId, components);
        if (!vr.ok) invariantViolation(`eigendecompose: ${vr.error.message}`);
        return vr.value;
      });
      return { exact: { provenance: 'exact', values, vectors }, numerical };
    } catch {
      return { exact: null, numerical };
    }
  }

  async nullSpace(M: Matrix, opts?: { signal?: AbortSignal }): Promise<ExactNumerical<Basis>> {
    const spaceId = spaceIdOfMatrix(M);
    const pseudoSpace = { kind: 'Fn' as const, id: spaceId, field: M.field, n: M.cols };

    const numMat = numericalNullSpace(M, M.domainBasis, M.codomainBasis);
    const numVecs = Array.from({ length: numMat.cols }, (_, c) => {
      const comps = Array.from(
        { length: numMat.rows },
        (__, r) => numMat.entries[r]?.[c] ?? float(0),
      );
      const vr = mkConcreteVector(M.field, spaceId, comps);
      if (!vr.ok) invariantViolation(`nullSpace numerical vec: ${vr.error.message}`);
      return vr.value;
    });
    const safeVecs =
      numVecs.length > 0
        ? numVecs
        : [
            (() => {
              const vr = mkConcreteVector(M.field, spaceId, Array(M.cols).fill(float(0)));
              if (!vr.ok) invariantViolation('nullSpace: zero vec');
              return vr.value;
            })(),
          ];

    const numBasis = mkBasis(pseudoSpace, safeVecs, 'null');
    if (!numBasis.ok) invariantViolation(`nullSpace: ${numBasis.error.message}`);
    const numerical = numBasis.value;

    if (matrixProvenance(M) === 'numerical_only') return { exact: null, numerical };

    try {
      const result = await this.symbolic.nullSpace(serializeMatrix(M).entries, opts?.signal);
      if (result.kind === 'error' || result.vectors.length === 0) return { exact: null, numerical };
      const exactVecs = result.vectors.map((rowData) => {
        const vr = mkConcreteVector(M.field, spaceId, rowData.map(deserializeScalar));
        if (!vr.ok) invariantViolation(`nullSpace exact vec: ${vr.error.message}`);
        return vr.value;
      });
      const exactBasis = mkBasis(pseudoSpace, exactVecs, 'null');
      if (!exactBasis.ok) return { exact: null, numerical };
      return { exact: exactBasis.value, numerical };
    } catch {
      return { exact: null, numerical };
    }
  }

  async rank(M: Matrix, opts?: { signal?: AbortSignal }): Promise<ExactNumerical<number>> {
    const numerical = numericalRank(M);
    if (matrixProvenance(M) === 'numerical_only') return { exact: null, numerical };
    try {
      const result = await this.symbolic.rank(serializeMatrix(M).entries, opts?.signal);
      if (result.kind === 'error') return { exact: null, numerical };
      return { exact: result.rank, numerical };
    } catch {
      return { exact: null, numerical };
    }
  }

  async rref(M: Matrix, opts?: { signal?: AbortSignal }): Promise<ExactNumerical<Matrix>> {
    const numerical = numericalRref(M, M.domainBasis, M.codomainBasis);
    if (matrixProvenance(M) === 'numerical_only') return { exact: null, numerical };
    try {
      const result = await this.symbolic.rref(serializeMatrix(M).entries, opts?.signal);
      if (result.kind === 'error') return { exact: null, numerical };
      const entries = result.matrix.map((row) => row.map(deserializeScalar));
      const exactResult = mkMatrix(M.field, entries, M.domainBasis, M.codomainBasis);
      if (!exactResult.ok) return { exact: null, numerical };
      return { exact: exactResult.value, numerical };
    } catch {
      return { exact: null, numerical };
    }
  }

  async inverse(M: Matrix, opts?: { signal?: AbortSignal }): Promise<InverseResult> {
    assertSquare(M);
    const numInv = numericalInverse(M, M.domainBasis, M.codomainBasis);
    if (numInv === null) return { kind: 'singular' };
    if (matrixProvenance(M) === 'numerical_only') {
      return { kind: 'success', exact: null, numerical: numInv };
    }
    try {
      const result = await this.symbolic.inverse(serializeMatrix(M).entries, opts?.signal);
      if (result.kind === 'singular') return { kind: 'singular' };
      if (result.kind === 'error') return { kind: 'success', exact: null, numerical: numInv };
      const entries = result.matrix.map((row) => row.map(deserializeScalar));
      const exactResult = mkMatrix(M.field, entries, M.domainBasis, M.codomainBasis);
      if (!exactResult.ok) return { kind: 'success', exact: null, numerical: numInv };
      return { kind: 'success', exact: exactResult.value, numerical: numInv };
    } catch {
      return { kind: 'success', exact: null, numerical: numInv };
    }
  }

  async determinant(M: Matrix, opts?: { signal?: AbortSignal }): Promise<ExactNumerical<Scalar>> {
    assertSquare(M);
    const numerical = float(numericalDeterminant(M));
    if (matrixProvenance(M) === 'numerical_only') return { exact: null, numerical };
    try {
      const result = await this.symbolic.determinant(serializeMatrix(M).entries, opts?.signal);
      if (result.kind === 'error') return { exact: null, numerical };
      return { exact: deserializeScalar(result.det), numerical };
    } catch {
      return { exact: null, numerical };
    }
  }

  async minimalPoly(M: Matrix, opts?: { signal?: AbortSignal }): Promise<Polynomial> {
    assertSquare(M);
    const result = await this.symbolic.minimalPoly(serializeMatrix(M).entries, opts?.signal);
    if (result.kind === 'error') throw new Error(`minimalPoly: ${result.message}`);
    const polyResult = mkPolynomial(M.field, result.coefficients.map(deserializeScalar));
    if (!polyResult.ok) throw new Error(`minimalPoly: invalid polynomial`);
    return polyResult.value;
  }

  async characteristicPoly(M: Matrix, opts?: { signal?: AbortSignal }): Promise<Polynomial> {
    assertSquare(M);
    const result = await this.symbolic.characteristicPoly(serializeMatrix(M).entries, opts?.signal);
    if (result.kind === 'error') throw new Error(`characteristicPoly: ${result.message}`);
    const polyResult = mkPolynomial(M.field, result.coefficients.map(deserializeScalar));
    if (!polyResult.ok) throw new Error(`characteristicPoly: invalid polynomial`);
    return polyResult.value;
  }

  async jordanForm(M: Matrix, opts?: { signal?: AbortSignal }): Promise<JordanResult> {
    assertSquare(M);
    const result = await this.symbolic.jordanForm(serializeMatrix(M).entries, opts?.signal);
    if (result.kind === 'error') throw new Error(`jordanForm: ${result.message}`);
    const jMat = mkMatrix(
      M.field,
      result.J.map((row) => row.map(deserializeScalar)),
      M.domainBasis,
      M.domainBasis,
    );
    const pMat = mkMatrix(
      M.field,
      result.P.map((row) => row.map(deserializeScalar)),
      M.domainBasis,
      M.domainBasis,
    );
    if (!jMat.ok || !pMat.ok) throw new Error('jordanForm: invalid matrix from SymPy');
    return {
      J: jMat.value,
      P: pMat.value,
      blocks: result.blocks.map((b) => ({
        eigenvalue: deserializeScalar(b.eigenvalue),
        size: b.size,
      })),
    };
  }

  svd(M: Matrix, _opts?: { signal?: AbortSignal }): Promise<SVDResult> {
    return Promise.resolve(numericalSvd(M, M.domainBasis, M.codomainBasis));
  }

  qr(M: Matrix, _opts?: { signal?: AbortSignal }): Promise<QRResult> {
    return Promise.resolve(numericalQr(M, M.domainBasis, M.codomainBasis));
  }

  async gramSchmidt(
    vectors: Vector[],
    _ip: InnerProduct,
    opts?: { signal?: AbortSignal },
  ): Promise<ExactNumerical<Vector[]>> {
    if (vectors.length === 0) return { exact: [], numerical: [] };
    const first = vectors[0];
    if (!first || first.kind !== 'concrete') return { exact: null, numerical: [] };
    const spaceId = first.space;
    const field = first.field;

    const numResult = numericalGramSchmidt(vectors.map(vectorToFloats));
    const numerical = numResult.map((comps) => {
      const vr = mkConcreteVector(field, spaceId, comps.map(float));
      if (!vr.ok) invariantViolation(`gramSchmidt numerical: ${vr.error.message}`);
      return vr.value;
    });

    const allExact = vectors.every(
      (v) =>
        v.kind === 'concrete' &&
        v.components.every((s) => s.kind === 'rational' || s.kind === 'complex'),
    );
    if (!allExact) return { exact: null, numerical };

    try {
      const serializedVecs = vectors.map((v) => {
        if (v.kind !== 'concrete') invariantViolation('gramSchmidt: non-concrete vector');
        return v.components.map(serializeScalar);
      });
      const result = await this.symbolic.gramSchmidt(serializedVecs, opts?.signal);
      if (result.kind === 'error') return { exact: null, numerical };
      const exact = result.vectors.map((rowData) => {
        const vr = mkConcreteVector(field, spaceId, rowData.map(deserializeScalar));
        if (!vr.ok) invariantViolation(`gramSchmidt exact: ${vr.error.message}`);
        return vr.value;
      });
      return { exact, numerical };
    } catch {
      return { exact: null, numerical };
    }
  }

  linearCombinationSolver(
    target: Vector,
    generators: Vector[],
    _opts?: { signal?: AbortSignal },
  ): Promise<ExactNumerical<Scalar[] | null>> {
    if (target.kind !== 'concrete' || generators.length === 0) {
      return Promise.resolve({ exact: null, numerical: null });
    }
    const b = vectorToFloats(target);
    const genFloats = generators.map(vectorToFloats);
    const rows = b.length;
    const cols = genFloats.length;
    const placeholder = target.space as unknown as BasisId;
    const entries = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (__, c) => float(genFloats[c]?.[r] ?? 0)),
    );
    const Aresult = mkMatrix(target.field, entries, placeholder, placeholder);
    if (!Aresult.ok) return Promise.resolve({ exact: null, numerical: null });
    const numSol = numericalLinearSolve(Aresult.value, b);
    return Promise.resolve({ exact: null, numerical: numSol ? numSol.map(float) : null });
  }

  matrixOf(
    map: LinearMap,
    domainBasis: Basis,
    codomainBasis: Basis,
    field: Field,
    _opts?: { signal?: AbortSignal },
  ): Promise<ExactNumerical<Matrix>> {
    if (map.representation.kind === 'matrix') {
      const m = map.representation.matrix;
      return Promise.resolve({ exact: m, numerical: m });
    }
    if (map.representation.kind === 'basis_action') {
      const pairs = map.representation.pairs;
      const rows = codomainBasis.vectors.length;
      const cols = domainBasis.vectors.length;
      const entries = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (__, c) => {
          const img = pairs[c]?.[1];
          if (img?.kind === 'concrete') return img.components[r] ?? float(0);
          return float(0);
        }),
      );
      const result = mkMatrix(field, entries, domainBasis.id, codomainBasis.id);
      if (!result.ok) return Promise.resolve({ exact: null, numerical: null as unknown as Matrix });
      return Promise.resolve({ exact: result.value, numerical: result.value });
    }
    return Promise.resolve({ exact: null, numerical: null as unknown as Matrix });
  }

  applyMap(
    map: LinearMap,
    v: Vector,
    _opts?: { signal?: AbortSignal },
  ): Promise<ExactNumerical<Vector>> {
    if (map.representation.kind === 'formula') {
      const result = map.representation.fn(v);
      return Promise.resolve({ exact: result, numerical: result });
    }
    if (map.representation.kind === 'matrix' && v.kind === 'concrete') {
      const m = map.representation.matrix;
      const spaceId = m.codomainBasis as unknown as SpaceId;
      if (v.components.length !== m.cols) {
        return Promise.resolve({ exact: null, numerical: v });
      }
      const resultComponents = Array.from({ length: m.rows }, (_, r) => {
        let sum: Scalar = rational(0);
        for (let c = 0; c < m.cols; c++) {
          const e = m.entries[r]?.[c];
          const vc = v.components[c];
          if (e !== undefined && vc !== undefined) {
            sum = addScalar(sum, mulScalar(e, vc));
          }
        }
        return sum;
      });
      const vr = mkConcreteVector(v.field, spaceId, resultComponents);
      if (!vr.ok) return Promise.resolve({ exact: null, numerical: v });
      return Promise.resolve({ exact: vr.value, numerical: vr.value });
    }
    return Promise.resolve({ exact: null, numerical: v });
  }
}

export function createEngine(symbolic: SymbolicAdapter): ComputationEngine {
  return new Engine(symbolic);
}
