import React, { useState, useMemo } from 'react';
import { Line } from '@react-three/drei';
import {
  Sliders,
  Calculator,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Grid as GridIcon,
} from 'lucide-react';
import type { DimensionMode, Vector3Tuple } from '../types/curriculum';
import {
  formatNum,
  formatVector,
  formatPlaneEquation,
  vectorAdd,
  vectorScale,
  vectorCross,
  vectorDot,
  vectorNorm,
  matrixDeterminant,
  matrixInverse,
  pointToPlaneDistance,
  type Matrix3x3,
} from '../utils/mathUtils';
import { Scene3D } from '../components/canvas/Scene3D';
import { Vector3DObject } from '../components/canvas/Vector3DObject';
import {
  InfiniteLine3D,
  Plane3DObject,
  DistanceSegment3D,
} from '../components/canvas/LineAndPlanePrimitives';

type Unit6Tab = 'linear-combo' | 'span-subspace' | 'change-of-basis';

interface BasisGrid2DProps {
  b1: Vector3Tuple;
  b2: Vector3Tuple;
  range?: number;
  color?: string;
}

/**
 * Renderiza la grilla oblicua generada por la base B = {b1, b2}
 */
const BasisGrid2D: React.FC<BasisGrid2DProps> = ({
  b1,
  b2,
  range = 5,
  color = '#a855f7',
}) => {
  const lines = useMemo(() => {
    const detVal = b1[0] * b2[1] - b1[1] * b2[0];
    if (Math.abs(detVal) < 1e-5) return [];

    const segs: [Vector3Tuple, Vector3Tuple][] = [];
    for (let i = -range; i <= range; i++) {
      // Rectas paralelas a b1 desplazadas por i*b2
      const start1 = vectorAdd(vectorScale(b2, i), vectorScale(b1, -range));
      const end1 = vectorAdd(vectorScale(b2, i), vectorScale(b1, range));
      segs.push([start1, end1]);

      // Rectas paralelas a b2 desplazadas por i*b1
      const start2 = vectorAdd(vectorScale(b1, i), vectorScale(b2, -range));
      const end2 = vectorAdd(vectorScale(b1, i), vectorScale(b2, range));
      segs.push([start2, end2]);
    }
    return segs;
  }, [b1, b2, range]);

  return (
    <group>
      {lines.map((pair, idx) => (
        <Line
          key={idx}
          points={pair}
          color={color}
          lineWidth={1.1}
          transparent
          opacity={0.35}
        />
      ))}
    </group>
  );
};

export const Unit6VectorSpaces: React.FC = () => {
  const [dimension, setDimension] = useState<DimensionMode>('R3');
  const [tab, setTab] = useState<Unit6Tab>('linear-combo');

  // Vectores generadores / de la base v1, v2, v3
  const [vecV1, setVecV1] = useState<Vector3Tuple>([2, 1, 0.5]);
  const [vecV2, setVecV2] = useState<Vector3Tuple>([-1, 2, 1]);
  const [vecV3, setVecV3] = useState<Vector3Tuple>([0.5, -1, 2.5]);

  // Escalares c1, c2, c3 para la Combinación Lineal
  const [scalarC1, setScalarC1] = useState<number>(1.5);
  const [scalarC2, setScalarC2] = useState<number>(1.0);
  const [scalarC3, setScalarC3] = useState<number>(0.8);
  const [showPolygonalChain, setShowPolygonalChain] = useState<boolean>(true);

  // Vector de prueba u para pertenencia al Span o para Cambio de Base
  const [testVecU, setTestVecU] = useState<Vector3Tuple>([1, 3, 1.5]);
  const [showObliqueGrid, setShowObliqueGrid] = useState<boolean>(true);

  const isR2 = dimension === 'R2';

  const effV1: Vector3Tuple = useMemo(
    () => (isR2 ? [vecV1[0], vecV1[1], 0] : vecV1),
    [vecV1, isR2]
  );
  const effV2: Vector3Tuple = useMemo(
    () => (isR2 ? [vecV2[0], vecV2[1], 0] : vecV2),
    [vecV2, isR2]
  );
  const effV3: Vector3Tuple = useMemo(
    () => (isR2 ? [0, 0, 1] : vecV3),
    [vecV3, isR2]
  );
  const effTestU: Vector3Tuple = useMemo(
    () => (isR2 ? [testVecU[0], testVecU[1], 0] : testVecU),
    [testVecU, isR2]
  );

  // Matriz cuyas columnas son los vectores generadores P = [v1 v2 v3]
  const basisMatrix: Matrix3x3 = useMemo(
    () => [
      [effV1[0], effV2[0], effV3[0]],
      [effV1[1], effV2[1], effV3[1]],
      [effV1[2], effV2[2], effV3[2]],
    ],
    [effV1, effV2, effV3]
  );

  const detBasis = useMemo(
    () => matrixDeterminant(basisMatrix, isR2),
    [basisMatrix, isR2]
  );
  const isLinearlyIndependent = Math.abs(detBasis) > 1e-6;

  // 1. Cálculo de la Combinación Lineal w = c1*v1 + c2*v2 (+ c3*v3)
  const scaledV1 = useMemo(
    () => vectorScale(effV1, scalarC1),
    [effV1, scalarC1]
  );
  const scaledV2 = useMemo(
    () => vectorScale(effV2, scalarC2),
    [effV2, scalarC2]
  );
  const scaledV3 = useMemo(
    () => (isR2 ? ([0, 0, 0] as Vector3Tuple) : vectorScale(effV3, scalarC3)),
    [effV3, scalarC3, isR2]
  );

  const partialSum12 = useMemo(
    () => vectorAdd(scaledV1, scaledV2),
    [scaledV1, scaledV2]
  );
  const linearComboW = useMemo(
    () => vectorAdd(partialSum12, scaledV3),
    [partialSum12, scaledV3]
  );

  // 2. Análisis del Subespacio Generado S = gen{v1, v2}
  const spanAnalysis = useMemo(() => {
    const norm1 = vectorNorm(effV1);
    const norm2 = vectorNorm(effV2);
    const cross12 = vectorCross(effV1, effV2);
    const crossNorm = vectorNorm(cross12);

    let spanDim = 2;
    if (norm1 < 1e-6 && norm2 < 1e-6) {
      spanDim = 0;
    } else if (crossNorm < 1e-6) {
      spanDim = 1;
    }

    // Distancia del vector de prueba effTestU al plano gen{v1, v2} en R3
    let belongsToSpan = false;
    let distToSpan = 0;
    let projectedOnSpan: Vector3Tuple = effTestU;
    let coordsAlpha: [number, number] | null = null;

    if (spanDim === 2) {
      if (isR2) {
        belongsToSpan = true;
        // Resolver [v1 v2] * [a1; a2] = u
        const det2 = effV1[0] * effV2[1] - effV1[1] * effV2[0];
        const a1 = (effTestU[0] * effV2[1] - effTestU[1] * effV2[0]) / det2;
        const a2 = (effV1[0] * effTestU[1] - effV1[1] * effTestU[0]) / det2;
        coordsAlpha = [a1, a2];
      } else {
        const ptPlane = pointToPlaneDistance(effTestU, cross12, 0);
        distToSpan = ptPlane ? ptPlane.distance : 0;
        projectedOnSpan = ptPlane ? ptPlane.closestPoint : effTestU;
        belongsToSpan = distToSpan < 1e-4;

        // Coordenadas de la proyección sobre la base {v1, v2} usando mínimos cuadrados (Gram matrix)
        const v1v1 = vectorDot(effV1, effV1);
        const v1v2 = vectorDot(effV1, effV2);
        const v2v2 = vectorDot(effV2, effV2);
        const u_v1 = vectorDot(projectedOnSpan, effV1);
        const u_v2 = vectorDot(projectedOnSpan, effV2);
        const gramDet = v1v1 * v2v2 - v1v2 * v1v2;
        if (Math.abs(gramDet) > 1e-7) {
          const a1 = (u_v1 * v2v2 - u_v2 * v1v2) / gramDet;
          const a2 = (v1v1 * u_v2 - v1v2 * u_v1) / gramDet;
          coordsAlpha = [a1, a2];
        }
      }
    }

    return {
      spanDim,
      normal: cross12,
      belongsToSpan,
      distToSpan,
      projectedOnSpan,
      coordsAlpha,
    };
  }, [effV1, effV2, effTestU, isR2]);

  // 3. Análisis de Cambio de Base: [x]_B = P^(-1) * [x]_C
  const changeOfBasisData = useMemo(() => {
    const invRes = matrixInverse(basisMatrix, isR2);
    if (!invRes.invertible || !invRes.inverse) {
      return {
        isBasis: false,
        invMatrix: null,
        coordsInB: null as Vector3Tuple | null,
      };
    }
    const invM = invRes.inverse;
    const c1 =
      invM[0][0] * effTestU[0] +
      invM[0][1] * effTestU[1] +
      (isR2 ? 0 : invM[0][2] * effTestU[2]);
    const c2 =
      invM[1][0] * effTestU[0] +
      invM[1][1] * effTestU[1] +
      (isR2 ? 0 : invM[1][2] * effTestU[2]);
    const c3 = isR2
      ? 0
      : invM[2][0] * effTestU[0] +
        invM[2][1] * effTestU[1] +
        invM[2][2] * effTestU[2];

    return {
      isBasis: true,
      invMatrix: invM,
      coordsInB: [c1, c2, c3] as Vector3Tuple,
    };
  }, [basisMatrix, isR2, effTestU]);

  const applyPreset = (type: 'independent' | 'dependent') => {
    if (type === 'independent') {
      setVecV1([2, 1, 0.5]);
      setVecV2([-1, 2, 1]);
      setVecV3([0.5, -1, 2.5]);
    } else {
      // v2 = 2 * v1 (Colineales)
      setVecV1([1.5, 1, 0.5]);
      setVecV2([3, 2, 1]);
      setVecV3([4.5, 3, 1.5]);
    }
  };

  const legendItems = useMemo(() => {
    if (tab === 'linear-combo') {
      const items = [
        { color: '#38bdf8', label: 'c₁·v⃗₁', value: formatVector(scaledV1, isR2, 1) },
        { color: '#34d399', label: 'c₂·v⃗₂', value: formatVector(scaledV2, isR2, 1) },
      ];
      if (!isR2) {
        items.push({
          color: '#fb923c',
          label: 'c₃·v⃗₃',
          value: formatVector(scaledV3, false, 1),
        });
      }
      items.push({
        color: '#facc15',
        label: 'Resultado w⃗',
        value: formatVector(linearComboW, isR2, 2),
      });
      return items;
    }

    if (tab === 'span-subspace') {
      return [
        { color: '#38bdf8', label: 'Generador v⃗₁' },
        { color: '#34d399', label: 'Generador v⃗₂' },
        {
          color: '#6366f1',
          label: `Span S (dim = ${spanAnalysis.spanDim})`,
        },
        {
          color: spanAnalysis.belongsToSpan ? '#10b981' : '#f43f5e',
          label: spanAnalysis.belongsToSpan ? 'u⃗ ∈ Span' : 'u⃗ ∉ Span',
          value: formatVector(effTestU, isR2, 1),
        },
      ];
    }

    return [
      { color: '#38bdf8', label: 'Base b⃗₁' },
      { color: '#34d399', label: 'Base b⃗₂' },
      {
        color: '#facc15',
        label: 'Vector x⃗',
        value: changeOfBasisData.coordsInB
          ? `[x⃗]_B = ${formatVector(changeOfBasisData.coordsInB, isR2, 2)}`
          : 'No es base',
      },
    ];
  }, [
    tab,
    scaledV1,
    scaledV2,
    scaledV3,
    linearComboW,
    isR2,
    spanAnalysis,
    effTestU,
    changeOfBasisData,
  ]);

  const updateAxis = (
    current: Vector3Tuple,
    setter: (v: Vector3Tuple) => void,
    idx: 0 | 1 | 2,
    raw: string
  ) => {
    const parsed = parseFloat(raw);
    const num = Number.isNaN(parsed) ? 0 : Math.max(-8, Math.min(8, parsed));
    const next: Vector3Tuple = [...current] as Vector3Tuple;
    next[idx] = num;
    setter(next);
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">
      {/* ESCENA 3D / 2D */}
      <div className="flex-1 flex flex-col h-[52vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Barra superior */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 z-20">
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'linear-combo', label: '1. Combinación e Indep. Lineal' },
              { id: 'span-subspace', label: '2. Subespacio Generado (Span)' },
              { id: 'change-of-basis', label: '3. Cambio de Base ([x⃗]_B)' },
            ].map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id as Unit6Tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Espacio:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
              <button
                type="button"
                onClick={() => setDimension('R2')}
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
                onClick={() => setDimension('R3')}
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

        {/* Lienzo 3D / 2D */}
        <div className="flex-1 relative">
          <Scene3D dimension={dimension} legendItems={legendItems}>
            {/* MODO 1: COMBINACIÓN LINEAL E INDEPENDENCIA LINEAL */}
            {tab === 'linear-combo' && (
              <>
                {/* Vectores base originales suaves */}
                <Vector3DObject
                  vector={effV1}
                  color="#38bdf8"
                  label="v⃗₁"
                  opacity={0.45}
                  lineWidth={2}
                  isR2={isR2}
                />
                <Vector3DObject
                  vector={effV2}
                  color="#34d399"
                  label="v⃗₂"
                  opacity={0.45}
                  lineWidth={2}
                  isR2={isR2}
                />
                {!isR2 && (
                  <Vector3DObject
                    vector={effV3}
                    color="#fb923c"
                    label="v⃗₃"
                    opacity={0.45}
                    lineWidth={2}
                  />
                )}

                {/* Camino poligonal punta con cola de la combinación lineal */}
                <Vector3DObject
                  origin={[0, 0, 0]}
                  vector={scaledV1}
                  color="#38bdf8"
                  label={`${formatNum(scalarC1, 1)}·v⃗₁`}
                  lineWidth={3.5}
                  isR2={isR2}
                />

                {showPolygonalChain ? (
                  <>
                    <Vector3DObject
                      origin={scaledV1}
                      vector={scaledV2}
                      color="#34d399"
                      label={`${formatNum(scalarC2, 1)}·v⃗₂`}
                      dashed
                      lineWidth={3}
                      isR2={isR2}
                    />
                    {!isR2 && (
                      <Vector3DObject
                        origin={partialSum12}
                        vector={scaledV3}
                        color="#fb923c"
                        label={`${formatNum(scalarC3, 1)}·v⃗₃`}
                        dashed
                        lineWidth={3}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Vector3DObject
                      origin={[0, 0, 0]}
                      vector={scaledV2}
                      color="#34d399"
                      label={`${formatNum(scalarC2, 1)}·v⃗₂`}
                      lineWidth={3.5}
                      isR2={isR2}
                    />
                    {!isR2 && (
                      <Vector3DObject
                        origin={[0, 0, 0]}
                        vector={scaledV3}
                        color="#fb923c"
                        label={`${formatNum(scalarC3, 1)}·v⃗₃`}
                        lineWidth={3.5}
                      />
                    )}
                  </>
                )}

                {/* Vector resultante de la combinación lineal w */}
                <Vector3DObject
                  vector={linearComboW}
                  color="#facc15"
                  label="w⃗ (Comb. Lineal)"
                  showCoords
                  isR2={isR2}
                  lineWidth={4.5}
                />
              </>
            )}

            {/* MODO 2: SUBESPACIO GENERADO (SPAN) */}
            {tab === 'span-subspace' && (
              <>
                <Vector3DObject
                  vector={effV1}
                  color="#38bdf8"
                  label="v⃗₁"
                  showCoords
                  isR2={isR2}
                  lineWidth={3.8}
                />
                <Vector3DObject
                  vector={effV2}
                  color="#34d399"
                  label="v⃗₂"
                  showCoords
                  isR2={isR2}
                  lineWidth={3.8}
                />

                {/* Visualización geométrica del Span{v1, v2} */}
                {spanAnalysis.spanDim === 2 && !isR2 && (
                  <Plane3DObject
                    normal={spanAnalysis.normal}
                    dTerm={0}
                    color="#6366f1"
                    opacity={0.3}
                    size={13}
                    label="Span{v⃗₁, v⃗₂} (Plano por el origen)"
                    showNormalVector={false}
                  />
                )}

                {spanAnalysis.spanDim === 2 && isR2 && (
                  <BasisGrid2D b1={effV1} b2={effV2} color="#6366f1" />
                )}

                {spanAnalysis.spanDim === 1 && (
                  <InfiniteLine3D
                    point={[0, 0, 0]}
                    direction={
                      vectorNorm(effV1) > 1e-5 ? effV1 : effV2
                    }
                    color="#f59e0b"
                    label="Span{v⃗₁, v⃗₂} (Colapsa a Recta dim=1)"
                    showPoint={false}
                    showDirectionVector={false}
                    lineWidth={4}
                    isR2={isR2}
                  />
                )}

                {/* Vector de prueba u y su distancia al subespacio */}
                <Vector3DObject
                  vector={effTestU}
                  color={spanAnalysis.belongsToSpan ? '#10b981' : '#f43f5e'}
                  label={
                    spanAnalysis.belongsToSpan ? 'u⃗ ∈ Span' : 'u⃗ ∉ Span'
                  }
                  showCoords
                  isR2={isR2}
                  lineWidth={4}
                />

                {!spanAnalysis.belongsToSpan && spanAnalysis.spanDim === 2 && (
                  <>
                    <Vector3DObject
                      vector={spanAnalysis.projectedOnSpan}
                      color="#10b981"
                      label="proy_S(u⃗)"
                      dashed
                      lineWidth={2.5}
                    />
                    <DistanceSegment3D
                      from={spanAnalysis.projectedOnSpan}
                      to={effTestU}
                      distance={spanAnalysis.distToSpan}
                      labelPrefix="d(u⃗, Span)"
                    />
                  </>
                )}
              </>
            )}

            {/* MODO 3: CAMBIO DE BASE Y GRILLA OBLICUA */}
            {tab === 'change-of-basis' && (
              <>
                {showObliqueGrid && (
                  <BasisGrid2D b1={effV1} b2={effV2} color="#a855f7" />
                )}

                <Vector3DObject
                  vector={effV1}
                  color="#38bdf8"
                  label="b⃗₁"
                  showCoords
                  isR2={isR2}
                  lineWidth={3.8}
                />
                <Vector3DObject
                  vector={effV2}
                  color="#34d399"
                  label="b⃗₂"
                  showCoords
                  isR2={isR2}
                  lineWidth={3.8}
                />
                {!isR2 && (
                  <Vector3DObject
                    vector={effV3}
                    color="#fb923c"
                    label="b⃗₃"
                    showCoords
                    lineWidth={3.8}
                  />
                )}

                {/* Vector x y sus componentes en la nueva base B */}
                <Vector3DObject
                  vector={effTestU}
                  color="#facc15"
                  label="x⃗"
                  showCoords
                  isR2={isR2}
                  lineWidth={4.5}
                />

                {changeOfBasisData.isBasis && changeOfBasisData.coordsInB && (
                  <>
                    <Vector3DObject
                      origin={[0, 0, 0]}
                      vector={vectorScale(effV1, changeOfBasisData.coordsInB[0])}
                      color="#38bdf8"
                      label={`${formatNum(changeOfBasisData.coordsInB[0], 2)}·b⃗₁`}
                      dashed
                      lineWidth={2.5}
                      isR2={isR2}
                    />
                    <Vector3DObject
                      origin={vectorScale(effV1, changeOfBasisData.coordsInB[0])}
                      vector={vectorScale(effV2, changeOfBasisData.coordsInB[1])}
                      color="#34d399"
                      label={`${formatNum(changeOfBasisData.coordsInB[1], 2)}·b⃗₂`}
                      dashed
                      lineWidth={2.5}
                      isR2={isR2}
                    />
                  </>
                )}
              </>
            )}
          </Scene3D>
        </div>
      </div>

      {/* PANEL DERECHO: CONTROLES Y RESULTADOS */}
      <div className="w-full lg:w-[450px] xl:w-[495px] h-[48vh] lg:h-full bg-slate-950 flex flex-col overflow-y-auto shrink-0">
        {/* 1. Controles de los Vectores Generadores / Base */}
        <div className="p-4 border-b border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              {tab === 'change-of-basis'
                ? 'Vectores de la Base B = {b⃗₁, b⃗₂, ...}'
                : 'Conjunto Generador {v⃗₁, v⃗₂, ...}'}
            </h2>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyPreset('independent')}
                className="px-2 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-300"
              >
                Cargar LI (Base)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('dependent')}
                className="px-2 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300"
              >
                Cargar LD (Colineales)
              </button>
            </div>
          </div>

          {/* Editor compacto de v1, v2, v3 */}
          <div className="space-y-2">
            {[
              {
                label: tab === 'change-of-basis' ? 'b⃗₁' : 'v⃗₁',
                color: '#38bdf8',
                vec: effV1,
                rawVec: vecV1,
                setter: setVecV1,
                scalar: scalarC1,
                setScalar: setScalarC1,
                sLabel: 'c₁',
              },
              {
                label: tab === 'change-of-basis' ? 'b⃗₂' : 'v⃗₂',
                color: '#34d399',
                vec: effV2,
                rawVec: vecV2,
                setter: setVecV2,
                scalar: scalarC2,
                setScalar: setScalarC2,
                sLabel: 'c₂',
              },
              ...(!isR2 && tab !== 'span-subspace'
                ? [
                    {
                      label: tab === 'change-of-basis' ? 'b⃗₃' : 'v⃗₃',
                      color: '#fb923c',
                      vec: effV3,
                      rawVec: vecV3,
                      setter: setVecV3,
                      scalar: scalarC3,
                      setScalar: setScalarC3,
                      sLabel: 'c₃',
                    },
                  ]
                : []),
            ].map((item) => (
              <div
                key={item.label}
                className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="font-mono text-xs font-bold"
                    style={{ color: item.color }}
                  >
                    {item.label} = {formatVector(item.vec, isR2, 1)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {([0, 1, ...(isR2 ? [] : [2])] as (0 | 1 | 2)[]).map((ax) => (
                      <input
                        key={ax}
                        type="number"
                        step={0.5}
                        value={item.rawVec[ax]}
                        onChange={(e) =>
                          updateAxis(item.rawVec, item.setter, ax, e.target.value)
                        }
                        className="w-14 px-1.5 py-0.5 text-right font-mono text-xs rounded bg-slate-950 border border-slate-800 text-white"
                      />
                    ))}
                  </div>
                </div>

                {tab === 'linear-combo' && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/70">
                    <span className="font-mono text-[11px] text-amber-300 w-20">
                      {item.sLabel} = {formatNum(item.scalar, 1)}
                    </span>
                    <input
                      type="range"
                      min={-3}
                      max={3}
                      step={0.1}
                      value={item.scalar}
                      onChange={(e) =>
                        item.setScalar(parseFloat(e.target.value))
                      }
                      className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {tab === 'linear-combo' && (
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showPolygonalChain}
                onChange={(e) => setShowPolygonalChain(e.target.checked)}
                className="accent-indigo-500 rounded"
              />
              <span>
                Mostrar suma poligonal (punta con cola) hacia w⃗
              </span>
            </label>
          )}

          {/* Control del vector u/x en pestañas 2 y 3 */}
          {(tab === 'span-subspace' || tab === 'change-of-basis') && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-yellow-300">
                  {tab === 'span-subspace'
                    ? 'Vector de Prueba u⃗'
                    : 'Vector x⃗ (en Base Canónica)'}
                </span>
                {tab === 'span-subspace' && !spanAnalysis.belongsToSpan && (
                  <button
                    type="button"
                    onClick={() => setTestVecU(spanAnalysis.projectedOnSpan)}
                    className="px-2 py-0.5 rounded bg-emerald-600/25 border border-emerald-500/40 text-[10px] font-semibold text-emerald-300"
                  >
                    Proyectar u⃗ al Span
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {([0, 1, ...(isR2 ? [] : [2])] as (0 | 1 | 2)[]).map((ax) => (
                  <div key={ax} className="flex items-center gap-1">
                    <span className="font-mono text-[11px] text-slate-400">
                      {ax === 0 ? 'X:' : ax === 1 ? 'Y:' : 'Z:'}
                    </span>
                    <input
                      type="number"
                      step={0.5}
                      value={testVecU[ax]}
                      onChange={(e) =>
                        updateAxis(testVecU, setTestVecU, ax, e.target.value)
                      }
                      className="w-full px-2 py-1 text-right font-mono text-xs rounded bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                ))}
              </div>

              {tab === 'change-of-basis' && (
                <label className="flex items-center gap-2 text-xs text-slate-300 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showObliqueGrid}
                    onChange={(e) => setShowObliqueGrid(e.target.checked)}
                    className="accent-purple-500 rounded"
                  />
                  <GridIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span>Superponer grilla oblicua de la Base B</span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* 2. Resultados Analíticos */}
        <div className="p-4 space-y-3 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            Análisis de Espacio Vectorial
          </h3>

          {/* Badge de Independencia Lineal */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
              isLinearlyIndependent
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            }`}
          >
            {isLinearlyIndependent ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold">
                {isLinearlyIndependent
                  ? `Conjunto Linealmente Independiente (LI) — Forma Base de ${
                      isR2 ? 'ℝ²' : 'ℝ³'
                    }`
                  : 'Conjunto Linealmente Dependiente (LD) — No es Base'}
              </div>
              <div className="font-mono text-[11px] opacity-90">
                det([v⃗₁ v⃗₂ {!isR2 ? 'v⃗₃' : ''}]) = {formatNum(detBasis, 3)}{' '}
                {isLinearlyIndependent ? '≠ 0' : '= 0'}
              </div>
            </div>
          </div>

          {tab === 'linear-combo' && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-1.5">
              <div className="text-[11px] font-sans text-slate-400">
                Fórmula de la Combinación Lineal
              </div>
              <div className="text-slate-200">
                w⃗ = ({formatNum(scalarC1, 1)}){formatVector(effV1, isR2, 1)} + (
                {formatNum(scalarC2, 1)}){formatVector(effV2, isR2, 1)}
                {!isR2 &&
                  ` + (${formatNum(scalarC3, 1)})${formatVector(effV3, false, 1)}`}
              </div>
              <div className="text-sm font-bold text-yellow-300 pt-1 border-t border-slate-800">
                w⃗ = {formatVector(linearComboW, isR2, 2)}
              </div>
            </div>
          )}

          {tab === 'span-subspace' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  Subespacio Generado S = gen&#123;v⃗₁, v⃗₂&#125;
                </div>
                <div className="text-indigo-300 font-bold">
                  dim(S) = {spanAnalysis.spanDim} (
                  {spanAnalysis.spanDim === 2
                    ? isR2
                      ? 'Todo el plano ℝ²'
                      : 'Plano por el origen en ℝ³'
                    : spanAnalysis.spanDim === 1
                    ? 'Recta por el origen'
                    : 'Subespacio trivial {0⃗}'}
                  )
                </div>
                {!isR2 && spanAnalysis.spanDim === 2 && (
                  <div className="text-slate-300">
                    Ecuación implícita de S:{' '}
                    {formatPlaneEquation(spanAnalysis.normal, 0)}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] font-sans text-slate-400">
                  Condición de Pertenencia de u⃗ a S
                </div>
                {spanAnalysis.belongsToSpan && spanAnalysis.coordsAlpha ? (
                  <div className="text-emerald-300 font-bold">
                    u⃗ ∈ S: u⃗ = ({formatNum(spanAnalysis.coordsAlpha[0], 2)})·v⃗₁ + (
                    {formatNum(spanAnalysis.coordsAlpha[1], 2)})·v⃗₂
                  </div>
                ) : (
                  <div className="text-rose-300">
                    u⃗ ∉ S (Distancia al subespacio ={' '}
                    {formatNum(spanAnalysis.distToSpan, 3)} u)
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'change-of-basis' && (
            <div className="space-y-2.5 font-mono text-xs">
              {changeOfBasisData.isBasis && changeOfBasisData.coordsInB ? (
                <>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="text-[11px] font-sans text-slate-400">
                      Coordenadas del Vector x⃗ en la Nueva Base B
                    </div>
                    <div className="text-slate-300">
                      [x⃗]_C (Canónica) = {formatVector(effTestU, isR2, 2)}
                    </div>
                    <div className="text-yellow-300 font-bold text-sm pt-1 border-t border-slate-800">
                      [x⃗]_B = P⁻¹ · [x⃗]_C ={' '}
                      {formatVector(changeOfBasisData.coordsInB, isR2, 3)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/30 text-[11px] font-sans text-purple-200 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Invarianza Geométrica:</strong> El vector geométrico{' '}
                      <code>x⃗</code> en el espacio es el mismo; lo que cambia son
                      sus coordenadas medidas sobre la grilla oblicua de la base{' '}
                      <code>B</code>.
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 font-sans text-xs">
                  Los vectores son linealmente dependientes (det = 0), por lo que
                  no constituyen una base válida y la matriz de pasaje P no es
                  invertible.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
