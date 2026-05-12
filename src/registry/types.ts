import type {
  VectorSpace,
  Subspace,
  LinearMap,
  Vector,
  Basis,
  Matrix,
  InnerProduct,
} from '../types/index.ts';
import type { SessionView } from '../types/session-view.ts';

// --- RendererKind ---

export type RendererKind =
  | 'geometric_3d'
  | 'geometric_2d'
  | 'diagram'
  | 'matrix'
  | 'symbolic'
  | 'chart';

// --- RendererProps ---

export type LoadingProps = {
  readonly renderer: RendererKind;
  readonly objectId: string;
  readonly isPending: true;
};

export type SymbolicProps = {
  readonly renderer: 'symbolic';
  readonly objectId: string;
  readonly latex: string;
  readonly inline?: boolean | undefined;
  readonly provenance?: 'exact' | 'numerical' | undefined;
  readonly interactiveSlots?:
    | readonly { readonly id: string; readonly label: string }[]
    | undefined;
};

export type MatrixProps = {
  readonly renderer: 'matrix';
  readonly objectId: string;
  readonly rows: number;
  readonly cols: number;
  readonly entries: readonly (readonly string[])[];
  readonly heatmap?: readonly (readonly number[])[] | undefined;
  readonly rowLabels?: readonly string[] | undefined;
  readonly colLabels?: readonly string[] | undefined;
  readonly provenance?: 'exact' | 'numerical' | undefined;
};

export type DiagramProps = {
  readonly renderer: 'diagram';
  readonly objectId: string;
  readonly nodes: readonly {
    readonly id: string;
    readonly label: string;
    readonly highlight?: 'kernel' | 'range' | 'eigenspace' | 'none' | undefined;
  }[];
  readonly edges: readonly {
    readonly from: string;
    readonly to: string;
    readonly label: string;
    readonly style?: 'solid' | 'dashed' | 'collapse' | undefined;
  }[];
};

export type Geometric2DProps = {
  readonly renderer: 'geometric_2d';
  readonly objectId: string;
  readonly kind: 'vector_arrow' | 'grid_deformation' | 'eigenlines' | 'axes_only' | 'argand';
  readonly arrows?:
    | readonly {
        readonly from: readonly [number, number];
        readonly to: readonly [number, number];
        readonly color?: string | undefined;
        readonly label?: string | undefined;
      }[]
    | undefined;
  readonly lines?:
    | readonly {
        readonly point: readonly [number, number];
        readonly direction: readonly [number, number];
        readonly style?: 'solid' | 'dashed' | undefined;
        readonly label?: string | undefined;
      }[]
    | undefined;
  readonly gridDeformation?:
    | {
        readonly matrix: readonly [readonly [number, number], readonly [number, number]];
      }
    | undefined;
  readonly axisRange?: readonly [number, number] | undefined;
  // Interaction callbacks — wired by ViewContainer, not present in toProps output
  readonly onArrowDrag?: ((arrowIndex: number, x: number, y: number) => void) | undefined;
};

export type Geometric3DProps = {
  readonly renderer: 'geometric_3d';
  readonly objectId: string;
  readonly kind: 'vector_arrow' | 'grid_deformation' | 'axes_only';
  readonly arrows?:
    | readonly {
        readonly from: readonly [number, number, number];
        readonly to: readonly [number, number, number];
        readonly color?: string | undefined;
        readonly label?: string | undefined;
      }[]
    | undefined;
  readonly planes?:
    | readonly {
        readonly normal: readonly [number, number, number];
        readonly offset?: readonly [number, number, number] | undefined;
        readonly label?: string | undefined;
      }[]
    | undefined;
  readonly gridDeformation?:
    | {
        readonly matrix: readonly [
          readonly [number, number, number],
          readonly [number, number, number],
          readonly [number, number, number],
        ];
      }
    | undefined;
  readonly axisRange?: readonly [number, number] | undefined;
};

export type ChartProps = {
  readonly renderer: 'chart';
  readonly objectId: string;
  readonly kind: 'spectrum' | 'singular_values' | 'dimension_bars' | 'coefficients';
  readonly data: readonly {
    readonly label: string;
    readonly value: number;
    readonly secondary?: number | undefined;
  }[];
  readonly provenance?: 'exact' | 'numerical' | undefined;
};

export type RendererProps =
  | SymbolicProps
  | MatrixProps
  | DiagramProps
  | Geometric2DProps
  | Geometric3DProps
  | ChartProps
  | LoadingProps;

// --- MathObject ---

export type MathObject =
  | VectorSpace
  | Subspace
  | LinearMap
  | Vector
  | Basis
  | Matrix
  | InnerProduct;

export type MathObjectKind =
  | 'VectorSpace'
  | 'Subspace'
  | 'LinearMap'
  | 'Vector'
  | 'Basis'
  | 'Matrix'
  | 'InnerProduct';

// --- Visualizer ---

export type Visualizer<T extends MathObject> = {
  readonly id: string;
  readonly label: string;
  readonly renderer: RendererKind;
  readonly applicable: (obj: T, session: SessionView) => boolean;
  readonly toProps: (obj: T, session: SessionView) => RendererProps;
};
