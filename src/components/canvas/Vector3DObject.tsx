import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line, Html } from '@react-three/drei';
import type { Vector3Tuple } from '../../types/curriculum';
import { formatVector } from '../../utils/mathUtils';

export interface Vector3DObjectProps {
  origin?: Vector3Tuple;
  vector: Vector3Tuple;
  color: string;
  label?: string;
  sublabel?: string;
  showCoords?: boolean;
  isR2?: boolean;
  dashed?: boolean;
  opacity?: number;
  lineWidth?: number;
  headScale?: number;
}

export const Vector3DObject: React.FC<Vector3DObjectProps> = ({
  origin = [0, 0, 0],
  vector,
  color,
  label,
  sublabel,
  showCoords = false,
  isR2 = false,
  dashed = false,
  opacity = 1,
  lineWidth = 3,
  headScale = 1,
}) => {
  const { start, end, shaftEnd, quaternion, length, isZero, labelPos } = useMemo(() => {
    const s = new THREE.Vector3(...origin);
    const dir = new THREE.Vector3(...vector);
    const len = dir.length();

    if (len < 1e-5) {
      return {
        start: s,
        end: s.clone(),
        shaftEnd: s.clone(),
        quaternion: new THREE.Quaternion(),
        length: 0,
        isZero: true,
        labelPos: s.clone().add(new THREE.Vector3(0, 0.35, 0)),
      };
    }

    const normalizedDir = dir.clone().normalize();
    const headLength = Math.min(0.42 * headScale, len * 0.38);
    const e = s.clone().add(dir);
    const se = e.clone().sub(normalizedDir.clone().multiplyScalar(headLength * 0.85));

    // ConeGeometry points along +Y by default
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultUp, normalizedDir);

    const lPos = e.clone().add(normalizedDir.clone().multiplyScalar(0.32));

    return {
      start: s,
      end: e,
      shaftEnd: se,
      quaternion: quat,
      length: len,
      isZero: false,
      labelPos: lPos,
    };
  }, [origin, vector, headScale]);

  if (isZero) {
    return (
      <group position={start.toArray()}>
        <mesh>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} />
        </mesh>
        {label && (
          <Html position={[0.25, 0.25, 0]} center distanceFactor={15} zIndexRange={[10, 0]}>
            <div
              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold whitespace-nowrap border shadow-sm pointer-events-none select-none"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.88)',
                borderColor: color,
                color: color,
              }}
            >
              {label} = 0⃗
            </div>
          </Html>
        )}
      </group>
    );
  }

  const headLength = Math.min(0.42 * headScale, length * 0.38);
  const headRadius = Math.min(0.14 * headScale, length * 0.14);
  const coneCenter = end
    .clone()
    .sub(new THREE.Vector3(...vector).normalize().multiplyScalar(headLength * 0.5));

  return (
    <group>
      <Line
        points={[start.toArray(), shaftEnd.toArray()]}
        color={color}
        lineWidth={lineWidth}
        dashed={dashed}
        dashScale={dashed ? 4 : 1}
        dashSize={0.25}
        gapSize={0.15}
        transparent={opacity < 1}
        opacity={opacity}
      />

      <mesh position={coneCenter.toArray()} quaternion={quaternion}>
        <coneGeometry args={[headRadius, headLength, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          transparent={opacity < 1}
          opacity={opacity}
          roughness={0.3}
        />
      </mesh>

      {label && (
        <Html position={labelPos.toArray()} center zIndexRange={[10, 0]}>
          <div
            className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold whitespace-nowrap border shadow-lg backdrop-blur-sm pointer-events-none select-none flex items-center gap-1.5"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.90)',
              borderColor: `${color}88`,
              color: '#f8fafc',
            }}
          >
            <span style={{ color }} className="font-bold">
              {label}
            </span>
            {showCoords && (
              <span className="text-slate-300 text-[11px] font-normal">
                {formatVector(vector, isR2, 1)}
              </span>
            )}
            {sublabel && (
              <span className="text-slate-400 text-[10px] font-normal">
                {sublabel}
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
