export type {
  RendererKind,
  LoadingProps,
  SymbolicProps,
  MatrixProps,
  DiagramProps,
  Geometric2DProps,
  Geometric3DProps,
  ChartProps,
  RendererProps,
  MathObject,
  MathObjectKind,
  Visualizer,
} from './types.ts';

export { VisualizerRegistry } from './registry.ts';
export { registerDefaults } from './defaults.ts';
export { scalarToLatex, scalarToNumber, spaceToLatex, spaceToDiagramLabel } from './helpers.ts';

import { VisualizerRegistry } from './registry.ts';
import { registerDefaults } from './defaults.ts';

// Application singleton — pre-populated with default visualizers.
export const visualizerRegistry = new VisualizerRegistry();
registerDefaults(visualizerRegistry);
