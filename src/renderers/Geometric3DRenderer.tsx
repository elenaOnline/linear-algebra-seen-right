import { useRef, useEffect } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Geometric3DProps } from '../registry/index.ts';

// Color palette — mirrors Geometric2DRenderer.
const COLOR_ARROW = '#3b82f6'; // blue-500
const COLOR_BASIS_X = '#ef4444'; // red-500
const COLOR_BASIS_Y = '#22c55e'; // green-500
const COLOR_BASIS_Z = '#3b82f6'; // blue-500
const COLOR_GRID_ORIGINAL = '#e2e8f0'; // slate-200
const COLOR_GRID_DEFORMED = '#bfdbfe'; // blue-200

type Mat3 = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
];

function transform3(m: Mat3, x: number, y: number, z: number): [number, number, number] {
  return [
    m[0][0] * x + m[0][1] * y + m[0][2] * z,
    m[1][0] * x + m[1][1] * y + m[1][2] * z,
    m[2][0] * x + m[2][1] * y + m[2][2] * z,
  ];
}

function makeArrow(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  color: string,
): THREE.ArrowHelper | null {
  const origin = new THREE.Vector3(from[0], from[1], from[2]);
  const dir = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const length = dir.length();
  if (length < 1e-10) return null;
  dir.normalize();
  const col = new THREE.Color(color);
  const headLen = Math.min(0.3, length * 0.2);
  return new THREE.ArrowHelper(dir, origin, length, col, headLen, headLen * 0.6);
}

function makeDeformedGrid(matrix: Mat3, range: number): THREE.Group {
  const group = new THREE.Group();
  const lo = -Math.floor(range * 0.6);
  const hi = Math.ceil(range * 0.6);

  const origPts: number[] = [];
  const defPts: number[] = [];

  for (let i = lo; i <= hi; i++) {
    origPts.push(lo, i, 0, hi, i, 0);
    const [tx1, ty1, tz1] = transform3(matrix, lo, i, 0);
    const [tx2, ty2, tz2] = transform3(matrix, hi, i, 0);
    defPts.push(tx1, ty1, tz1, tx2, ty2, tz2);

    origPts.push(i, lo, 0, i, hi, 0);
    const [tx3, ty3, tz3] = transform3(matrix, i, lo, 0);
    const [tx4, ty4, tz4] = transform3(matrix, i, hi, 0);
    defPts.push(tx3, ty3, tz3, tx4, ty4, tz4);
  }

  const origGeo = new THREE.BufferGeometry();
  origGeo.setAttribute('position', new THREE.Float32BufferAttribute(origPts, 3));
  const defGeo = new THREE.BufferGeometry();
  defGeo.setAttribute('position', new THREE.Float32BufferAttribute(defPts, 3));

  group.add(
    new THREE.LineSegments(
      origGeo,
      new THREE.LineBasicMaterial({ color: new THREE.Color(COLOR_GRID_ORIGINAL) }),
    ),
  );
  group.add(
    new THREE.LineSegments(
      defGeo,
      new THREE.LineBasicMaterial({ color: new THREE.Color(COLOR_GRID_DEFORMED) }),
    ),
  );

  // Basis image arrows
  const origin: [number, number, number] = [0, 0, 0];
  for (const [to, col] of [
    [transform3(matrix, 1, 0, 0), COLOR_BASIS_X],
    [transform3(matrix, 0, 1, 0), COLOR_BASIS_Y],
    [transform3(matrix, 0, 0, 1), COLOR_BASIS_Z],
  ] as const) {
    const arrow = makeArrow(origin, to, col);
    if (arrow) group.add(arrow);
  }

  return group;
}

function populateScene(scene: THREE.Scene, props: Geometric3DProps): void {
  const range = props.axisRange?.[1] ?? 5;
  scene.add(new THREE.AxesHelper(range));

  if (props.kind === 'grid_deformation' && props.gridDeformation !== undefined) {
    scene.add(makeDeformedGrid(props.gridDeformation.matrix, range));
  }

  for (const a of props.arrows ?? []) {
    const arrow = makeArrow(a.from, a.to, a.color ?? COLOR_ARROW);
    if (arrow) scene.add(arrow);
  }
}

type Props = {
  readonly props: Geometric3DProps;
};

export function Geometric3DRenderer({ props }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Guard: skip if WebGL is unavailable (test environments, old browsers).
    const testCtx = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!testCtx) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc');
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(4, 3, 5);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, canvas);
    controls.enablePan = false;

    populateScene(scene, props);

    const resize = (): void => {
      const w = container.clientWidth;
      const h = container.clientHeight || w;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let frameId = 0;
    const animate = (): void => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, [props]);

  return (
    <div ref={containerRef} style={{ width: '100%', aspectRatio: '1' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
