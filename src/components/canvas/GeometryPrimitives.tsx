import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line, Html } from '@react-three/drei';
import type { Vector3Tuple } from '../../types/curriculum';
import { vectorAdd } from '../../utils/mathUtils';

interface Parallelogram3DProps {
  origin?: Vector3Tuple;
  u: Vector3Tuple;
  v: Vector3Tuple;
  color?: string;
  opacity?: number;
  showEdges?: boolean;
  badgeText?: string;
}

/**
 * Renderiza un paralelogramo sombreado generado por dos vectores u y v en 3D
 */
export const Parallelogram3D: React.FC<Parallelogram3DProps> = ({
  origin = [0, 0, 0],
  u,
  v,
  color = '#a855f7',
  opacity = 0.28,
  showEdges = true,
  badgeText,
}) => {
  const { geometry, pU, pV, pUV, center } = useMemo(() => {
    const o: Vector3Tuple = origin;
    const pu = vectorAdd(o, u);
    const pv = vectorAdd(o, v);
    const puv = vectorAdd(pu, v);

    const geom = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      ...o,
      ...pu,
      ...puv,
      ...o,
      ...puv,
      ...pv,
    ]);
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.computeVertexNormals();

    const c: Vector3Tuple = [
      (o[0] + puv[0]) / 2,
      (o[1] + puv[1]) / 2,
      (o[2] + puv[2]) / 2,
    ];

    return { geometry: geom, pU: pu, pV: pv, pUV: puv, center: c };
  }, [origin, u, v]);

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {showEdges && (
        <>
          <Line
            points={[pU, pUV]}
            color={color}
            lineWidth={1.6}
            dashed
            dashSize={0.2}
            gapSize={0.15}
            transparent
            opacity={0.85}
          />
          <Line
            points={[pV, pUV]}
            color={color}
            lineWidth={1.6}
            dashed
            dashSize={0.2}
            gapSize={0.15}
            transparent
            opacity={0.85}
          />
        </>
      )}
      {badgeText && (
        <Html position={center} center zIndexRange={[8, 0]}>
          <div className="px-2 py-0.5 rounded bg-slate-900/90 border border-purple-400/50 text-purple-200 font-mono text-[11px] whitespace-nowrap shadow-md pointer-events-none select-none">
            {badgeText}
          </div>
        </Html>
      )}
    </group>
  );
};

interface AngleArc3DProps {
  u: Vector3Tuple;
  v: Vector3Tuple;
  degrees: number;
  color?: string;
}

/**
 * Renderiza el arco de ángulo θ entre los vectores u y v
 */
export const AngleArc3D: React.FC<AngleArc3DProps> = ({
  u,
  v,
  degrees,
  color = '#fbbf24',
}) => {
  const { points, labelPos } = useMemo(() => {
    const vecU = new THREE.Vector3(...u);
    const vecV = new THREE.Vector3(...v);
    const lenU = vecU.length();
    const lenV = vecV.length();

    if (lenU < 1e-5 || lenV < 1e-5) {
      return { points: [], labelPos: [0, 0, 0] as Vector3Tuple };
    }

    const radius = Math.min(1.4, Math.min(lenU, lenV) * 0.45);
    const dirU = vecU.clone().normalize();
    const dirV = vecV.clone().normalize();

    const segments = 32;
    const pts: Vector3Tuple[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const interp = new THREE.Vector3()
        .lerpVectors(dirU, dirV, t)
        .normalize()
        .multiplyScalar(radius);
      pts.push([interp.x, interp.y, interp.z]);
    }

    const mid = new THREE.Vector3()
      .lerpVectors(dirU, dirV, 0.5)
      .normalize()
      .multiplyScalar(radius * 1.28);

    return {
      points: pts,
      labelPos: [mid.x, mid.y, mid.z] as Vector3Tuple,
    };
  }, [u, v]);

  if (points.length < 2) return null;

  return (
    <group>
      <Line points={points} color={color} lineWidth={2.5} />
      <Html position={labelPos} center zIndexRange={[9, 0]}>
        <div className="px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-400/60 text-amber-300 font-mono text-[11px] font-semibold whitespace-nowrap shadow pointer-events-none select-none">
          θ = {degrees.toFixed(1)}°
        </div>
      </Html>
    </group>
  );
};

interface Parallelepiped3DProps {
  u: Vector3Tuple;
  v: Vector3Tuple;
  w: Vector3Tuple;
  color?: string;
  opacity?: number;
  badgeText?: string;
}

/**
 * Renderiza el paralelepípedo generado por u, v y w para el Producto Mixto
 */
export const Parallelepiped3D: React.FC<Parallelepiped3DProps> = ({
  u,
  v,
  w,
  color = '#ec4899',
  opacity = 0.2,
  badgeText,
}) => {
  const { geometry, edges, center } = useMemo(() => {
    const p000: Vector3Tuple = [0, 0, 0];
    const p100 = u;
    const p010 = v;
    const p001 = w;
    const p110 = vectorAdd(u, v);
    const p101 = vectorAdd(u, w);
    const p011 = vectorAdd(v, w);
    const p111 = vectorAdd(p110, w);

    const quads: [Vector3Tuple, Vector3Tuple, Vector3Tuple, Vector3Tuple][] = [
      [p000, p100, p110, p010], // base uv
      [p001, p101, p111, p011], // tapa uv + w
      [p000, p100, p101, p001], // cara uw
      [p010, p110, p111, p011], // cara uw + v
      [p000, p010, p011, p001], // cara vw
      [p100, p110, p111, p101], // cara vw + u
    ];

    const positions: number[] = [];
    for (const [a, b, c, d] of quads) {
      positions.push(...a, ...b, ...c, ...a, ...c, ...d);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(positions), 3)
    );
    geom.computeVertexNormals();

    const edgePairs: [Vector3Tuple, Vector3Tuple][] = [
      [p000, p100],
      [p000, p010],
      [p000, p001],
      [p100, p110],
      [p100, p101],
      [p010, p110],
      [p010, p011],
      [p001, p101],
      [p001, p011],
      [p110, p111],
      [p101, p111],
      [p011, p111],
    ];

    const c: Vector3Tuple = [p111[0] / 2, p111[1] / 2, p111[2] / 2];

    return { geometry: geom, edges: edgePairs, center: c };
  }, [u, v, w]);

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {edges.map((pair, idx) => (
        <Line
          key={idx}
          points={pair}
          color={color}
          lineWidth={1.5}
          dashed={idx >= 3}
          dashSize={0.22}
          gapSize={0.14}
          transparent
          opacity={0.75}
        />
      ))}
      {badgeText && (
        <Html position={center} center zIndexRange={[8, 0]}>
          <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-pink-500/60 text-pink-200 font-mono text-xs font-semibold whitespace-nowrap shadow-lg pointer-events-none select-none">
            {badgeText}
          </div>
        </Html>
      )}
    </group>
  );
};
