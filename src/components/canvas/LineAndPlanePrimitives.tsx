import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line, Html } from '@react-three/drei';
import type { Vector3Tuple } from '../../types/curriculum';
import {
  formatNum,
  formatVector,
  vectorAdd,
  vectorDot,
  vectorNorm,
  vectorScale,
} from '../../utils/mathUtils';
import { Vector3DObject } from './Vector3DObject';

interface Point3DObjectProps {
  position: Vector3Tuple;
  color?: string;
  label?: string;
  showCoords?: boolean;
  isR2?: boolean;
  radius?: number;
  showDropLines?: boolean;
}

export const Point3DObject: React.FC<Point3DObjectProps> = ({
  position,
  color = '#facc15',
  label,
  showCoords = true,
  isR2 = false,
  radius = 0.14,
  showDropLines = false,
}) => {
  const xyProj: Vector3Tuple = [position[0], position[1], 0];

  return (
    <group>
      <mesh position={position}>
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.45}
          roughness={0.2}
        />
      </mesh>

      {showDropLines && !isR2 && Math.abs(position[2]) > 1e-4 && (
        <>
          <Line
            points={[position, xyProj]}
            color={color}
            lineWidth={1.2}
            dashed
            dashSize={0.2}
            gapSize={0.15}
            transparent
            opacity={0.5}
          />
          <mesh position={xyProj}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshBasicMaterial color={color} transparent opacity={0.55} />
          </mesh>
        </>
      )}

      {label && (
        <Html
          position={[position[0], position[1], position[2] + 0.36]}
          center
          zIndexRange={[12, 0]}
        >
          <div
            className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold whitespace-nowrap border shadow-lg backdrop-blur-sm pointer-events-none select-none flex items-center gap-1.5"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              borderColor: `${color}99`,
              color: '#f8fafc',
            }}
          >
            <span style={{ color }} className="font-bold">
              {label}
            </span>
            {showCoords && (
              <span className="text-slate-300 text-[11px] font-normal">
                {formatVector(position, isR2, 2)}
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

interface InfiniteLine3DProps {
  point: Vector3Tuple;
  direction: Vector3Tuple;
  color?: string;
  label?: string;
  span?: number;
  lineWidth?: number;
  showPoint?: boolean;
  pointLabel?: string;
  showDirectionVector?: boolean;
  directionLabel?: string;
  isR2?: boolean;
}

export const InfiniteLine3D: React.FC<InfiniteLine3DProps> = ({
  point,
  direction,
  color = '#38bdf8',
  label,
  span = 13,
  lineWidth = 2.8,
  showPoint = true,
  pointLabel = 'P₀',
  showDirectionVector = true,
  directionLabel = 'd⃗',
  isR2 = false,
}) => {
  const { start, end, labelPos, isDegenerate } = useMemo(() => {
    const len = vectorNorm(direction);
    if (len < 1e-6) {
      return {
        start: point,
        end: point,
        labelPos: point,
        isDegenerate: true,
      };
    }
    const unitDir = vectorScale(direction, 1 / len);
    const s = vectorAdd(point, vectorScale(unitDir, -span));
    const e = vectorAdd(point, vectorScale(unitDir, span));
    const lp = vectorAdd(point, vectorScale(unitDir, Math.min(4.5, span * 0.45)));
    return { start: s, end: e, labelPos: lp, isDegenerate: false };
  }, [point, direction, span]);

  if (isDegenerate) {
    return (
      <Point3DObject
        position={point}
        color={color}
        label={`${label ?? 'L'} (d⃗ = 0⃗)`}
        isR2={isR2}
      />
    );
  }

  return (
    <group>
      <Line points={[start, end]} color={color} lineWidth={lineWidth} />

      {showPoint && (
        <Point3DObject
          position={point}
          color="#facc15"
          label={pointLabel}
          isR2={isR2}
          showDropLines={!isR2}
        />
      )}

      {showDirectionVector && (
        <Vector3DObject
          origin={point}
          vector={direction}
          color="#fb923c"
          label={directionLabel}
          showCoords
          isR2={isR2}
          lineWidth={3.5}
        />
      )}

      {label && (
        <Html position={labelPos} center zIndexRange={[8, 0]}>
          <div
            className="px-2 py-0.5 rounded bg-slate-900/90 border text-xs font-mono font-bold whitespace-nowrap shadow pointer-events-none select-none"
            style={{ borderColor: color, color }}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
};

interface Plane3DObjectProps {
  normal: Vector3Tuple;
  dTerm: number;
  color?: string;
  opacity?: number;
  size?: number;
  label?: string;
  showNormalVector?: boolean;
  normalLabel?: string;
  anchorPoint?: Vector3Tuple;
}

export const Plane3DObject: React.FC<Plane3DObjectProps> = ({
  normal,
  dTerm,
  color = '#6366f1',
  opacity = 0.28,
  size = 12,
  label,
  showNormalVector = true,
  normalLabel = 'n⃗',
  anchorPoint,
}) => {
  const { center, quaternion, borderPoints, gridLines, isValid } = useMemo(() => {
    const nNormSq = vectorDot(normal, normal);
    if (nNormSq < 1e-8) {
      return {
        center: [0, 0, 0] as Vector3Tuple,
        quaternion: new THREE.Quaternion(),
        borderPoints: [] as Vector3Tuple[],
        gridLines: [] as [Vector3Tuple, Vector3Tuple][],
        isValid: false,
      };
    }

    // Punto del plano más cercano al origen: C = (-D / ||n||^2) * n
    const closestToOrigin = vectorScale(normal, -dTerm / nNormSq);

    const nVec = new THREE.Vector3(...normal).normalize();
    const defaultZ = new THREE.Vector3(0, 0, 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultZ, nVec);

    const half = size / 2;
    const localCorners = [
      new THREE.Vector3(-half, -half, 0),
      new THREE.Vector3(half, -half, 0),
      new THREE.Vector3(half, half, 0),
      new THREE.Vector3(-half, half, 0),
      new THREE.Vector3(-half, -half, 0),
    ];

    const cVec = new THREE.Vector3(...closestToOrigin);
    const worldBorder: Vector3Tuple[] = localCorners.map((lc) => {
      const w = lc.clone().applyQuaternion(quat).add(cVec);
      return [w.x, w.y, w.z];
    });

    // Líneas internas de grilla sobre el plano cada 2 unidades
    const lines: [Vector3Tuple, Vector3Tuple][] = [];
    const step = 2;
    for (let t = -half + step; t < half; t += step) {
      const a1 = new THREE.Vector3(t, -half, 0).applyQuaternion(quat).add(cVec);
      const a2 = new THREE.Vector3(t, half, 0).applyQuaternion(quat).add(cVec);
      lines.push([
        [a1.x, a1.y, a1.z],
        [a2.x, a2.y, a2.z],
      ]);

      const b1 = new THREE.Vector3(-half, t, 0).applyQuaternion(quat).add(cVec);
      const b2 = new THREE.Vector3(half, t, 0).applyQuaternion(quat).add(cVec);
      lines.push([
        [b1.x, b1.y, b1.z],
        [b2.x, b2.y, b2.z],
      ]);
    }

    return {
      center: closestToOrigin,
      quaternion: quat,
      borderPoints: worldBorder,
      gridLines: lines,
      isValid: true,
    };
  }, [normal, dTerm, size]);

  if (!isValid) return null;

  const normalOrigin = anchorPoint ?? center;

  return (
    <group>
      {/* Superficie translúcida del plano */}
      <mesh position={center} quaternion={quaternion}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
          roughness={0.4}
        />
      </mesh>

      {/* Borde del plano */}
      <Line
        points={borderPoints}
        color={color}
        lineWidth={2}
        transparent
        opacity={0.85}
      />

      {/* Grilla sutil coplanar */}
      {gridLines.map((pair, idx) => (
        <Line
          key={idx}
          points={pair}
          color={color}
          lineWidth={0.8}
          transparent
          opacity={0.25}
        />
      ))}

      {/* Vector Normal n⃗ */}
      {showNormalVector && (
        <Vector3DObject
          origin={normalOrigin}
          vector={normal}
          color="#f43f5e"
          label={normalLabel}
          showCoords
          lineWidth={3.5}
        />
      )}

      {/* Etiqueta flotante del plano en una esquina */}
      {label && borderPoints.length > 2 && (
        <Html position={borderPoints[2]} center zIndexRange={[7, 0]}>
          <div
            className="px-2 py-0.5 rounded bg-slate-900/90 border text-xs font-mono font-bold whitespace-nowrap shadow pointer-events-none select-none"
            style={{ borderColor: color, color }}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
};

interface DistanceSegment3DProps {
  from: Vector3Tuple;
  to: Vector3Tuple;
  distance: number;
  color?: string;
  labelPrefix?: string;
  isR2?: boolean;
}

export const DistanceSegment3D: React.FC<DistanceSegment3DProps> = ({
  from,
  to,
  distance,
  color = '#fbbf24',
  labelPrefix = 'd',
}) => {
  const mid: Vector3Tuple = [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2,
  ];

  if (distance < 1e-5) return null;

  return (
    <group>
      <Line
        points={[from, to]}
        color={color}
        lineWidth={3}
        dashed
        dashSize={0.22}
        gapSize={0.14}
      />
      <Html position={mid} center zIndexRange={[15, 0]}>
        <div className="px-2 py-0.5 rounded-md bg-amber-950/95 border border-amber-400/80 text-amber-200 font-mono text-xs font-bold whitespace-nowrap shadow-lg pointer-events-none select-none">
          {labelPrefix} = {formatNum(distance, 2)} u
        </div>
      </Html>
    </group>
  );
};
