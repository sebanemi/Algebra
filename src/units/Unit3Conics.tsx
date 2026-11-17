import React, { useState, useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { Sliders, Calculator, Info, Sparkles } from 'lucide-react';
import type { DimensionMode, Vector3Tuple } from '../types/curriculum';
import { formatNum, formatVector, vectorNorm, vectorSubtract } from '../utils/mathUtils';
import { Scene3D } from '../components/canvas/Scene3D';
import {
  Point3DObject,
  DistanceSegment3D,
  Plane3DObject,
} from '../components/canvas/LineAndPlanePrimitives';

type ConicMode = 'circle' | 'ellipse' | 'parabola' | 'hyperbola' | 'apollonius-3d';

const CONIC_TABS: { id: ConicMode; label: string; badge: string }[] = [
  { id: 'circle', label: '1. Circunferencia', badge: 'e = 0' },
  { id: 'ellipse', label: '2. Elipse', badge: '0 < e < 1' },
  { id: 'parabola', label: '3. Parábola', badge: 'e = 1' },
  { id: 'hyperbola', label: '4. Hipérbola', badge: 'e > 1' },
  { id: 'apollonius-3d', label: '5. Cono de Apolonio', badge: 'ℝ³' },
];

export const Unit3Conics: React.FC = () => {
  const [mode, setMode] = useState<ConicMode>('ellipse');

  // Centro / Vértice (h, k)
  const [centerH, setCenterH] = useState<number>(0);
  const [centerK, setCenterK] = useState<number>(0);

  // Parámetros de semiejes / radios
  const [radiusR, setRadiusR] = useState<number>(4);
  const [semiA, setSemiA] = useState<number>(5);
  const [semiB, setSemiB] = useState<number>(3);
  const [focalP, setFocalP] = useState<number>(1.5);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  // Punto móvil sobre la cónica para verificar definición de lugar geométrico
  const [locusParam, setLocusParam] = useState<number>(1.1);
  const [showLocusRays, setShowLocusRays] = useState<boolean>(true);
  const [showDirectrices, setShowDirectrices] = useState<boolean>(true);

  // Parámetros del Cono de Apolonio 3D
  const [planeTiltAngle, setPlaneTiltAngle] = useState<number>(25); // grados respecto a horizontal
  const [planeOffsetZ, setPlaneOffsetZ] = useState<number>(2.5);

  const dimension: DimensionMode = mode === 'apollonius-3d' ? 'R3' : 'R2';

  // 1. Datos de la Circunferencia
  const circleData = useMemo(() => {
    const pts: Vector3Tuple[] = [];
    const segments = 96;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push([
        centerH + radiusR * Math.cos(theta),
        centerK + radiusR * Math.sin(theta),
        0,
      ]);
    }
    const px = centerH + radiusR * Math.cos(locusParam);
    const py = centerK + radiusR * Math.sin(locusParam);
    // Vector tangente (-sin, cos)
    const tx = -Math.sin(locusParam);
    const ty = Math.cos(locusParam);
    const tangentStart: Vector3Tuple = [px - tx * 3.5, py - ty * 3.5, 0];
    const tangentEnd: Vector3Tuple = [px + tx * 3.5, py + ty * 3.5, 0];

    // Ecuación general x^2 + y^2 + Dx + Ey + F = 0
    const D = -2 * centerH;
    const E = -2 * centerK;
    const F = centerH * centerH + centerK * centerK - radiusR * radiusR;

    return {
      points: pts,
      sampleP: [px, py, 0] as Vector3Tuple,
      tangentStart,
      tangentEnd,
      D,
      E,
      F,
    };
  }, [centerH, centerK, radiusR, locusParam]);

  // 2. Datos de la Elipse
  const ellipseData = useMemo(() => {
    const pts: Vector3Tuple[] = [];
    const segments = 100;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push([
        centerH + semiA * Math.cos(theta),
        centerK + semiB * Math.sin(theta),
        0,
      ]);
    }

    const isHorizontalMajor = semiA >= semiB;
    const major = Math.max(semiA, semiB);
    const minor = Math.min(semiA, semiB);
    const c = Math.sqrt(Math.max(0, major * major - minor * minor));
    const eccentricity = major > 1e-6 ? c / major : 0;
    const latusRectum = major > 1e-6 ? (2 * minor * minor) / major : 0;

    const f1: Vector3Tuple = isHorizontalMajor
      ? [centerH - c, centerK, 0]
      : [centerH, centerK - c, 0];
    const f2: Vector3Tuple = isHorizontalMajor
      ? [centerH + c, centerK, 0]
      : [centerH, centerK + c, 0];

    const v1: Vector3Tuple = isHorizontalMajor
      ? [centerH - semiA, centerK, 0]
      : [centerH, centerK - semiB, 0];
    const v2: Vector3Tuple = isHorizontalMajor
      ? [centerH + semiA, centerK, 0]
      : [centerH, centerK + semiB, 0];

    const sampleP: Vector3Tuple = [
      centerH + semiA * Math.cos(locusParam),
      centerK + semiB * Math.sin(locusParam),
      0,
    ];

    const d1 = vectorNorm(vectorSubtract(sampleP, f1));
    const d2 = vectorNorm(vectorSubtract(sampleP, f2));

    // Directrices: x = h ± a/e (si horizontal) o y = k ± b/e (si vertical)
    const directrixOffset = eccentricity > 1e-4 ? major / eccentricity : null;

    return {
      points: pts,
      isHorizontalMajor,
      major,
      minor,
      c,
      eccentricity,
      latusRectum,
      f1,
      f2,
      v1,
      v2,
      sampleP,
      d1,
      d2,
      directrixOffset,
    };
  }, [centerH, centerK, semiA, semiB, locusParam]);

  // 3. Datos de la Parábola
  const parabolaData = useMemo(() => {
    const p = Math.abs(focalP) < 0.2 ? 0.2 : focalP;
    const pts: Vector3Tuple[] = [];
    const segments = 80;
    const tMax = 6;

    for (let i = 0; i <= segments; i++) {
      const t = -tMax + (i / segments) * (2 * tMax);
      if (orientation === 'horizontal') {
        // (y - k)^2 = 4p(x - h) => x = h + t^2 / (4p), y = k + t
        pts.push([centerH + (t * t) / (4 * p), centerK + t, 0]);
      } else {
        // (x - h)^2 = 4p(y - k) => x = h + t, y = k + t^2 / (4p)
        pts.push([centerH + t, centerK + (t * t) / (4 * p), 0]);
      }
    }

    const focus: Vector3Tuple =
      orientation === 'horizontal'
        ? [centerH + p, centerK, 0]
        : [centerH, centerK + p, 0];

    const directrixLine: [Vector3Tuple, Vector3Tuple] =
      orientation === 'horizontal'
        ? [
            [centerH - p, -10, 0],
            [centerH - p, 10, 0],
          ]
        : [
            [-10, centerK - p, 0],
            [10, centerK - p, 0],
          ];

    const tSample = ((locusParam % Math.PI) - Math.PI / 2) * 2.5;
    const sampleP: Vector3Tuple =
      orientation === 'horizontal'
        ? [centerH + (tSample * tSample) / (4 * p), centerK + tSample, 0]
        : [centerH + tSample, centerK + (tSample * tSample) / (4 * p), 0];

    const footOnDirectrix: Vector3Tuple =
      orientation === 'horizontal'
        ? [centerH - p, sampleP[1], 0]
        : [sampleP[0], centerK - p, 0];

    const distToFocus = vectorNorm(vectorSubtract(sampleP, focus));
    const distToDirectrix = vectorNorm(vectorSubtract(sampleP, footOnDirectrix));

    return {
      p,
      points: pts,
      focus,
      directrixLine,
      sampleP,
      footOnDirectrix,
      distToFocus,
      distToDirectrix,
      latusRectum: Math.abs(4 * p),
    };
  }, [centerH, centerK, focalP, orientation, locusParam]);

  // 4. Datos de la Hipérbola
  const hyperbolaData = useMemo(() => {
    const a = Math.max(0.5, semiA);
    const b = Math.max(0.5, semiB);
    const c = Math.sqrt(a * a + b * b);
    const eccentricity = c / a;

    const branch1: Vector3Tuple[] = [];
    const branch2: Vector3Tuple[] = [];
    const segments = 70;
    const uMax = 1.65; // sinh(1.65) ≈ 2.5

    for (let i = 0; i <= segments; i++) {
      const u = -uMax + (i / segments) * (2 * uMax);
      const ch = Math.cosh(u);
      const sh = Math.sinh(u);

      if (orientation === 'horizontal') {
        branch1.push([centerH + a * ch, centerK + b * sh, 0]);
        branch2.push([centerH - a * ch, centerK + b * sh, 0]);
      } else {
        branch1.push([centerH + b * sh, centerK + a * ch, 0]);
        branch2.push([centerH + b * sh, centerK - a * ch, 0]);
      }
    }

    const f1: Vector3Tuple =
      orientation === 'horizontal'
        ? [centerH - c, centerK, 0]
        : [centerH, centerK - c, 0];
    const f2: Vector3Tuple =
      orientation === 'horizontal'
        ? [centerH + c, centerK, 0]
        : [centerH, centerK + c, 0];

    const v1: Vector3Tuple =
      orientation === 'horizontal'
        ? [centerH - a, centerK, 0]
        : [centerH, centerK - a, 0];
    const v2: Vector3Tuple =
      orientation === 'horizontal'
        ? [centerH + a, centerK, 0]
        : [centerH, centerK + a, 0];

    // Asíntotas y rectángulo fundamental
    const slope = orientation === 'horizontal' ? b / a : a / b;
    const spanX = 10;
    const asym1: [Vector3Tuple, Vector3Tuple] = [
      [centerH - spanX, centerK - slope * spanX, 0],
      [centerH + spanX, centerK + slope * spanX, 0],
    ];
    const asym2: [Vector3Tuple, Vector3Tuple] = [
      [centerH - spanX, centerK + slope * spanX, 0],
      [centerH + spanX, centerK - slope * spanX, 0],
    ];

    const rx = orientation === 'horizontal' ? a : b;
    const ry = orientation === 'horizontal' ? b : a;
    const boxPts: Vector3Tuple[] = [
      [centerH - rx, centerK - ry, 0],
      [centerH + rx, centerK - ry, 0],
      [centerH + rx, centerK + ry, 0],
      [centerH - rx, centerK + ry, 0],
      [centerH - rx, centerK - ry, 0],
    ];

    const uSample = Math.sin(locusParam) * 1.1;
    const sampleP: Vector3Tuple =
      orientation === 'horizontal'
        ? [centerH + a * Math.cosh(uSample), centerK + b * Math.sinh(uSample), 0]
        : [centerH + b * Math.sinh(uSample), centerK + a * Math.cosh(uSample), 0];

    const d1 = vectorNorm(vectorSubtract(sampleP, f1));
    const d2 = vectorNorm(vectorSubtract(sampleP, f2));

    return {
      a,
      b,
      c,
      eccentricity,
      branch1,
      branch2,
      f1,
      f2,
      v1,
      v2,
      asym1,
      asym2,
      boxPts,
      sampleP,
      d1,
      d2,
    };
  }, [centerH, centerK, semiA, semiB, orientation, locusParam]);

  // 5. Datos del Cono de Apolonio 3D (x^2 + y^2 = z^2, semiángulo generatriz = 45°)
  const apolloniusData = useMemo(() => {
    const rad = (planeTiltAngle * Math.PI) / 180;
    // Plano secante con normal (-sin(rad), 0, cos(rad)) pasando por (0, 0, planeOffsetZ)
    // Ecuación del plano: -sin(rad)*x + cos(rad)*z - cos(rad)*z0 = 0
    // => z = z0 + tan(rad)*x
    const normal: Vector3Tuple = [-Math.sin(rad), 0, Math.cos(rad)];
    const dTerm = -Math.cos(rad) * planeOffsetZ;

    // Clasificación según ángulo del plano respecto a la base (generatriz a 45°):
    let sectionType = 'Elipse';
    if (Math.abs(planeTiltAngle) < 1) {
      sectionType = 'Circunferencia (θ = 0°)';
    } else if (Math.abs(Math.abs(planeTiltAngle) - 45) < 1.5) {
      sectionType = 'Parábola (θ = 45° // generatriz)';
    } else if (Math.abs(planeTiltAngle) > 45) {
      sectionType = 'Hipérbola (θ > 45° corta ambas hojas)';
    } else {
      sectionType = 'Elipse (0° < θ < 45°)';
    }

    return { normal, dTerm, sectionType };
  }, [planeTiltAngle, planeOffsetZ]);

  const legendItems = useMemo(() => {
    if (mode === 'circle') {
      return [
        { color: '#38bdf8', label: 'Circunferencia', value: `r = ${formatNum(radiusR, 1)}` },
        { color: '#facc15', label: 'Centro C', value: `(${formatNum(centerH, 1)}, ${formatNum(centerK, 1)})` },
        { color: '#10b981', label: 'Recta Tangente' },
      ];
    }
    if (mode === 'ellipse') {
      return [
        { color: '#38bdf8', label: 'Elipse', value: `e = ${formatNum(ellipseData.eccentricity, 3)}` },
        { color: '#f43f5e', label: 'Focos F₁, F₂', value: `c = ${formatNum(ellipseData.c, 2)}` },
        { color: '#facc15', label: 'd(P,F₁)+d(P,F₂)', value: `${formatNum(ellipseData.d1 + ellipseData.d2, 2)} = 2a` },
      ];
    }
    if (mode === 'parabola') {
      return [
        { color: '#38bdf8', label: 'Parábola', value: 'e = 1' },
        { color: '#f43f5e', label: 'Foco F', value: formatVector(parabolaData.focus, true, 2) },
        { color: '#10b981', label: 'Directriz Ld' },
      ];
    }
    if (mode === 'hyperbola') {
      return [
        { color: '#38bdf8', label: 'Hipérbola', value: `e = ${formatNum(hyperbolaData.eccentricity, 3)}` },
        { color: '#f43f5e', label: 'Focos F₁, F₂', value: `c = ${formatNum(hyperbolaData.c, 2)}` },
        { color: '#a855f7', label: 'Asíntotas' },
      ];
    }
    return [
      { color: '#38bdf8', label: 'Cono Doble x² + y² = z²' },
      { color: '#f43f5e', label: 'Plano Secante', value: apolloniusData.sectionType },
    ];
  }, [
    mode,
    radiusR,
    centerH,
    centerK,
    ellipseData,
    parabolaData,
    hyperbolaData,
    apolloniusData,
  ]);

  return (
    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">
      {/* ESCENA INTERACTIVA 2D / 3D */}
      <div className="flex-1 flex flex-col h-[52vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Barra de selección de Cónicas */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 z-20">
          <div className="flex flex-wrap items-center gap-1">
            {CONIC_TABS.map((tab) => {
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMode(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      active
                        ? 'bg-indigo-800/90 text-indigo-100'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lienzo Gráfico */}
        <div className="flex-1 relative">
          <Scene3D dimension={dimension} legendItems={legendItems}>
            {/* 1. CIRCUNFERENCIA */}
            {mode === 'circle' && (
              <>
                <Line points={circleData.points} color="#38bdf8" lineWidth={3.5} />
                <Point3DObject
                  position={[centerH, centerK, 0]}
                  color="#facc15"
                  label="C"
                  isR2
                />
                <Point3DObject
                  position={circleData.sampleP}
                  color="#e879f9"
                  label="P"
                  isR2
                />
                <DistanceSegment3D
                  from={[centerH, centerK, 0]}
                  to={circleData.sampleP}
                  distance={radiusR}
                  labelPrefix="r"
                  color="#facc15"
                />
                {showLocusRays && (
                  <Line
                    points={[circleData.tangentStart, circleData.tangentEnd]}
                    color="#10b981"
                    lineWidth={2}
                    dashed
                    dashSize={0.25}
                    gapSize={0.15}
                  />
                )}
              </>
            )}

            {/* 2. ELIPSE */}
            {mode === 'ellipse' && (
              <>
                <Line points={ellipseData.points} color="#38bdf8" lineWidth={3.5} />
                <Point3DObject
                  position={[centerH, centerK, 0]}
                  color="#94a3b8"
                  label="C"
                  isR2
                  radius={0.11}
                />
                <Point3DObject
                  position={ellipseData.f1}
                  color="#f43f5e"
                  label="F₁"
                  isR2
                />
                <Point3DObject
                  position={ellipseData.f2}
                  color="#f43f5e"
                  label="F₂"
                  isR2
                />
                <Point3DObject
                  position={ellipseData.v1}
                  color="#38bdf8"
                  label="V₁"
                  isR2
                  radius={0.11}
                />
                <Point3DObject
                  position={ellipseData.v2}
                  color="#38bdf8"
                  label="V₂"
                  isR2
                  radius={0.11}
                />

                {showLocusRays && (
                  <>
                    <Point3DObject
                      position={ellipseData.sampleP}
                      color="#facc15"
                      label="P"
                      isR2
                      radius={0.16}
                    />
                    <DistanceSegment3D
                      from={ellipseData.f1}
                      to={ellipseData.sampleP}
                      distance={ellipseData.d1}
                      labelPrefix="d₁"
                      color="#fbbf24"
                    />
                    <DistanceSegment3D
                      from={ellipseData.f2}
                      to={ellipseData.sampleP}
                      distance={ellipseData.d2}
                      labelPrefix="d₂"
                      color="#fbbf24"
                    />
                  </>
                )}

                {showDirectrices &&
                  ellipseData.directrixOffset &&
                  ellipseData.directrixOffset <= 14 && (
                    <>
                      {ellipseData.isHorizontalMajor ? (
                        <>
                          <Line
                            points={[
                              [centerH - ellipseData.directrixOffset, -10, 0],
                              [centerH - ellipseData.directrixOffset, 10, 0],
                            ]}
                            color="#10b981"
                            lineWidth={1.8}
                            dashed
                            dashSize={0.25}
                            gapSize={0.2}
                          />
                          <Line
                            points={[
                              [centerH + ellipseData.directrixOffset, -10, 0],
                              [centerH + ellipseData.directrixOffset, 10, 0],
                            ]}
                            color="#10b981"
                            lineWidth={1.8}
                            dashed
                            dashSize={0.25}
                            gapSize={0.2}
                          />
                        </>
                      ) : (
                        <>
                          <Line
                            points={[
                              [-10, centerK - ellipseData.directrixOffset, 0],
                              [10, centerK - ellipseData.directrixOffset, 0],
                            ]}
                            color="#10b981"
                            lineWidth={1.8}
                            dashed
                            dashSize={0.25}
                            gapSize={0.2}
                          />
                          <Line
                            points={[
                              [-10, centerK + ellipseData.directrixOffset, 0],
                              [10, centerK + ellipseData.directrixOffset, 0],
                            ]}
                            color="#10b981"
                            lineWidth={1.8}
                            dashed
                            dashSize={0.25}
                            gapSize={0.2}
                          />
                        </>
                      )}
                    </>
                  )}
              </>
            )}

            {/* 3. PARÁBOLA */}
            {mode === 'parabola' && (
              <>
                <Line points={parabolaData.points} color="#38bdf8" lineWidth={3.5} />
                <Point3DObject
                  position={[centerH, centerK, 0]}
                  color="#38bdf8"
                  label="V (Vértice)"
                  isR2
                />
                <Point3DObject
                  position={parabolaData.focus}
                  color="#f43f5e"
                  label="F (Foco)"
                  isR2
                />
                <Line
                  points={parabolaData.directrixLine}
                  color="#10b981"
                  lineWidth={2.5}
                  dashed
                  dashSize={0.25}
                  gapSize={0.18}
                />

                {showLocusRays && (
                  <>
                    <Point3DObject
                      position={parabolaData.sampleP}
                      color="#facc15"
                      label="P"
                      isR2
                      radius={0.16}
                    />
                    <Point3DObject
                      position={parabolaData.footOnDirectrix}
                      color="#10b981"
                      label="Q ∈ Ld"
                      isR2
                      radius={0.12}
                    />
                    <DistanceSegment3D
                      from={parabolaData.focus}
                      to={parabolaData.sampleP}
                      distance={parabolaData.distToFocus}
                      labelPrefix="d(P,F)"
                    />
                    <DistanceSegment3D
                      from={parabolaData.footOnDirectrix}
                      to={parabolaData.sampleP}
                      distance={parabolaData.distToDirectrix}
                      labelPrefix="d(P,Ld)"
                      color="#34d399"
                    />
                  </>
                )}
              </>
            )}

            {/* 4. HIPÉRBOLA */}
            {mode === 'hyperbola' && (
              <>
                <Line points={hyperbolaData.branch1} color="#38bdf8" lineWidth={3.5} />
                <Line points={hyperbolaData.branch2} color="#38bdf8" lineWidth={3.5} />

                {/* Rectángulo fundamental y Asíntotas */}
                <Line
                  points={hyperbolaData.boxPts}
                  color="#64748b"
                  lineWidth={1.3}
                  dashed
                  dashSize={0.2}
                  gapSize={0.15}
                />
                <Line
                  points={hyperbolaData.asym1}
                  color="#a855f7"
                  lineWidth={1.8}
                  dashed
                  dashSize={0.3}
                  gapSize={0.2}
                />
                <Line
                  points={hyperbolaData.asym2}
                  color="#a855f7"
                  lineWidth={1.8}
                  dashed
                  dashSize={0.3}
                  gapSize={0.2}
                />

                <Point3DObject
                  position={hyperbolaData.f1}
                  color="#f43f5e"
                  label="F₁"
                  isR2
                />
                <Point3DObject
                  position={hyperbolaData.f2}
                  color="#f43f5e"
                  label="F₂"
                  isR2
                />
                <Point3DObject
                  position={hyperbolaData.v1}
                  color="#38bdf8"
                  label="V₁"
                  isR2
                  radius={0.12}
                />
                <Point3DObject
                  position={hyperbolaData.v2}
                  color="#38bdf8"
                  label="V₂"
                  isR2
                  radius={0.12}
                />

                {showLocusRays && (
                  <>
                    <Point3DObject
                      position={hyperbolaData.sampleP}
                      color="#facc15"
                      label="P"
                      isR2
                      radius={0.16}
                    />
                    <DistanceSegment3D
                      from={hyperbolaData.f1}
                      to={hyperbolaData.sampleP}
                      distance={hyperbolaData.d1}
                      labelPrefix="d₁"
                    />
                    <DistanceSegment3D
                      from={hyperbolaData.f2}
                      to={hyperbolaData.sampleP}
                      distance={hyperbolaData.d2}
                      labelPrefix="d₂"
                    />
                  </>
                )}
              </>
            )}

            {/* 5. CONO DE APOLONIO EN 3D */}
            {mode === 'apollonius-3d' && (
              <>
                {/* Hoja superior del cono (z de 0 a 5) */}
                <mesh position={[0, 0, 2.5]} rotation={[-Math.PI / 2, 0, 0]}>
                  <coneGeometry args={[5, 5, 64, 1, true]} />
                  <meshStandardMaterial
                    color="#38bdf8"
                    transparent
                    opacity={0.28}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
                {/* Hoja inferior del cono (z de -5 a 0) */}
                <mesh position={[0, 0, -2.5]} rotation={[Math.PI / 2, 0, 0]}>
                  <coneGeometry args={[5, 5, 64, 1, true]} />
                  <meshStandardMaterial
                    color="#38bdf8"
                    transparent
                    opacity={0.28}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>

                {/* Plano secante inclinado */}
                <Plane3DObject
                  normal={apolloniusData.normal}
                  dTerm={apolloniusData.dTerm}
                  color="#f43f5e"
                  opacity={0.42}
                  size={11}
                  label={apolloniusData.sectionType}
                  showNormalVector={false}
                />
              </>
            )}
          </Scene3D>
        </div>
      </div>

      {/* PANEL LATERAL DERECHO */}
      <div className="w-full lg:w-[440px] xl:w-[480px] h-[48vh] lg:h-full bg-slate-950 flex flex-col overflow-y-auto shrink-0">
        <div className="p-4 border-b border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Parámetros de la Cónica
            </h2>

            {mode !== 'apollonius-3d' && (
              <button
                type="button"
                onClick={() => {
                  setCenterH(0);
                  setCenterK(0);
                  setSemiA(5);
                  setSemiB(3);
                  setRadiusR(4);
                  setFocalP(1.5);
                }}
                className="px-2 py-1 text-[11px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
              >
                Centrar en (0,0)
              </button>
            )}
          </div>

          {mode !== 'apollonius-3d' ? (
            <div className="space-y-3">
              {/* Centro (h, k) o Vértice */}
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
                <div className="text-xs font-semibold text-slate-200">
                  {mode === 'parabola'
                    ? 'Vértice V(h, k)'
                    : 'Centro de Simetría C(h, k)'}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 flex justify-between">
                      <span>h (Eje X)</span>
                      <span className="text-white">{formatNum(centerH, 1)}</span>
                    </label>
                    <input
                      type="range"
                      min={-4}
                      max={4}
                      step={0.5}
                      value={centerH}
                      onChange={(e) => setCenterH(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 flex justify-between">
                      <span>k (Eje Y)</span>
                      <span className="text-white">{formatNum(centerK, 1)}</span>
                    </label>
                    <input
                      type="range"
                      min={-4}
                      max={4}
                      step={0.5}
                      value={centerK}
                      onChange={(e) => setCenterK(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Controles específicos según cónica */}
              {mode === 'circle' && (
                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-sky-300 font-bold">Radio r</span>
                    <span className="text-white">{formatNum(radiusR, 1)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={7}
                    step={0.25}
                    value={radiusR}
                    onChange={(e) => setRadiusR(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                </div>
              )}

              {(mode === 'ellipse' || mode === 'hyperbola') && (
                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2.5">
                  {mode === 'hyperbola' && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300">Eje Focal:</span>
                      <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setOrientation('horizontal')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold ${
                            orientation === 'horizontal'
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400'
                          }`}
                        >
                          Horizontal (X)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrientation('vertical')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold ${
                            orientation === 'vertical'
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400'
                          }`}
                        >
                          Vertical (Y)
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-sky-300">Semieje a</span>
                      <span className="text-white">{formatNum(semiA, 1)}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={7}
                      step={0.25}
                      value={semiA}
                      onChange={(e) => setSemiA(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-emerald-300">Semieje b</span>
                      <span className="text-white">{formatNum(semiB, 1)}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={7}
                      step={0.25}
                      value={semiB}
                      onChange={(e) => setSemiB(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                  </div>
                </div>
              )}

              {mode === 'parabola' && (
                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Eje de Simetría:</span>
                    <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setOrientation('horizontal')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          orientation === 'horizontal'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        Horizontal
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrientation('vertical')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          orientation === 'vertical'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        Vertical
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-rose-300">
                        Distancia Focal p (V → F)
                      </span>
                      <span className="text-white">
                        {formatNum(parabolaData.p, 2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-4}
                      max={4}
                      step={0.25}
                      value={focalP}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setFocalP(Math.abs(v) < 0.2 ? 0.25 : v);
                      }}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>
                </div>
              )}

              {/* Punto Móvil P de Lugar Geométrico */}
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-300 font-semibold">
                    Punto Móvil P sobre la Cónica
                  </span>
                  <input
                    type="checkbox"
                    checked={showLocusRays}
                    onChange={(e) => setShowLocusRays(e.target.checked)}
                    className="accent-amber-400 rounded"
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={6.28}
                  step={0.05}
                  value={locusParam}
                  onChange={(e) => setLocusParam(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                {mode === 'ellipse' && (
                  <label className="flex items-center gap-2 text-xs text-slate-300 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showDirectrices}
                      onChange={(e) => setShowDirectrices(e.target.checked)}
                      className="accent-emerald-500 rounded"
                    />
                    <span>Mostrar rectas directrices (x = h ± a/e)</span>
                  </label>
                )}
              </div>
            </div>
          ) : (
            /* Controles del Cono de Apolonio 3D */
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPlaneTiltAngle(0);
                    setPlaneOffsetZ(2.5);
                  }}
                  className="px-2.5 py-1 text-xs rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-300"
                >
                  Circunferencia (0°)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlaneTiltAngle(25);
                    setPlaneOffsetZ(2.5);
                  }}
                  className="px-2.5 py-1 text-xs rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-300"
                >
                  Elipse (25°)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlaneTiltAngle(45);
                    setPlaneOffsetZ(2);
                  }}
                  className="px-2.5 py-1 text-xs rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300"
                >
                  Parábola (45°)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlaneTiltAngle(65);
                    setPlaneOffsetZ(1.5);
                  }}
                  className="px-2.5 py-1 text-xs rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-300"
                >
                  Hipérbola (65°)
                </button>
              </div>

              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-rose-300">
                    Inclinación del Plano θ
                  </span>
                  <span className="text-white">{planeTiltAngle}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={1}
                  value={planeTiltAngle}
                  onChange={(e) => setPlaneTiltAngle(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />

                <div className="flex justify-between text-xs font-mono pt-2">
                  <span className="text-indigo-300">Altura de corte z₀</span>
                  <span className="text-white">{formatNum(planeOffsetZ, 1)}</span>
                </div>
                <input
                  type="range"
                  min={-3}
                  max={3.5}
                  step={0.25}
                  value={planeOffsetZ}
                  onChange={(e) => setPlaneOffsetZ(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bloque de Fórmulas y Propiedades Analíticas */}
        <div className="p-4 space-y-3 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            Ecuación Canónica, Focos y Excentricidad
          </h3>

          {mode === 'circle' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  Ecuación Canónica de la Circunferencia
                </div>
                <div className="text-sky-300 font-bold text-sm">
                  (x - ({formatNum(centerH)}))² + (y - ({formatNum(centerK)}))² ={' '}
                  {formatNum(radiusR * radiusR, 2)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  Ecuación General Desarrollada
                </div>
                <div className="text-slate-200">
                  x² + y² + ({formatNum(circleData.D)})x + ({formatNum(circleData.E)})y + (
                  {formatNum(circleData.F, 2)}) = 0
                </div>
                <div className="text-emerald-300 pt-1 border-t border-slate-800">
                  Excentricidad e = 0 (Los dos focos coinciden con el centro C)
                </div>
              </div>
            </div>
          )}

          {mode === 'ellipse' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  Ecuación Canónica de la Elipse
                </div>
                <div className="text-sky-300 font-bold text-sm">
                  (x - {formatNum(centerH)})² / {formatNum(semiA * semiA, 2)} + (y -{' '}
                  {formatNum(centerK)})² / {formatNum(semiB * semiB, 2)} = 1
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  Relación Pitagórica y Elementos Focales
                </div>
                <div className="text-slate-200">
                  c = √(|a² - b²|) = {formatNum(ellipseData.c, 3)}
                </div>
                <div className="text-rose-300">
                  F₁ = {formatVector(ellipseData.f1, true, 2)} | F₂ ={' '}
                  {formatVector(ellipseData.f2, true, 2)}
                </div>
                <div className="text-amber-300 font-bold pt-1 border-t border-slate-800 flex justify-between">
                  <span>Excentricidad e = c / a_mayor</span>
                  <span>e = {formatNum(ellipseData.eccentricity, 3)}</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Lado Recto LR = 2b²/a = {formatNum(ellipseData.latusRectum, 2)}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] font-sans text-amber-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Definición de Lugar Geométrico:</strong> Para cualquier
                  punto P de la elipse, la suma de distancias a los focos es
                  constante:{' '}
                  <code className="font-bold">
                    d(P,F₁) + d(P,F₂) = {formatNum(ellipseData.d1, 2)} +{' '}
                    {formatNum(ellipseData.d2, 2)} ={' '}
                    {formatNum(ellipseData.d1 + ellipseData.d2, 2)} = 2a
                  </code>
                  .
                </span>
              </div>
            </div>
          )}

          {mode === 'parabola' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  Ecuación Canónica de la Parábola
                </div>
                <div className="text-sky-300 font-bold text-sm">
                  {orientation === 'horizontal'
                    ? `(y - ${formatNum(centerK)})² = ${formatNum(
                        4 * parabolaData.p,
                        2
                      )}(x - ${formatNum(centerH)})`
                    : `(x - ${formatNum(centerH)})² = ${formatNum(
                        4 * parabolaData.p,
                        2
                      )}(y - ${formatNum(centerK)})`}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-rose-300">
                  Foco F = {formatVector(parabolaData.focus, true, 2)}
                </div>
                <div className="text-emerald-300">
                  Recta Directriz Ld:{' '}
                  {orientation === 'horizontal'
                    ? `x = ${formatNum(centerH - parabolaData.p, 2)}`
                    : `y = ${formatNum(centerK - parabolaData.p, 2)}`}
                </div>
                <div className="text-amber-300 font-bold pt-1 border-t border-slate-800 flex justify-between">
                  <span>Excentricidad e = 1</span>
                  <span>|4p| = {formatNum(parabolaData.latusRectum, 2)}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[11px] font-sans text-emerald-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Equidistancia Focal-Directriz:</strong> En todo punto P de
                  la parábola se cumple{' '}
                  <code>
                    d(P, F) = d(P, Ld) = {formatNum(parabolaData.distToFocus, 2)}
                  </code>
                  .
                </span>
              </div>
            </div>
          )}

          {mode === 'hyperbola' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  Ecuación Canónica de la Hipérbola
                </div>
                <div className="text-sky-300 font-bold text-sm">
                  {orientation === 'horizontal'
                    ? `(x - ${formatNum(centerH)})² / ${formatNum(
                        semiA * semiA,
                        2
                      )} - (y - ${formatNum(centerK)})² / ${formatNum(
                        semiB * semiB,
                        2
                      )} = 1`
                    : `(y - ${formatNum(centerK)})² / ${formatNum(
                        semiA * semiA,
                        2
                      )} - (x - ${formatNum(centerH)})² / ${formatNum(
                        semiB * semiB,
                        2
                      )} = 1`}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-slate-200">
                  Relación Focal: c = √(a² + b²) = {formatNum(hyperbolaData.c, 3)}
                </div>
                <div className="text-rose-300">
                  F₁ = {formatVector(hyperbolaData.f1, true, 2)} | F₂ ={' '}
                  {formatVector(hyperbolaData.f2, true, 2)}
                </div>
                <div className="text-purple-300">
                  Asíntotas: y - {formatNum(centerK)} = ±(
                  {orientation === 'horizontal'
                    ? `${formatNum(semiB)}/${formatNum(semiA)}`
                    : `${formatNum(semiA)}/${formatNum(semiB)}`}
                  )(x - {formatNum(centerH)})
                </div>
                <div className="text-amber-300 font-bold pt-1 border-t border-slate-800 flex justify-between">
                  <span>Excentricidad e = c / a &gt; 1</span>
                  <span>e = {formatNum(hyperbolaData.eccentricity, 3)}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] font-sans text-amber-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Lugar Geométrico:</strong> La diferencia absoluta de
                  distancias a los focos es constante:{' '}
                  <code>
                    |d(P,F₁) - d(P,F₂)| = |{formatNum(hyperbolaData.d1, 2)} -{' '}
                    {formatNum(hyperbolaData.d2, 2)}| ={' '}
                    {formatNum(Math.abs(hyperbolaData.d1 - hyperbolaData.d2), 2)} =
                    2a
                  </code>
                  .
                </span>
              </div>
            </div>
          )}

          {mode === 'apollonius-3d' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-sans text-slate-400">
                  Superficie Cónica Cuádrica y Plano Secante
                </div>
                <div className="text-sky-300 font-bold">
                  Cono: x² + y² - z² = 0 (Generatriz α = 45°)
                </div>
                <div className="text-rose-300 font-bold pt-1 border-t border-slate-800">
                  Sección obtenida: {apolloniusData.sectionType}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
