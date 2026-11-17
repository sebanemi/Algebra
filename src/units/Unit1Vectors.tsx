import React, { useState, useMemo } from 'react';
import { Line } from '@react-three/drei';
import {
  Sliders,
  Calculator,
  Layers,
  Sparkles,
  Info,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import type {
  DimensionMode,
  Vector3Tuple,
  VectorOperationMode,
} from '../types/curriculum';
import {
  formatNum,
  formatVector,
  vectorAdd,
  vectorSubtract,
  vectorScale,
  vectorDot,
  vectorAngle,
  vectorProjection,
  vectorCross,
  vectorMixedProduct,
  vectorNorm,
} from '../utils/mathUtils';
import { Scene3D } from '../components/canvas/Scene3D';
import { Vector3DObject } from '../components/canvas/Vector3DObject';
import {
  Parallelogram3D,
  AngleArc3D,
  Parallelepiped3D,
} from '../components/canvas/GeometryPrimitives';

interface VectorControlCardProps {
  name: string;
  symbol: string;
  color: string;
  value: Vector3Tuple;
  onChange: (next: Vector3Tuple) => void;
  dimension: DimensionMode;
  visible: boolean;
  onToggleVisible: () => void;
  normValue: number;
}

const VectorControlCard: React.FC<VectorControlCardProps> = ({
  name,
  symbol,
  color,
  value,
  onChange,
  dimension,
  visible,
  onToggleVisible,
  normValue,
}) => {
  const axes: { label: 'X' | 'Y' | 'Z'; index: 0 | 1 | 2; badgeColor: string }[] =
    dimension === 'R2'
      ? [
          { label: 'X', index: 0, badgeColor: 'text-rose-400 border-rose-500/40' },
          { label: 'Y', index: 1, badgeColor: 'text-emerald-400 border-emerald-500/40' },
        ]
      : [
          { label: 'X', index: 0, badgeColor: 'text-rose-400 border-rose-500/40' },
          { label: 'Y', index: 1, badgeColor: 'text-emerald-400 border-emerald-500/40' },
          { label: 'Z', index: 2, badgeColor: 'text-sky-400 border-sky-500/40' },
        ];

  const handleAxisChange = (idx: 0 | 1 | 2, raw: string) => {
    const parsed = parseFloat(raw);
    const num = Number.isNaN(parsed) ? 0 : Math.max(-10, Math.min(10, parsed));
    const next: Vector3Tuple = [...value] as Vector3Tuple;
    next[idx] = num;
    onChange(next);
  };

  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
          />
          <span className="font-mono font-bold text-sm text-white">{symbol}</span>
          <span className="text-xs text-slate-400">({name})</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
            ‖{symbol}‖ = {formatNum(normValue, 2)}
          </span>
          <button
            type="button"
            onClick={onToggleVisible}
            title={visible ? 'Ocultar vector' : 'Mostrar vector'}
            className={`p-1 rounded-md border transition-colors ${
              visible
                ? 'bg-slate-800/90 border-slate-700 text-slate-200'
                : 'bg-slate-950 border-slate-800 text-slate-600'
            }`}
          >
            {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {axes.map(({ label, index, badgeColor }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`w-6 text-center font-mono text-[11px] font-bold rounded bg-slate-950 py-0.5 border ${badgeColor}`}
            >
              {label}
            </span>
            <input
              type="range"
              min={-8}
              max={8}
              step={0.5}
              value={value[index]}
              onChange={(e) => handleAxisChange(index, e.target.value)}
              className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <input
              type="number"
              min={-10}
              max={10}
              step={0.5}
              value={value[index]}
              onChange={(e) => handleAxisChange(index, e.target.value)}
              className="w-16 px-2 py-1 text-right font-mono text-xs rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const OPERATION_TABS: {
  id: VectorOperationMode;
  label: string;
  shortDesc: string;
  requiresR3?: boolean;
}[] = [
  {
    id: 'add-sub',
    label: 'Suma y Resta',
    shortDesc: 'Regla del paralelogramo y diferencia vectorial',
  },
  {
    id: 'scalar-mult',
    label: 'Escalar k·u⃗',
    shortDesc: 'Dilatación, contracción e inversión de sentido',
  },
  {
    id: 'dot-product',
    label: 'Prod. Escalar',
    shortDesc: 'Ángulo θ entre vectores y proyección ortogonal',
  },
  {
    id: 'cross-product',
    label: 'Prod. Vectorial',
    shortDesc: 'Vector perpendicular u⃗ × v⃗ y área del paralelogramo (ℝ³)',
    requiresR3: true,
  },
  {
    id: 'mixed-product',
    label: 'Prod. Mixto',
    shortDesc: 'Paralelepípedo [u⃗, v⃗, w⃗] y volumen en ℝ³',
    requiresR3: true,
  },
];

export const Unit1Vectors: React.FC = () => {
  const [dimension, setDimension] = useState<DimensionMode>('R3');
  const [operation, setOperation] = useState<VectorOperationMode>('add-sub');

  // Estado de los 3 vectores principales u, v, w
  const [vecU, setVecU] = useState<Vector3Tuple>([3, 1, 2]);
  const [vecV, setVecV] = useState<Vector3Tuple>([1, 3.5, 1]);
  const [vecW, setVecW] = useState<Vector3Tuple>([-1.5, 1, 3.5]);

  // Visibilidad individual
  const [showU, setShowU] = useState(true);
  const [showV, setShowV] = useState(true);
  const [showW, setShowW] = useState(true);

  // Controles específicos por operación
  const [showSum, setShowSum] = useState(true);
  const [showDiff, setShowDiff] = useState(false);
  const [showParallelogramRule, setShowParallelogramRule] = useState(true);

  const [scalarK, setScalarK] = useState<number>(1.8);
  const [scalarTarget, setScalarTarget] = useState<'u' | 'v' | 'w'>('u');

  const [showAuxCrossInMixed, setShowAuxCrossInMixed] = useState(true);

  // Vectores efectivos según dimensión (en R2 la componente Z es 0)
  const effectiveU: Vector3Tuple = useMemo(
    () => (dimension === 'R2' ? [vecU[0], vecU[1], 0] : vecU),
    [vecU, dimension]
  );
  const effectiveV: Vector3Tuple = useMemo(
    () => (dimension === 'R2' ? [vecV[0], vecV[1], 0] : vecV),
    [vecV, dimension]
  );
  const effectiveW: Vector3Tuple = useMemo(
    () => (dimension === 'R2' ? [vecW[0], vecW[1], 0] : vecW),
    [vecW, dimension]
  );

  // Cambio de dimensión R2 / R3
  const handleDimensionChange = (mode: DimensionMode) => {
    setDimension(mode);
    if (
      mode === 'R2' &&
      (operation === 'cross-product' || operation === 'mixed-product')
    ) {
      setOperation('add-sub');
    }
  };

  // Selección de operación (si requiere R3, cambia automáticamente a R3)
  const handleOperationSelect = (op: VectorOperationMode) => {
    setOperation(op);
    if (
      (op === 'cross-product' || op === 'mixed-product') &&
      dimension === 'R2'
    ) {
      setDimension('R3');
    }
  };

  // Presets educativos rápidos
  const applyPreset = (preset: 'default' | 'canonical' | 'orthogonal' | 'coplanar') => {
    if (preset === 'default') {
      setVecU([3, 1, 2]);
      setVecV([1, 3.5, 1]);
      setVecW([-1.5, 1, 3.5]);
    } else if (preset === 'canonical') {
      setVecU([3, 0, 0]);
      setVecV([0, 3, 0]);
      setVecW([0, 0, 3]);
    } else if (preset === 'orthogonal') {
      setVecU([3, 2, 0]);
      setVecV([-2, 3, 0]);
      setVecW([0, 0, 3]);
    } else if (preset === 'coplanar') {
      setVecU([3, 1, 1]);
      setVecV([1, 3, 1]);
      setVecW([4, 4, 2]); // u + v -> determinante 0
    }
  };

  // Cálculos matemáticos en tiempo real con mathjs
  const normU = useMemo(() => vectorNorm(effectiveU), [effectiveU]);
  const normV = useMemo(() => vectorNorm(effectiveV), [effectiveV]);
  const normW = useMemo(() => vectorNorm(effectiveW), [effectiveW]);

  const sumUV = useMemo(
    () => vectorAdd(effectiveU, effectiveV),
    [effectiveU, effectiveV]
  );
  const diffUV = useMemo(
    () => vectorSubtract(effectiveU, effectiveV),
    [effectiveU, effectiveV]
  );

  const selectedBaseVec =
    scalarTarget === 'u'
      ? effectiveU
      : scalarTarget === 'v'
      ? effectiveV
      : effectiveW;
  const scaledVector = useMemo(
    () => vectorScale(selectedBaseVec, scalarK),
    [selectedBaseVec, scalarK]
  );

  const dotUV = useMemo(
    () => vectorDot(effectiveU, effectiveV),
    [effectiveU, effectiveV]
  );
  const angleUV = useMemo(
    () => vectorAngle(effectiveU, effectiveV),
    [effectiveU, effectiveV]
  );
  const projUonV = useMemo(
    () => vectorProjection(effectiveU, effectiveV),
    [effectiveU, effectiveV]
  );

  const crossUV = useMemo(
    () => vectorCross(effectiveU, effectiveV),
    [effectiveU, effectiveV]
  );
  const areaParallelogram = useMemo(() => vectorNorm(crossUV), [crossUV]);

  const mixedUVW = useMemo(
    () => vectorMixedProduct(effectiveU, effectiveV, effectiveW),
    [effectiveU, effectiveV, effectiveW]
  );

  // Leyenda dinámica del canvas 3D
  const isR2 = dimension === 'R2';
  const legendItems = useMemo(() => {
    const items: { color: string; label: string; value?: string }[] = [];
    if (showU) {
      items.push({
        color: '#38bdf8',
        label: 'u⃗',
        value: formatVector(effectiveU, isR2, 1),
      });
    }
    if (showV && operation !== 'scalar-mult') {
      items.push({
        color: '#34d399',
        label: 'v⃗',
        value: formatVector(effectiveV, isR2, 1),
      });
    }
    if (showW && operation === 'mixed-product') {
      items.push({
        color: '#fb923c',
        label: 'w⃗',
        value: formatVector(effectiveW, isR2, 1),
      });
    }
    if (operation === 'add-sub') {
      if (showSum) {
        items.push({
          color: '#facc15',
          label: 'u⃗ + v⃗',
          value: formatVector(sumUV, isR2, 1),
        });
      }
      if (showDiff) {
        items.push({
          color: '#f43f5e',
          label: 'u⃗ - v⃗',
          value: formatVector(diffUV, isR2, 1),
        });
      }
    } else if (operation === 'scalar-mult') {
      items.push({
        color: '#e879f9',
        label: `${formatNum(scalarK, 1)}·${scalarTarget}⃗`,
        value: formatVector(scaledVector, isR2, 1),
      });
    } else if (operation === 'dot-product' && projUonV) {
      items.push({
        color: '#f59e0b',
        label: 'proy_v⃗(u⃗)',
        value: formatVector(projUonV.projectedVector, isR2, 2),
      });
    } else if (operation === 'cross-product') {
      items.push({
        color: '#c084fc',
        label: 'u⃗ × v⃗',
        value: formatVector(crossUV, false, 2),
      });
    } else if (operation === 'mixed-product') {
      items.push({
        color: '#ec4899',
        label: 'Volumen V',
        value: `${formatNum(mixedUVW.volume, 2)} u³`,
      });
    }
    return items;
  }, [
    showU,
    showV,
    showW,
    operation,
    effectiveU,
    effectiveV,
    effectiveW,
    isR2,
    showSum,
    showDiff,
    sumUV,
    diffUV,
    scalarK,
    scalarTarget,
    scaledVector,
    projUonV,
    crossUV,
    mixedUVW,
  ]);

  return (
    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">
      {/* ESCENA 3D INTERACTIVA (Centro / Izquierda) */}
      <div className="flex-1 flex flex-col h-[52vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Barra superior de herramientas de la Unidad 1 */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 z-20">
          {/* Selector de Operaciones */}
          <div className="flex flex-wrap items-center gap-1">
            {OPERATION_TABS.map((tab) => {
              const active = operation === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleOperationSelect(tab.id)}
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

          {/* Toggle de Dimensión R2 / R3 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Espacio:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
              <button
                type="button"
                onClick={() => handleDimensionChange('R2')}
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
                onClick={() => handleDimensionChange('R3')}
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
            {/* Vectores base u, v, w */}
            {showU && (
              <Vector3DObject
                vector={effectiveU}
                color="#38bdf8"
                label="u⃗"
                showCoords
                isR2={isR2}
                lineWidth={3.5}
              />
            )}

            {showV &&
              (operation !== 'scalar-mult' || scalarTarget === 'v') && (
                <Vector3DObject
                  vector={effectiveV}
                  color="#34d399"
                  label="v⃗"
                  showCoords
                  isR2={isR2}
                  lineWidth={3.5}
                />
              )}

            {showW &&
              (operation === 'mixed-product' ||
                (operation === 'scalar-mult' && scalarTarget === 'w')) && (
                <Vector3DObject
                  vector={effectiveW}
                  color="#fb923c"
                  label="w⃗"
                  showCoords
                  isR2={isR2}
                  lineWidth={3.5}
                />
              )}

            {/* 1. OPERACIÓN: SUMA Y RESTA (Regla del Paralelogramo) */}
            {operation === 'add-sub' && (
              <>
                {showParallelogramRule && showSum && (
                  <>
                    <Parallelogram3D
                      u={effectiveU}
                      v={effectiveV}
                      color="#facc15"
                      opacity={0.16}
                      showEdges={false}
                    />
                    {/* v trasladado a la punta de u */}
                    <Vector3DObject
                      origin={effectiveU}
                      vector={effectiveV}
                      color="#34d399"
                      dashed
                      opacity={0.65}
                      lineWidth={2}
                      headScale={0.8}
                    />
                    {/* u trasladado a la punta de v */}
                    <Vector3DObject
                      origin={effectiveV}
                      vector={effectiveU}
                      color="#38bdf8"
                      dashed
                      opacity={0.65}
                      lineWidth={2}
                      headScale={0.8}
                    />
                  </>
                )}

                {showSum && (
                  <Vector3DObject
                    vector={sumUV}
                    color="#facc15"
                    label="u⃗ + v⃗"
                    showCoords
                    isR2={isR2}
                    lineWidth={4}
                  />
                )}

                {showDiff && (
                  <>
                    <Vector3DObject
                      vector={diffUV}
                      color="#f43f5e"
                      label="u⃗ - v⃗"
                      showCoords
                      isR2={isR2}
                      lineWidth={3.5}
                    />
                    {/* Vector diferencia cerrando el triángulo desde la punta de v hasta la punta de u */}
                    {showParallelogramRule && (
                      <Vector3DObject
                        origin={effectiveV}
                        vector={diffUV}
                        color="#f43f5e"
                        label="u⃗ - v⃗ (trasladado)"
                        dashed
                        opacity={0.75}
                        lineWidth={2.2}
                        headScale={0.85}
                      />
                    )}
                  </>
                )}
              </>
            )}

            {/* 2. OPERACIÓN: PRODUCTO POR ESCALAR */}
            {operation === 'scalar-mult' && (
              <>
                {/* Recta de acción infinita del vector */}
                {vectorNorm(selectedBaseVec) > 1e-5 && (
                  <Line
                    points={[
                      vectorScale(selectedBaseVec, -4),
                      vectorScale(selectedBaseVec, 4),
                    ]}
                    color="#94a3b8"
                    lineWidth={1.2}
                    dashed
                    dashSize={0.3}
                    gapSize={0.2}
                    transparent
                    opacity={0.5}
                  />
                )}
                <Vector3DObject
                  vector={scaledVector}
                  color="#e879f9"
                  label={`${formatNum(scalarK, 1)}·${scalarTarget}⃗`}
                  showCoords
                  isR2={isR2}
                  lineWidth={4.2}
                  headScale={1.15}
                />
              </>
            )}

            {/* 3. OPERACIÓN: PRODUCTO ESCALAR, ÁNGULO Y PROYECCIÓN ORTOGONAL */}
            {operation === 'dot-product' && (
              <>
                {angleUV && (
                  <AngleArc3D
                    u={effectiveU}
                    v={effectiveV}
                    degrees={angleUV.degrees}
                  />
                )}

                {projUonV && (
                  <>
                    {/* Recta soporte de v */}
                    <Line
                      points={[
                        vectorScale(effectiveV, -3),
                        vectorScale(effectiveV, 3),
                      ]}
                      color="#34d399"
                      lineWidth={1}
                      dashed
                      dashSize={0.25}
                      gapSize={0.2}
                      transparent
                      opacity={0.4}
                    />

                    {/* Vector Proyección Ortogonal proy_v(u) */}
                    <Vector3DObject
                      vector={projUonV.projectedVector}
                      color="#f59e0b"
                      label="proy_v⃗(u⃗)"
                      showCoords
                      isR2={isR2}
                      lineWidth={4.2}
                    />

                    {/* Segmento perpendicular desde proy_v(u) hasta u */}
                    <Line
                      points={[projUonV.projectedVector, effectiveU]}
                      color="#fbbf24"
                      lineWidth={2}
                      dashed
                      dashSize={0.2}
                      gapSize={0.15}
                    />
                  </>
                )}
              </>
            )}

            {/* 4. OPERACIÓN: PRODUCTO VECTORIAL EN R3 */}
            {operation === 'cross-product' && (
              <>
                <Parallelogram3D
                  u={effectiveU}
                  v={effectiveV}
                  color="#a855f7"
                  opacity={0.3}
                  badgeText={`Área = ‖u⃗ × v⃗‖ = ${formatNum(areaParallelogram, 2)} u²`}
                />
                <Vector3DObject
                  vector={crossUV}
                  color="#c084fc"
                  label="u⃗ × v⃗"
                  showCoords
                  lineWidth={4.2}
                />
              </>
            )}

            {/* 5. OPERACIÓN: PRODUCTO MIXTO EN R3 */}
            {operation === 'mixed-product' && (
              <>
                <Parallelepiped3D
                  u={effectiveU}
                  v={effectiveV}
                  w={effectiveW}
                  color="#ec4899"
                  opacity={0.22}
                  badgeText={`Volumen = ${formatNum(mixedUVW.volume, 2)} u³`}
                />
                {showAuxCrossInMixed && (
                  <Vector3DObject
                    vector={mixedUVW.crossVW}
                    color="#c084fc"
                    label="v⃗ × w⃗"
                    showCoords
                    dashed
                    opacity={0.85}
                    lineWidth={2.5}
                  />
                )}
              </>
            )}
          </Scene3D>
        </div>
      </div>

      {/* PANEL DERECHO: CONTROLES INTERACTIVOS + RESULTADOS MATEMÁTICOS EN TIEMPO REAL */}
      <div className="w-full lg:w-[430px] xl:w-[470px] h-[48vh] lg:h-full bg-slate-950 flex flex-col overflow-y-auto shrink-0">
        {/* Bloque 1: Presets y Controles de Vectores */}
        <div className="p-4 border-b border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Panel de Vectores ({dimension === 'R2' ? 'ℝ²' : 'ℝ³'})
            </h2>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyPreset('default')}
                className="px-2 py-1 text-[11px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors flex items-center gap-1"
                title="Restaurar vectores iniciales"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Base</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('orthogonal')}
                className="px-2 py-1 text-[11px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
                title="Cargar vectores ortogonales (90°)"
              >
                90° Ortogonales
              </button>
              {dimension === 'R3' && (
                <button
                  type="button"
                  onClick={() => applyPreset('coplanar')}
                  className="px-2 py-1 text-[11px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
                  title="Cargar vectores coplanares (Volumen = 0)"
                >
                  Coplanares
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <VectorControlCard
              name="Vector 1"
              symbol="u⃗"
              color="#38bdf8"
              value={effectiveU}
              onChange={(next) =>
                setVecU(dimension === 'R2' ? [next[0], next[1], vecU[2]] : next)
              }
              dimension={dimension}
              visible={showU}
              onToggleVisible={() => setShowU((s) => !s)}
              normValue={normU}
            />

            <VectorControlCard
              name="Vector 2"
              symbol="v⃗"
              color="#34d399"
              value={effectiveV}
              onChange={(next) =>
                setVecV(dimension === 'R2' ? [next[0], next[1], vecV[2]] : next)
              }
              dimension={dimension}
              visible={showV}
              onToggleVisible={() => setShowV((s) => !s)}
              normValue={normV}
            />

            {(operation === 'mixed-product' ||
              (operation === 'scalar-mult' && scalarTarget === 'w') ||
              dimension === 'R3') && (
              <VectorControlCard
                name="Vector 3"
                symbol="w⃗"
                color="#fb923c"
                value={effectiveW}
                onChange={(next) =>
                  setVecW(dimension === 'R2' ? [next[0], next[1], vecW[2]] : next)
                }
                dimension={dimension}
                visible={showW}
                onToggleVisible={() => setShowW((s) => !s)}
                normValue={normW}
              />
            )}
          </div>
        </div>

        {/* Bloque 2: Parámetros de la Operación Activa */}
        <div className="p-4 border-b border-slate-800/90 bg-slate-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Opciones de Visualización
            </h3>
            <span className="text-[11px] text-slate-400">
              {OPERATION_TABS.find((t) => t.id === operation)?.label}
            </span>
          </div>

          {operation === 'add-sub' && (
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSum}
                  onChange={(e) => setShowSum(e.target.checked)}
                  className="accent-yellow-400 rounded"
                />
                <span>Mostrar Suma (u⃗ + v⃗)</span>
              </label>

              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDiff}
                  onChange={(e) => setShowDiff(e.target.checked)}
                  className="accent-rose-500 rounded"
                />
                <span>Mostrar Resta (u⃗ - v⃗)</span>
              </label>

              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showParallelogramRule}
                  onChange={(e) => setShowParallelogramRule(e.target.checked)}
                  className="accent-indigo-500 rounded"
                />
                <span>Regla del Paralelogramo</span>
              </label>
            </div>
          )}

          {operation === 'scalar-mult' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-300">Vector a escalar:</span>
                <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                  {(['u', 'v', 'w'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setScalarTarget(t)}
                      className={`px-3 py-1 rounded text-xs font-mono font-bold ${
                        scalarTarget === t
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t}⃗
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-fuchsia-400 w-16">
                  k = {formatNum(scalarK, 1)}
                </span>
                <input
                  type="range"
                  min={-3}
                  max={3}
                  step={0.1}
                  value={scalarK}
                  onChange={(e) => setScalarK(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                />
                <button
                  type="button"
                  onClick={() => setScalarK(-scalarK || -1)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200"
                >
                  Invertir (-k)
                </button>
              </div>
            </div>
          )}

          {operation === 'dot-product' && (
            <p className="text-xs text-slate-300 leading-relaxed">
              Se visualiza el arco del ángulo{' '}
              <span className="text-amber-300 font-mono font-semibold">θ</span> entre{' '}
              <span className="text-sky-400 font-mono">u⃗</span> y{' '}
              <span className="text-emerald-400 font-mono">v⃗</span>, junto con el
              vector proyección ortogonal{' '}
              <span className="text-amber-400 font-mono font-semibold">
                proy_v⃗(u⃗)
              </span>{' '}
              sobre la recta de dirección de v⃗.
            </p>
          )}

          {operation === 'cross-product' && (
            <p className="text-xs text-slate-300 leading-relaxed">
              El vector{' '}
              <span className="text-purple-300 font-mono font-semibold">
                u⃗ × v⃗
              </span>{' '}
              es ortogonal simultáneamente a u⃗ y v⃗ (regla de la mano derecha), y su
              módulo coincide con el{' '}
              <span className="text-purple-300 font-semibold">
                área del paralelogramo sombreado
              </span>
              .
            </p>
          )}

          {operation === 'mixed-product' && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAuxCrossInMixed}
                  onChange={(e) => setShowAuxCrossInMixed(e.target.checked)}
                  className="accent-purple-500 rounded"
                />
                <span>Mostrar vector normal auxiliar (v⃗ × w⃗)</span>
              </label>
            </div>
          )}
        </div>

        {/* Bloque 3: Panel de Resultados Matemáticos en Tiempo Real */}
        <div className="p-4 space-y-3 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            Resultados y Fórmulas en Tiempo Real
          </h3>

          {/* Fórmulas para SUMA Y RESTA */}
          {operation === 'add-sub' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-slate-400 text-[11px] font-sans font-medium">
                  Suma Analítica (Componente a componente)
                </div>
                <div className="text-yellow-300 font-semibold">
                  u⃗ + v⃗ = {formatVector(effectiveU, isR2)} +{' '}
                  {formatVector(effectiveV, isR2)}
                </div>
                <div className="text-sm text-white font-bold pt-1 border-t border-slate-800/80 flex items-center justify-between">
                  <span>u⃗ + v⃗ = {formatVector(sumUV, isR2)}</span>
                  <span className="text-xs text-slate-400">
                    ‖u⃗ + v⃗‖ = {formatNum(vectorNorm(sumUV), 2)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-slate-400 text-[11px] font-sans font-medium">
                  Resta / Diferencia Vectorial
                </div>
                <div className="text-rose-300 font-semibold">
                  u⃗ - v⃗ = {formatVector(effectiveU, isR2)} -{' '}
                  {formatVector(effectiveV, isR2)}
                </div>
                <div className="text-sm text-white font-bold pt-1 border-t border-slate-800/80 flex items-center justify-between">
                  <span>u⃗ - v⃗ = {formatVector(diffUV, isR2)}</span>
                  <span className="text-xs text-slate-400">
                    ‖u⃗ - v⃗‖ = {formatNum(vectorNorm(diffUV), 2)}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-[11px] font-sans text-indigo-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Interpretación geométrica:</strong> Las diagonales del
                  paralelogramo generado por u⃗ y v⃗ corresponden a la suma{' '}
                  <code className="text-yellow-300">u⃗ + v⃗</code> (diagonal
                  principal) y a la resta{' '}
                  <code className="text-rose-300">u⃗ - v⃗</code> (diagonal
                  secundaria).
                </span>
              </div>
            </div>
          )}

          {/* Fórmulas para PRODUCTO POR UN ESCALAR */}
          {operation === 'scalar-mult' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-slate-400 text-[11px] font-sans font-medium">
                  Multiplicación por Escalar (k ∈ ℝ)
                </div>
                <div className="text-fuchsia-300">
                  k · {scalarTarget}⃗ = {formatNum(scalarK, 2)} ·{' '}
                  {formatVector(selectedBaseVec, isR2)}
                </div>
                <div className="text-sm text-white font-bold pt-1 border-t border-slate-800/80 flex items-center justify-between">
                  <span>
                    {formatNum(scalarK, 2)}·{scalarTarget}⃗ ={' '}
                    {formatVector(scaledVector, isR2)}
                  </span>
                  <span className="text-xs text-slate-400">
                    ‖k·{scalarTarget}⃗‖ = {formatNum(vectorNorm(scaledVector), 2)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px] font-sans">
                  Propiedad de la Norma: ‖k·{scalarTarget}⃗‖ = |k| · ‖{scalarTarget}⃗‖
                </div>
                <div className="text-slate-200">
                  |{formatNum(scalarK, 2)}| ×{' '}
                  {formatNum(vectorNorm(selectedBaseVec), 2)} ={' '}
                  <span className="text-fuchsia-300 font-bold">
                    {formatNum(vectorNorm(scaledVector), 2)}
                  </span>
                </div>
                <div className="text-[11px] font-sans text-slate-300 pt-1">
                  Efecto geométrico:{' '}
                  <strong className="text-indigo-300">
                    {scalarK === 0
                      ? 'Vector nulo (colapsa al origen)'
                      : scalarK < 0
                      ? Math.abs(scalarK) > 1
                        ? 'Inversión de sentido y dilatación'
                        : 'Inversión de sentido y contracción'
                      : scalarK > 1
                      ? 'Mismo sentido y dilatación'
                      : scalarK === 1
                      ? 'Vector idéntico (k = 1)'
                      : 'Mismo sentido y contracción'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Fórmulas para PRODUCTO ESCALAR */}
          {operation === 'dot-product' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-slate-400 text-[11px] font-sans font-medium">
                  Producto Escalar (Dot Product)
                </div>
                <div className="text-slate-300">
                  u⃗ · v⃗ = ({formatNum(effectiveU[0])})({formatNum(effectiveV[0])}) + (
                  {formatNum(effectiveU[1])})({formatNum(effectiveV[1])})
                  {!isR2 &&
                    ` + (${formatNum(effectiveU[2])})(${formatNum(effectiveV[2])})`}
                </div>
                <div className="text-sm text-amber-300 font-bold pt-1 border-t border-slate-800/80 flex items-center justify-between">
                  <span>u⃗ · v⃗ = {formatNum(dotUV, 3)}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[11px]">
                    {Math.abs(dotUV) < 1e-6
                      ? 'Ortogonales (90°)'
                      : dotUV > 0
                      ? 'Ángulo Agudo (< 90°)'
                      : 'Ángulo Obtuso (> 90°)'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-slate-400 text-[11px] font-sans font-medium">
                  Ángulo entre Vectores: cos(θ) = (u⃗ · v⃗) / (‖u⃗‖ · ‖v⃗‖)
                </div>
                {angleUV ? (
                  <div className="flex items-center justify-between text-white font-bold">
                    <span className="text-amber-300 text-sm">
                      θ = {formatNum(angleUV.degrees, 2)}°
                    </span>
                    <span className="text-slate-400">
                      ({formatNum(angleUV.radians, 3)} rad)
                    </span>
                  </div>
                ) : (
                  <div className="text-rose-400">
                    Ángulo indefinido (uno de los vectores es nulo)
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-slate-400 text-[11px] font-sans font-medium">
                  Proyección Ortogonal de u⃗ sobre v⃗: proy_v⃗(u⃗) = ((u⃗·v⃗)/‖v⃗‖²)·v⃗
                </div>
                {projUonV ? (
                  <>
                    <div className="text-amber-300 font-bold">
                      proy_v⃗(u⃗) = {formatVector(projUonV.projectedVector, isR2, 2)}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Proyección escalar (con signo): comp_v⃗(u⃗) ={' '}
                      {formatNum(projUonV.scalarProjection, 2)}
                    </div>
                  </>
                ) : (
                  <div className="text-rose-400">
                    No se puede proyectar sobre el vector nulo v⃗ = 0⃗
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fórmulas para PRODUCTO VECTORIAL */}
          {operation === 'cross-product' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-slate-400 text-[11px] font-sans font-medium">
                  Producto Vectorial (Determinante Simbólico î, ĵ, k̂)
                </div>
                <div className="text-purple-300 font-bold text-sm">
                  u⃗ × v⃗ = {formatVector(crossUV, false, 2)}
                </div>
                <div className="text-slate-300 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                  <span>Área Paralelogramo = ‖u⃗ × v⃗‖</span>
                  <span className="text-purple-300 font-bold">
                    {formatNum(areaParallelogram, 2)} u²
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Área Triángulo (½ ‖u⃗ × v⃗‖) ={' '}
                  {formatNum(areaParallelogram / 2, 2)} u²
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px] font-sans font-medium">
                  Verificación de Ortogonalidad
                </div>
                <div className="text-emerald-300">
                  (u⃗ × v⃗) · u⃗ = {formatNum(vectorDot(crossUV, effectiveU), 4)} = 0
                </div>
                <div className="text-emerald-300">
                  (u⃗ × v⃗) · v⃗ = {formatNum(vectorDot(crossUV, effectiveV), 4)} = 0
                </div>
              </div>
            </div>
          )}

          {/* Fórmulas para PRODUCTO MIXTO */}
          {operation === 'mixed-product' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-slate-400 text-[11px] font-sans font-medium">
                  Producto Mixto: [u⃗, v⃗, w⃗] = u⃗ · (v⃗ × w⃗) = det([u⃗, v⃗, w⃗])
                </div>
                <div className="text-slate-300">
                  v⃗ × w⃗ = {formatVector(mixedUVW.crossVW, false, 2)}
                </div>
                <div className="text-pink-300 font-bold text-sm pt-1 border-t border-slate-800/80 flex items-center justify-between">
                  <span>[u⃗, v⃗, w⃗] = {formatNum(mixedUVW.determinant, 2)}</span>
                  <span className="text-white">
                    Volumen V = {formatNum(mixedUVW.volume, 2)} u³
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-pink-950/30 border border-pink-500/30 text-[11px] font-sans text-pink-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span>
                  {mixedUVW.volume < 1e-5 ? (
                    <>
                      <strong>Vectores Coplanares:</strong> El producto mixto es{' '}
                      <code>0</code>, por lo que u⃗, v⃗ y w⃗ yacen en un mismo plano y
                      el paralelepípedo tiene volumen nulo.
                    </>
                  ) : (
                    <>
                      <strong>Interpretación geométrica:</strong> El valor absoluto{' '}
                      <code>|[u⃗, v⃗, w⃗]| = {formatNum(mixedUVW.volume, 2)}</code>{' '}
                      representa el volumen del paralelepípedo 3D y{' '}
                      <code>1/6 |[u⃗, v⃗, w⃗]| = {formatNum(mixedUVW.volume / 6, 2)}</code>{' '}
                      el del tetraedro.
                    </>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
