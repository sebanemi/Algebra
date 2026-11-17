import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Calculator,
  Info,
} from 'lucide-react';
import type { DimensionMode, Vector3Tuple } from '../types/curriculum';
import {
  formatNum,
  formatVector,
  formatPlaneEquation,
  vectorAdd,
  vectorScale,
  vectorDot,
  vectorNorm,
  analyzeLineAndPlane,
  analyzeTwoLines,
  analyzeTwoPlanes,
  pointToLineDistance,
  pointToPlaneDistance,
} from '../utils/mathUtils';
import { Scene3D } from '../components/canvas/Scene3D';
import { Vector3DObject } from '../components/canvas/Vector3DObject';
import {
  Point3DObject,
  InfiniteLine3D,
  Plane3DObject,
  DistanceSegment3D,
} from '../components/canvas/LineAndPlanePrimitives';

type Unit2Mode =
  | 'line-eq'
  | 'plane-eq'
  | 'line-plane'
  | 'relative-pos'
  | 'distances';

interface TupleControlCardProps {
  title: string;
  symbol: string;
  color: string;
  value: Vector3Tuple;
  onChange: (next: Vector3Tuple) => void;
  dimension?: DimensionMode;
  min?: number;
  max?: number;
  step?: number;
}

const TupleControlCard: React.FC<TupleControlCardProps> = ({
  title,
  symbol,
  color,
  value,
  onChange,
  dimension = 'R3',
  min = -6,
  max = 6,
  step = 0.5,
}) => {
  const axes: { label: 'X' | 'Y' | 'Z'; index: 0 | 1 | 2; badge: string }[] =
    dimension === 'R2'
      ? [
          { label: 'X', index: 0, badge: 'text-rose-400 border-rose-500/40' },
          { label: 'Y', index: 1, badge: 'text-emerald-400 border-emerald-500/40' },
        ]
      : [
          { label: 'X', index: 0, badge: 'text-rose-400 border-rose-500/40' },
          { label: 'Y', index: 1, badge: 'text-emerald-400 border-emerald-500/40' },
          { label: 'Z', index: 2, badge: 'text-sky-400 border-sky-500/40' },
        ];

  const handleAxis = (idx: 0 | 1 | 2, raw: string) => {
    const parsed = parseFloat(raw);
    const num = Number.isNaN(parsed) ? 0 : Math.max(-12, Math.min(12, parsed));
    const next: Vector3Tuple = [...value] as Vector3Tuple;
    next[idx] = num;
    onChange(next);
  };

  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
          />
          <span className="font-mono font-bold text-xs text-white">{symbol}</span>
          <span className="text-xs text-slate-400">— {title}</span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          {formatVector(value, dimension === 'R2', 1)}
        </span>
      </div>

      <div className="space-y-1.5">
        {axes.map(({ label, index, badge }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`w-6 text-center font-mono text-[11px] font-bold rounded bg-slate-950 py-0.5 border ${badge}`}
            >
              {label}
            </span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value[index]}
              onChange={(e) => handleAxis(index, e.target.value)}
              className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <input
              type="number"
              min={-12}
              max={12}
              step={step}
              value={value[index]}
              onChange={(e) => handleAxis(index, e.target.value)}
              className="w-16 px-2 py-0.5 text-right font-mono text-xs rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const UNIT2_TABS: {
  id: Unit2Mode;
  label: string;
  requiresR3?: boolean;
}[] = [
  { id: 'line-eq', label: '1. Ecuación de la Recta' },
  { id: 'plane-eq', label: '2. Ecuación del Plano', requiresR3: true },
  { id: 'line-plane', label: '3. Recta y Plano', requiresR3: true },
  { id: 'relative-pos', label: '4. Dos Rectas / Dos Planos' },
  { id: 'distances', label: '5. Distancias Métricas' },
];

export const Unit2LinesAndPlanes: React.FC = () => {
  const [dimension, setDimension] = useState<DimensionMode>('R3');
  const [mode, setMode] = useState<Unit2Mode>('line-eq');

  // Estado para Recta 1: L1(P0, d1) y parámetro móvil t
  const [lineP0, setLineP0] = useState<Vector3Tuple>([1, -2, 1]);
  const [lineD1, setLineD1] = useState<Vector3Tuple>([2, 3, 1.5]);
  const [paramT, setParamT] = useState<number>(1.2);
  const [showPositionVectors, setShowPositionVectors] = useState<boolean>(true);

  // Estado para Plano 1: definido por Punto P_pi y Normal n1 (o término D1)
  const [planePoint, setPlanePoint] = useState<Vector3Tuple>([1, 1, 2]);
  const [planeNormal, setPlaneNormal] = useState<Vector3Tuple>([1, 1.5, 2]);
  const [showIntercepts, setShowIntercepts] = useState<boolean>(true);

  // Estado para Segunda Recta L2(P2, d2) y Segundo Plano π2(n2, D2)
  const [subModeRel, setSubModeRel] = useState<'two-lines' | 'two-planes'>('two-lines');
  const [lineP2, setLineP2] = useState<Vector3Tuple>([-2, 2, 0]);
  const [lineD2, setLineD2] = useState<Vector3Tuple>([2, -1, 2]);

  const [planeNormal2, setPlaneNormal2] = useState<Vector3Tuple>([2, -1, 1]);
  const [planeD2, setPlaneD2] = useState<number>(-1);

  // Estado para Distancias Métricas
  const [distSubMode, setDistSubMode] = useState<'point-line' | 'point-plane'>('point-line');
  const [externalPoint, setExternalPoint] = useState<Vector3Tuple>([-3, 3, 4]);

  const isR2 = dimension === 'R2';

  // Vectores efectivos adaptados a R2 o R3
  const effLineP0: Vector3Tuple = useMemo(
    () => (isR2 ? [lineP0[0], lineP0[1], 0] : lineP0),
    [lineP0, isR2]
  );
  const effLineD1: Vector3Tuple = useMemo(
    () => (isR2 ? [lineD1[0], lineD1[1], 0] : lineD1),
    [lineD1, isR2]
  );
  const effLineP2: Vector3Tuple = useMemo(
    () => (isR2 ? [lineP2[0], lineP2[1], 0] : lineP2),
    [lineP2, isR2]
  );
  const effLineD2: Vector3Tuple = useMemo(
    () => (isR2 ? [lineD2[0], lineD2[1], 0] : lineD2),
    [lineD2, isR2]
  );
  const effExternalPoint: Vector3Tuple = useMemo(
    () => (isR2 ? [externalPoint[0], externalPoint[1], 0] : externalPoint),
    [externalPoint, isR2]
  );

  // Término independiente D del plano 1: Ax + By + Cz + D = 0 => D = - (n · P0)
  const planeD1 = useMemo(
    () => -vectorDot(planeNormal, planePoint),
    [planeNormal, planePoint]
  );

  // Punto móvil sobre L1 para el parámetro t: P(t) = P0 + t*d1
  const movingPointOnLine = useMemo(
    () => vectorAdd(effLineP0, vectorScale(effLineD1, paramT)),
    [effLineP0, effLineD1, paramT]
  );

  // Intersecciones del Plano 1 con los ejes X, Y, Z
  const planeIntercepts = useMemo(() => {
    const pts: { axis: 'X' | 'Y' | 'Z'; pos: Vector3Tuple; val: number }[] = [];
    if (Math.abs(planeD1) < 1e-7) return pts;
    if (Math.abs(planeNormal[0]) > 1e-5) {
      const a = -planeD1 / planeNormal[0];
      if (Math.abs(a) <= 10) pts.push({ axis: 'X', pos: [a, 0, 0], val: a });
    }
    if (Math.abs(planeNormal[1]) > 1e-5) {
      const b = -planeD1 / planeNormal[1];
      if (Math.abs(b) <= 10) pts.push({ axis: 'Y', pos: [0, b, 0], val: b });
    }
    if (Math.abs(planeNormal[2]) > 1e-5) {
      const c = -planeD1 / planeNormal[2];
      if (Math.abs(c) <= 10) pts.push({ axis: 'Z', pos: [0, 0, c], val: c });
    }
    return pts;
  }, [planeNormal, planeD1]);

  // Análisis Recta y Plano
  const linePlaneResult = useMemo(
    () => analyzeLineAndPlane(lineP0, lineD1, planeNormal, planeD1),
    [lineP0, lineD1, planeNormal, planeD1]
  );

  // Análisis Dos Rectas
  const twoLinesResult = useMemo(
    () => analyzeTwoLines(effLineP0, effLineD1, effLineP2, effLineD2),
    [effLineP0, effLineD1, effLineP2, effLineD2]
  );

  // Análisis Dos Planos
  const twoPlanesResult = useMemo(
    () => analyzeTwoPlanes(planeNormal, planeD1, planeNormal2, planeD2),
    [planeNormal, planeD1, planeNormal2, planeD2]
  );

  // Análisis Distancias
  const distPointLine = useMemo(
    () => pointToLineDistance(effExternalPoint, effLineP0, effLineD1),
    [effExternalPoint, effLineP0, effLineD1]
  );
  const distPointPlane = useMemo(
    () => pointToPlaneDistance(externalPoint, planeNormal, planeD1),
    [externalPoint, planeNormal, planeD1]
  );

  const handleModeSelect = (nextMode: Unit2Mode) => {
    setMode(nextMode);
    if (
      (nextMode === 'plane-eq' || nextMode === 'line-plane') &&
      dimension === 'R2'
    ) {
      setDimension('R3');
    }
  };

  const handleDimensionSelect = (nextDim: DimensionMode) => {
    setDimension(nextDim);
    if (nextDim === 'R2') {
      if (mode === 'plane-eq' || mode === 'line-plane') {
        setMode('line-eq');
      }
      if (mode === 'relative-pos' && subModeRel === 'two-planes') {
        setSubModeRel('two-lines');
      }
      if (mode === 'distances' && distSubMode === 'point-plane') {
        setDistSubMode('point-line');
      }
    }
  };

  // Leyenda dinámica
  const legendItems = useMemo(() => {
    if (mode === 'line-eq') {
      return [
        { color: '#38bdf8', label: 'Recta L' },
        { color: '#facc15', label: 'P₀', value: formatVector(effLineP0, isR2, 1) },
        { color: '#fb923c', label: 'd⃗', value: formatVector(effLineD1, isR2, 1) },
        {
          color: '#e879f9',
          label: `P(t=${formatNum(paramT, 1)})`,
          value: formatVector(movingPointOnLine, isR2, 1),
        },
      ];
    }
    if (mode === 'plane-eq') {
      return [
        {
          color: '#6366f1',
          label: 'Plano π',
          value: formatPlaneEquation(planeNormal, planeD1),
        },
        { color: '#f43f5e', label: 'Normal n⃗', value: formatVector(planeNormal, false, 1) },
        { color: '#facc15', label: 'P₀ ∈ π', value: formatVector(planePoint, false, 1) },
      ];
    }
    if (mode === 'line-plane') {
      const items: { color: string; label: string; value?: string }[] = [
        { color: '#38bdf8', label: 'Recta L' },
        { color: '#6366f1', label: 'Plano π' },
      ];
      if (linePlaneResult.status === 'secant' && linePlaneResult.intersectionPoint) {
        items.push({
          color: '#10b981',
          label: 'Intersección I',
          value: formatVector(linePlaneResult.intersectionPoint, false, 2),
        });
      }
      return items;
    }
    if (mode === 'relative-pos') {
      if (subModeRel === 'two-lines') {
        return [
          { color: '#38bdf8', label: 'Recta L₁' },
          { color: '#34d399', label: 'Recta L₂' },
          {
            color: '#fbbf24',
            label:
              twoLinesResult.status === 'intersecting'
                ? 'Intersección I'
                : 'Distancia mínima',
            value:
              twoLinesResult.status === 'intersecting'
                ? formatVector(twoLinesResult.closestPointL1, isR2, 2)
                : `${formatNum(twoLinesResult.distance, 2)} u`,
          },
        ];
      }
      return [
        { color: '#6366f1', label: 'Plano π₁' },
        { color: '#10b981', label: 'Plano π₂' },
        { color: '#facc15', label: 'Recta π₁ ∩ π₂' },
      ];
    }
    return [
      {
        color: '#e879f9',
        label: 'Punto Exterior P₁',
        value: formatVector(effExternalPoint, isR2, 1),
      },
      {
        color: '#10b981',
        label: 'Proyección Ortogonal Q',
      },
    ];
  }, [
    mode,
    effLineP0,
    effLineD1,
    paramT,
    movingPointOnLine,
    isR2,
    planeNormal,
    planeD1,
    planePoint,
    linePlaneResult,
    subModeRel,
    twoLinesResult,
    effExternalPoint,
  ]);

  return (
    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">
      {/* ESCENA 3D INTERACTIVA */}
      <div className="flex-1 flex flex-col h-[52vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Barra superior de subtemas de la Unidad 2 */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 z-20">
          <div className="flex flex-wrap items-center gap-1">
            {UNIT2_TABS.map((tab) => {
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleModeSelect(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.requiresR3 && (
                    <span
                      className={`text-[10px] font-mono px-1 rounded ${
                        active
                          ? 'bg-indigo-800/80 text-indigo-200'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      ℝ³
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Toggle R2 / R3 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Espacio:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
              <button
                type="button"
                onClick={() => handleDimensionSelect('R2')}
                className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-colors ${
                  dimension === 'R2'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ℝ² (2D)
              </button>
              <button
                type="button"
                onClick={() => handleDimensionSelect('R3')}
                className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-colors ${
                  dimension === 'R3'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ℝ³ (3D)
              </button>
            </div>
          </div>
        </div>

        {/* Visor 3D */}
        <div className="flex-1 relative">
          <Scene3D dimension={dimension} legendItems={legendItems}>
            {/* MODO 1: ECUACIÓN DE LA RECTA */}
            {mode === 'line-eq' && (
              <>
                <InfiniteLine3D
                  point={effLineP0}
                  direction={effLineD1}
                  color="#38bdf8"
                  label="Recta L"
                  isR2={isR2}
                  pointLabel="P₀"
                  directionLabel="d⃗"
                />

                {/* Punto móvil P(t) = P0 + t*d */}
                <Point3DObject
                  position={movingPointOnLine}
                  color="#e879f9"
                  label={`P(t=${formatNum(paramT, 1)})`}
                  isR2={isR2}
                  radius={0.16}
                  showDropLines={!isR2}
                />

                {/* Vectores de posición p⃗₀ y p⃗(t) desde el origen */}
                {showPositionVectors && (
                  <>
                    <Vector3DObject
                      vector={effLineP0}
                      color="#facc15"
                      label="p⃗₀"
                      dashed
                      opacity={0.65}
                      lineWidth={2}
                      headScale={0.85}
                    />
                    <Vector3DObject
                      vector={movingPointOnLine}
                      color="#e879f9"
                      label="p⃗(t)"
                      dashed
                      opacity={0.75}
                      lineWidth={2.2}
                      headScale={0.85}
                    />
                  </>
                )}
              </>
            )}

            {/* MODO 2: ECUACIÓN DEL PLANO EN R3 */}
            {mode === 'plane-eq' && (
              <>
                <Plane3DObject
                  normal={planeNormal}
                  dTerm={planeD1}
                  color="#6366f1"
                  opacity={0.3}
                  label="Plano π"
                  anchorPoint={planePoint}
                  normalLabel="n⃗"
                />
                <Point3DObject
                  position={planePoint}
                  color="#facc15"
                  label="P₀"
                  showDropLines
                />
                {showIntercepts &&
                  planeIntercepts.map((pt) => (
                    <Point3DObject
                      key={pt.axis}
                      position={pt.pos}
                      color="#34d399"
                      label={`Corte ${pt.axis}`}
                      radius={0.12}
                    />
                  ))}
              </>
            )}

            {/* MODO 3: RECTA Y PLANO (INTERSECCIÓN Y POSICIÓN RELATIVA) */}
            {mode === 'line-plane' && (
              <>
                <Plane3DObject
                  normal={planeNormal}
                  dTerm={planeD1}
                  color="#6366f1"
                  opacity={0.26}
                  label="Plano π"
                  normalLabel="n⃗"
                />
                <InfiniteLine3D
                  point={lineP0}
                  direction={lineD1}
                  color="#38bdf8"
                  label="Recta L"
                  pointLabel="P₀"
                  directionLabel="d⃗"
                />

                {linePlaneResult.status === 'secant' &&
                  linePlaneResult.intersectionPoint && (
                    <Point3DObject
                      position={linePlaneResult.intersectionPoint}
                      color="#10b981"
                      label="I = L ∩ π"
                      radius={0.2}
                      showDropLines
                    />
                  )}

                {linePlaneResult.status === 'parallel' && (
                  <>
                    <Point3DObject
                      position={linePlaneResult.projectedOriginOnPlane}
                      color="#fbbf24"
                      label="Q ∈ π"
                      radius={0.13}
                    />
                    <DistanceSegment3D
                      from={lineP0}
                      to={linePlaneResult.projectedOriginOnPlane}
                      distance={linePlaneResult.distance}
                      labelPrefix="d(L, π)"
                    />
                  </>
                )}
              </>
            )}

            {/* MODO 4: POSICIONES RELATIVAS (DOS RECTAS / DOS PLANOS) */}
            {mode === 'relative-pos' && subModeRel === 'two-lines' && (
              <>
                <InfiniteLine3D
                  point={effLineP0}
                  direction={effLineD1}
                  color="#38bdf8"
                  label="L₁"
                  pointLabel="P₁"
                  directionLabel="d⃗₁"
                  isR2={isR2}
                />
                <InfiniteLine3D
                  point={effLineP2}
                  direction={effLineD2}
                  color="#34d399"
                  label="L₂"
                  pointLabel="P₂"
                  directionLabel="d⃗₂"
                  isR2={isR2}
                />

                {twoLinesResult.status === 'intersecting' && (
                  <Point3DObject
                    position={twoLinesResult.closestPointL1}
                    color="#facc15"
                    label="I = L₁ ∩ L₂"
                    isR2={isR2}
                    radius={0.2}
                    showDropLines={!isR2}
                  />
                )}

                {(twoLinesResult.status === 'skew' ||
                  twoLinesResult.status === 'parallel') && (
                  <>
                    <Point3DObject
                      position={twoLinesResult.closestPointL1}
                      color="#fbbf24"
                      label="Q₁ ∈ L₁"
                      isR2={isR2}
                      radius={0.13}
                    />
                    <Point3DObject
                      position={twoLinesResult.closestPointL2}
                      color="#fbbf24"
                      label="Q₂ ∈ L₂"
                      isR2={isR2}
                      radius={0.13}
                    />
                    <DistanceSegment3D
                      from={twoLinesResult.closestPointL1}
                      to={twoLinesResult.closestPointL2}
                      distance={twoLinesResult.distance}
                      labelPrefix="d_mín"
                    />
                  </>
                )}
              </>
            )}

            {mode === 'relative-pos' && subModeRel === 'two-planes' && (
              <>
                <Plane3DObject
                  normal={planeNormal}
                  dTerm={planeD1}
                  color="#6366f1"
                  opacity={0.25}
                  label="π₁"
                  normalLabel="n⃗₁"
                />
                <Plane3DObject
                  normal={planeNormal2}
                  dTerm={planeD2}
                  color="#10b981"
                  opacity={0.25}
                  label="π₂"
                  normalLabel="n⃗₂"
                />
                {twoPlanesResult.status === 'secant' &&
                  twoPlanesResult.intersectionLinePoint &&
                  twoPlanesResult.intersectionLineDir && (
                    <InfiniteLine3D
                      point={twoPlanesResult.intersectionLinePoint}
                      direction={twoPlanesResult.intersectionLineDir}
                      color="#facc15"
                      label="L = π₁ ∩ π₂"
                      lineWidth={4}
                      showPoint
                      pointLabel="P_∩"
                      showDirectionVector
                      directionLabel="n⃗₁ × n⃗₂"
                    />
                  )}
              </>
            )}

            {/* MODO 5: DISTANCIAS MÉTRICAS (PUNTO-RECTA Y PUNTO-PLANO) */}
            {mode === 'distances' && distSubMode === 'point-line' && (
              <>
                <InfiniteLine3D
                  point={effLineP0}
                  direction={effLineD1}
                  color="#38bdf8"
                  label="Recta L"
                  pointLabel="P₀"
                  directionLabel="d⃗"
                  isR2={isR2}
                />
                <Point3DObject
                  position={effExternalPoint}
                  color="#e879f9"
                  label="P₁ (Exterior)"
                  isR2={isR2}
                  radius={0.17}
                  showDropLines={!isR2}
                />
                {distPointLine && (
                  <>
                    <Point3DObject
                      position={distPointLine.closestPoint}
                      color="#10b981"
                      label="Q (Proy. Ortogonal)"
                      isR2={isR2}
                      radius={0.15}
                    />
                    <DistanceSegment3D
                      from={distPointLine.closestPoint}
                      to={effExternalPoint}
                      distance={distPointLine.distance}
                      labelPrefix="d(P₁, L)"
                    />
                  </>
                )}
              </>
            )}

            {mode === 'distances' && distSubMode === 'point-plane' && (
              <>
                <Plane3DObject
                  normal={planeNormal}
                  dTerm={planeD1}
                  color="#6366f1"
                  opacity={0.28}
                  label="Plano π"
                  normalLabel="n⃗"
                />
                <Point3DObject
                  position={externalPoint}
                  color="#e879f9"
                  label="P₁ (Exterior)"
                  radius={0.17}
                  showDropLines
                />
                {distPointPlane && (
                  <>
                    <Point3DObject
                      position={distPointPlane.closestPoint}
                      color="#10b981"
                      label="Q ∈ π (Proy.)"
                      radius={0.15}
                    />
                    <DistanceSegment3D
                      from={distPointPlane.closestPoint}
                      to={externalPoint}
                      distance={distPointPlane.distance}
                      labelPrefix="d(P₁, π)"
                    />
                  </>
                )}
              </>
            )}
          </Scene3D>
        </div>
      </div>

      {/* PANEL LATERAL DERECHO: CONTROLES + FÓRMULAS MATEMÁTICAS */}
      <div className="w-full lg:w-[440px] xl:w-[480px] h-[48vh] lg:h-full bg-slate-950 flex flex-col overflow-y-auto shrink-0">
        {/* Bloque de Controles según el Subtema */}
        <div className="p-4 border-b border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Parámetros Geométricos
            </h2>

            {/* Casos rápidos según pestaña */}
            {mode === 'line-plane' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setLineP0([1, -2, 1]);
                    setLineD1([2, 3, 1.5]);
                    setPlaneNormal([1, 1.5, 2]);
                    setPlanePoint([1, 1, 2]);
                  }}
                  className="px-2 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                >
                  Secantes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLineP0([0, 0, 3]);
                    setLineD1([2, -2, 0]);
                    setPlaneNormal([1, 1, 2]);
                    setPlanePoint([0, 0, 0]);
                  }}
                  className="px-2 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                >
                  Paralelos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLineP0([1, 1, 1]);
                    setLineD1([2, -2, 0]);
                    setPlaneNormal([1, 1, 2]);
                    setPlanePoint([1, 1, 1]);
                  }}
                  className="px-2 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                >
                  L ⊂ π
                </button>
              </div>
            )}

            {mode === 'relative-pos' && subModeRel === 'two-lines' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setLineP0([0, 0, 1]);
                    setLineD1([2, 1, 1]);
                    setLineP2([0, 0, 1]);
                    setLineD2([1, -2, 1]);
                  }}
                  className="px-2 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                >
                  Secantes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLineP0([0, -2, 1]);
                    setLineD1([2, 1, 1]);
                    setLineP2([0, 2, -1]);
                    setLineD2([2, 1, 1]);
                  }}
                  className="px-2 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                >
                  Paralelas
                </button>
                {dimension === 'R3' && (
                  <button
                    type="button"
                    onClick={() => {
                      setLineP0([0, -2, -1]);
                      setLineD1([2, 1, 0]);
                      setLineP2([0, 2, 2]);
                      setLineD2([0, 2, 1]);
                    }}
                    className="px-2 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                  >
                    Alabeadas
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Controles Modo 1: Recta */}
          {mode === 'line-eq' && (
            <div className="space-y-2.5">
              <TupleControlCard
                title="Punto de paso"
                symbol="P₀"
                color="#facc15"
                value={effLineP0}
                onChange={(v) =>
                  setLineP0(isR2 ? [v[0], v[1], lineP0[2]] : v)
                }
                dimension={dimension}
              />
              <TupleControlCard
                title="Vector Director"
                symbol="d⃗"
                color="#fb923c"
                value={effLineD1}
                onChange={(v) =>
                  setLineD1(isR2 ? [v[0], v[1], lineD1[2]] : v)
                }
                dimension={dimension}
              />

              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-fuchsia-300 font-mono">
                    Parámetro t = {formatNum(paramT, 2)}
                  </span>
                  <span className="font-mono text-slate-400">
                    P(t) = {formatVector(movingPointOnLine, isR2, 2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={-4}
                  max={4}
                  step={0.1}
                  value={paramT}
                  onChange={(e) => setParamT(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                />
                <label className="flex items-center gap-2 text-xs text-slate-300 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPositionVectors}
                    onChange={(e) => setShowPositionVectors(e.target.checked)}
                    className="accent-indigo-500 rounded"
                  />
                  <span>Mostrar vectores posición p⃗₀ y p⃗(t) = p⃗₀ + t·d⃗</span>
                </label>
              </div>
            </div>
          )}

          {/* Controles Modo 2: Plano */}
          {mode === 'plane-eq' && (
            <div className="space-y-2.5">
              <TupleControlCard
                title="Vector Normal al Plano"
                symbol="n⃗ = (A,B,C)"
                color="#f43f5e"
                value={planeNormal}
                onChange={setPlaneNormal}
              />
              <TupleControlCard
                title="Punto de paso del Plano"
                symbol="P₀ ∈ π"
                color="#facc15"
                value={planePoint}
                onChange={setPlanePoint}
              />
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showIntercepts}
                  onChange={(e) => setShowIntercepts(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span>Destacar intersecciones con los ejes (a, b, c)</span>
              </label>
            </div>
          )}

          {/* Controles Modo 3: Recta y Plano */}
          {mode === 'line-plane' && (
            <div className="space-y-2.5">
              <TupleControlCard
                title="Punto de la Recta L"
                symbol="P₀"
                color="#facc15"
                value={lineP0}
                onChange={setLineP0}
              />
              <TupleControlCard
                title="Director de la Recta L"
                symbol="d⃗"
                color="#fb923c"
                value={lineD1}
                onChange={setLineD1}
              />
              <TupleControlCard
                title="Vector Normal del Plano π"
                symbol="n⃗"
                color="#f43f5e"
                value={planeNormal}
                onChange={setPlaneNormal}
              />
              <TupleControlCard
                title="Punto del Plano π"
                symbol="P_π"
                color="#6366f1"
                value={planePoint}
                onChange={setPlanePoint}
              />
            </div>
          )}

          {/* Controles Modo 4: Posiciones Relativas */}
          {mode === 'relative-pos' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubModeRel('two-lines')}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    subModeRel === 'two-lines'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Dos Rectas (L₁ y L₂)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubModeRel('two-planes');
                    if (dimension === 'R2') setDimension('R3');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    subModeRel === 'two-planes'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Dos Planos (π₁ y π₂)
                </button>
              </div>

              {subModeRel === 'two-lines' ? (
                <>
                  <TupleControlCard
                    title="Punto de L₁"
                    symbol="P₁"
                    color="#38bdf8"
                    value={effLineP0}
                    onChange={(v) =>
                      setLineP0(isR2 ? [v[0], v[1], lineP0[2]] : v)
                    }
                    dimension={dimension}
                  />
                  <TupleControlCard
                    title="Vector Director de L₁"
                    symbol="d⃗₁"
                    color="#38bdf8"
                    value={effLineD1}
                    onChange={(v) =>
                      setLineD1(isR2 ? [v[0], v[1], lineD1[2]] : v)
                    }
                    dimension={dimension}
                  />
                  <TupleControlCard
                    title="Punto de L₂"
                    symbol="P₂"
                    color="#34d399"
                    value={effLineP2}
                    onChange={(v) =>
                      setLineP2(isR2 ? [v[0], v[1], lineP2[2]] : v)
                    }
                    dimension={dimension}
                  />
                  <TupleControlCard
                    title="Vector Director de L₂"
                    symbol="d⃗₂"
                    color="#34d399"
                    value={effLineD2}
                    onChange={(v) =>
                      setLineD2(isR2 ? [v[0], v[1], lineD2[2]] : v)
                    }
                    dimension={dimension}
                  />
                </>
              ) : (
                <>
                  <TupleControlCard
                    title="Normal de π₁"
                    symbol="n⃗₁"
                    color="#6366f1"
                    value={planeNormal}
                    onChange={setPlaneNormal}
                  />
                  <TupleControlCard
                    title="Normal de π₂"
                    symbol="n⃗₂"
                    color="#10b981"
                    value={planeNormal2}
                    onChange={setPlaneNormal2}
                  />
                  <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-mono text-slate-300">
                      Término D₂ = {formatNum(planeD2, 1)}
                    </span>
                    <input
                      type="range"
                      min={-8}
                      max={8}
                      step={0.5}
                      value={planeD2}
                      onChange={(e) => setPlaneD2(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Controles Modo 5: Distancias Métricas */}
          {mode === 'distances' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDistSubMode('point-line')}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    distSubMode === 'point-line'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Punto a Recta d(P₁, L)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDistSubMode('point-plane');
                    if (dimension === 'R2') setDimension('R3');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    distSubMode === 'point-plane'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Punto a Plano d(P₁, π)
                </button>
              </div>

              <TupleControlCard
                title="Punto Exterior a medir"
                symbol="P₁"
                color="#e879f9"
                value={effExternalPoint}
                onChange={(v) =>
                  setExternalPoint(isR2 ? [v[0], v[1], externalPoint[2]] : v)
                }
                dimension={dimension}
              />

              {distSubMode === 'point-line' ? (
                <>
                  <TupleControlCard
                    title="Punto de la Recta L"
                    symbol="P₀"
                    color="#facc15"
                    value={effLineP0}
                    onChange={(v) =>
                      setLineP0(isR2 ? [v[0], v[1], lineP0[2]] : v)
                    }
                    dimension={dimension}
                  />
                  <TupleControlCard
                    title="Vector Director de L"
                    symbol="d⃗"
                    color="#fb923c"
                    value={effLineD1}
                    onChange={(v) =>
                      setLineD1(isR2 ? [v[0], v[1], lineD1[2]] : v)
                    }
                    dimension={dimension}
                  />
                </>
              ) : (
                <>
                  <TupleControlCard
                    title="Vector Normal del Plano π"
                    symbol="n⃗"
                    color="#f43f5e"
                    value={planeNormal}
                    onChange={setPlaneNormal}
                  />
                  <TupleControlCard
                    title="Punto de Paso del Plano π"
                    symbol="P₀ ∈ π"
                    color="#facc15"
                    value={planePoint}
                    onChange={setPlanePoint}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Bloque de Fórmulas y Resultados en Tiempo Real */}
        <div className="p-4 space-y-3 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            Ecuaciones y Análisis Analítico
          </h3>

          {/* RESULTADOS MODO 1: ECUACIÓN DE LA RECTA */}
          {mode === 'line-eq' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  1. Ecuación Vectorial
                </div>
                <div className="text-sky-300 font-bold">
                  {isR2 ? '(x, y)' : '(x, y, z)'} = {formatVector(effLineP0, isR2)}{' '}
                  + t · {formatVector(effLineD1, isR2)}, t ∈ ℝ
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  2. Ecuaciones Paramétricas Cartesianas
                </div>
                <div className="text-slate-200 space-y-0.5 pl-2 border-l-2 border-indigo-500">
                  <div>
                    x = {formatNum(effLineP0[0])} + ({formatNum(effLineD1[0])})·t
                  </div>
                  <div>
                    y = {formatNum(effLineP0[1])} + ({formatNum(effLineD1[1])})·t
                  </div>
                  {!isR2 && (
                    <div>
                      z = {formatNum(effLineP0[2])} + ({formatNum(effLineD1[2])})·t
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  3. Ecuación Simétrica (Continua)
                </div>
                <div className="text-amber-300 font-semibold">
                  {`(x - (${formatNum(effLineP0[0])})) / ${formatNum(
                    effLineD1[0]
                  )} = (y - (${formatNum(effLineP0[1])})) / ${formatNum(
                    effLineD1[1]
                  )}`}
                  {!isR2 &&
                    ` = (z - (${formatNum(effLineP0[2])})) / ${formatNum(
                      effLineD1[2]
                    )}`}
                </div>
                {isR2 && Math.abs(effLineD1[0]) > 1e-6 && (
                  <div className="text-emerald-300 pt-1 border-t border-slate-800">
                    Pendiente m = dy/dx ={' '}
                    {formatNum(effLineD1[1] / effLineD1[0], 2)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RESULTADOS MODO 2: ECUACIÓN DEL PLANO */}
          {mode === 'plane-eq' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  1. Ecuación Normal (Punto-Normal): n⃗ · (P - P₀) = 0
                </div>
                <div className="text-slate-200">
                  {formatNum(planeNormal[0])}(x - {formatNum(planePoint[0])}) +{' '}
                  {formatNum(planeNormal[1])}(y - {formatNum(planePoint[1])}) +{' '}
                  {formatNum(planeNormal[2])}(z - {formatNum(planePoint[2])}) = 0
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  2. Ecuación General o Implícita (Ax + By + Cz + D = 0)
                </div>
                <div className="text-indigo-300 font-bold text-sm">
                  π: {formatPlaneEquation(planeNormal, planeD1)}
                </div>
                <div className="text-slate-400 text-[11px]">
                  donde D = -(n⃗ · P₀) = {formatNum(planeD1, 2)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  3. Ecuación Segmentaria (Intersección con Ejes)
                </div>
                {planeIntercepts.length === 3 ? (
                  <div className="text-emerald-300 font-semibold">
                    x / {formatNum(planeIntercepts[0].val, 2)} + y /{' '}
                    {formatNum(planeIntercepts[1].val, 2)} + z /{' '}
                    {formatNum(planeIntercepts[2].val, 2)} = 1
                  </div>
                ) : (
                  <div className="text-slate-400 font-sans text-[11px]">
                    El plano pasa por el origen (D = 0) o es paralelo a alguno de
                    los ejes coordenados.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RESULTADOS MODO 3: RECTA Y PLANO */}
          {mode === 'line-plane' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-sans text-slate-400">
                    Posición Relativa L y π
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      linePlaneResult.status === 'secant'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {linePlaneResult.status === 'secant'
                      ? 'SECANTES (Se cortan en I)'
                      : linePlaneResult.status === 'contained'
                      ? 'RECTA CONTENIDA EN EL PLANO (L ⊂ π)'
                      : 'PARALELOS (L ∥ π)'}
                  </span>
                </div>

                <div className="text-slate-300">
                  Producto escalar d⃗ · n⃗ = {formatNum(linePlaneResult.dotDN, 3)}
                </div>

                {linePlaneResult.status === 'secant' &&
                  linePlaneResult.intersectionPoint && (
                    <div className="pt-1 border-t border-slate-800 space-y-1">
                      <div className="text-emerald-300 font-bold text-sm">
                        I = {formatVector(linePlaneResult.intersectionPoint, false, 2)}
                      </div>
                      <div className="text-slate-400">
                        Parámetro de impacto: t ={' '}
                        {formatNum(linePlaneResult.parameterT ?? 0, 2)}
                      </div>
                    </div>
                  )}

                {linePlaneResult.status === 'parallel' && (
                  <div className="pt-1 border-t border-slate-800 text-amber-300 font-bold">
                    Distancia d(L, π) = {formatNum(linePlaneResult.distance, 2)} u
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  Ángulo entre Recta y Plano: sin(α) = |d⃗ · n⃗| / (‖d⃗‖·‖n⃗‖)
                </div>
                <div className="text-indigo-300 font-bold text-sm">
                  α = {formatNum(linePlaneResult.angleDegrees, 2)}°
                </div>
              </div>
            </div>
          )}

          {/* RESULTADOS MODO 4: POSICIONES RELATIVAS */}
          {mode === 'relative-pos' && subModeRel === 'two-lines' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-sans text-slate-400">
                    Clasificación de L₁ y L₂
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                    {twoLinesResult.status === 'intersecting'
                      ? 'SECANTES (Concurrentes)'
                      : twoLinesResult.status === 'skew'
                      ? 'ALABEADAS (Se cruzan en ℝ³)'
                      : twoLinesResult.status === 'parallel'
                      ? 'PARALELAS (L₁ ∥ L₂)'
                      : 'COINCIDENTES (L₁ ≡ L₂)'}
                  </span>
                </div>

                <div className="text-slate-300">
                  Ángulo entre direcciones: θ ={' '}
                  {formatNum(twoLinesResult.angleDegrees, 2)}°
                </div>

                {!isR2 && (
                  <div className="text-slate-400">
                    Producto mixto [P₁P₂⃗, d⃗₁, d⃗₂] ={' '}
                    {formatNum(twoLinesResult.mixedProduct, 2)}
                  </div>
                )}

                {twoLinesResult.status === 'intersecting' ? (
                  <div className="pt-1 border-t border-slate-800 text-yellow-300 font-bold">
                    Punto de Intersección I ={' '}
                    {formatVector(twoLinesResult.closestPointL1, isR2, 2)}
                  </div>
                ) : (
                  <div className="pt-1 border-t border-slate-800 space-y-1">
                    <div className="text-amber-300 font-bold">
                      Distancia Mínima d(L₁, L₂) ={' '}
                      {formatNum(twoLinesResult.distance, 2)} u
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Pies de la perpendicular común: Q₁ ={' '}
                      {formatVector(twoLinesResult.closestPointL1, isR2, 2)}, Q₂ ={' '}
                      {formatVector(twoLinesResult.closestPointL2, isR2, 2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'relative-pos' && subModeRel === 'two-planes' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-sans text-slate-400">
                    Clasificación de π₁ y π₂
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    {twoPlanesResult.status === 'secant'
                      ? 'PLANOS SECANTES'
                      : twoPlanesResult.status === 'parallel'
                      ? 'PLANOS PARALELOS'
                      : 'PLANOS COINCIDENTES'}
                  </span>
                </div>

                <div className="text-slate-300">
                  Ángulo diedro θ ={' '}
                  {formatNum(twoPlanesResult.dihedralAngleDegrees, 2)}°
                </div>

                {twoPlanesResult.status === 'secant' &&
                  twoPlanesResult.intersectionLinePoint &&
                  twoPlanesResult.intersectionLineDir && (
                    <div className="pt-1 border-t border-slate-800 space-y-1">
                      <div className="text-[11px] font-sans text-slate-400">
                        Recta de Intersección L = π₁ ∩ π₂ (d⃗ = n⃗₁ × n⃗₂):
                      </div>
                      <div className="text-yellow-300 font-bold">
                        (x,y,z) ={' '}
                        {formatVector(
                          twoPlanesResult.intersectionLinePoint,
                          false,
                          2
                        )}{' '}
                        + t·
                        {formatVector(
                          twoPlanesResult.intersectionLineDir,
                          false,
                          2
                        )}
                      </div>
                    </div>
                  )}

                {twoPlanesResult.status === 'parallel' && (
                  <div className="pt-1 border-t border-slate-800 text-amber-300 font-bold">
                    Distancia entre planos d(π₁, π₂) ={' '}
                    {formatNum(twoPlanesResult.distance, 2)} u
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RESULTADOS MODO 5: DISTANCIAS MÉTRICAS */}
          {mode === 'distances' && distSubMode === 'point-line' && distPointLine && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-sans text-slate-400">
                  Fórmula: d(P₁, L) = ‖P₀P₁⃗ × d⃗‖ / ‖d⃗‖
                </div>
                <div className="text-amber-300 font-bold text-sm">
                  d(P₁, L) = {formatNum(distPointLine.distance, 3)} unidades
                </div>
                <div className="pt-1 border-t border-slate-800 text-emerald-300">
                  Proyección Ortogonal Q ∈ L ={' '}
                  {formatVector(distPointLine.closestPoint, isR2, 2)}
                </div>
                <div className="text-slate-400 text-[11px]">
                  Vector perpendicular QP₁⃗ ={' '}
                  {formatVector(distPointLine.perpVector, isR2, 2)}
                </div>
              </div>
            </div>
          )}

          {mode === 'distances' && distSubMode === 'point-plane' && distPointPlane && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-sans text-slate-400">
                  Fórmula: d(P₁, π) = |Ax₁ + By₁ + Cz₁ + D| / √(A² + B² + C²)
                </div>
                <div className="text-slate-300">
                  |({formatNum(distPointPlane.signedEvaluation, 2)})| /{' '}
                  {formatNum(vectorNorm(planeNormal), 2)}
                </div>
                <div className="text-amber-300 font-bold text-sm pt-1 border-t border-slate-800">
                  d(P₁, π) = {formatNum(distPointPlane.distance, 3)} unidades
                </div>
                <div className="text-emerald-300">
                  Pie de la perpendicular Q ∈ π ={' '}
                  {formatVector(distPointPlane.closestPoint, false, 2)}
                </div>
              </div>
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-[11px] font-sans text-indigo-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              Podés rotar la cámara en ℝ³ para observar cómo el vector normal{' '}
              <code className="text-rose-300">n⃗</code> es perpendicular a cualquier
              vector contenido en el plano <code className="text-indigo-300">π</code>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
