import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Calculator,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import type { DimensionMode } from '../types/curriculum';
import {
  formatNum,
  formatVector,
  matrixColumnsAsVectors,
  matrixDeterminant,
  matrixAdd,
  matrixSubtract,
  matrixMultiply,
  matrixTranspose,
  matrixInverse,
  type Matrix3x3,
} from '../utils/mathUtils';
import { Scene3D } from '../components/canvas/Scene3D';
import { Vector3DObject } from '../components/canvas/Vector3DObject';
import {
  Parallelogram3D,
  Parallelepiped3D,
} from '../components/canvas/GeometryPrimitives';

type Unit4Tab = 'det-geometry' | 'matrix-ops' | 'inverse-matrix';
type MatrixAlgebraOp = 'add' | 'sub' | 'mul-ab' | 'mul-ba' | 'transpose';

interface MatrixEditorProps {
  title: string;
  symbol: string;
  matrix: Matrix3x3;
  onChange: (next: Matrix3x3) => void;
  isR2: boolean;
  detValue: number;
}

const COL_COLORS = ['#38bdf8', '#34d399', '#fb923c'];

const MatrixEditor: React.FC<MatrixEditorProps> = ({
  title,
  symbol,
  matrix,
  onChange,
  isR2,
  detValue,
}) => {
  const size = isR2 ? 2 : 3;

  const handleCellChange = (r: number, c: number, raw: string) => {
    const parsed = parseFloat(raw);
    const val = Number.isNaN(parsed) ? 0 : Math.max(-10, Math.min(10, parsed));
    const next: Matrix3x3 = [
      [...matrix[0]],
      [...matrix[1]],
      [...matrix[2]],
    ];
    next[r][c] = val;
    onChange(next);
  };

  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-indigo-300">
            {symbol}
          </span>
          <span className="text-xs text-slate-400">({title})</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${
            Math.abs(detValue) < 1e-6
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
          }`}
        >
          det({symbol}) = {formatNum(detValue, 2)}
        </span>
      </div>

      {/* Cabecera de vectores columna */}
      <div
        className={`grid gap-2 px-3 ${
          isR2 ? 'grid-cols-2' : 'grid-cols-3'
        }`}
      >
        {Array.from({ length: size }).map((_, cIdx) => (
          <div
            key={cIdx}
            className="text-center text-[10px] font-mono font-bold flex items-center justify-center gap-1"
            style={{ color: COL_COLORS[cIdx] }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COL_COLORS[cIdx] }}
            />
            Col c⃗_{cIdx + 1}
          </div>
        ))}
      </div>

      {/* Grilla con corchetes matriciales */}
      <div className="relative px-3 py-1.5">
        <div className="absolute left-1 top-0 bottom-0 w-2 border-l-2 border-t-2 border-b-2 border-slate-500 rounded-l-sm pointer-events-none" />
        <div className="absolute right-1 top-0 bottom-0 w-2 border-r-2 border-t-2 border-b-2 border-slate-500 rounded-r-sm pointer-events-none" />

        <div className="space-y-1.5">
          {Array.from({ length: size }).map((_, r) => (
            <div
              key={r}
              className={`grid gap-2 ${
                isR2 ? 'grid-cols-2' : 'grid-cols-3'
              }`}
            >
              {Array.from({ length: size }).map((__, c) => (
                <input
                  key={`${r}-${c}`}
                  type="number"
                  step={0.5}
                  min={-10}
                  max={10}
                  value={matrix[r][c]}
                  onChange={(e) => handleCellChange(r, c, e.target.value)}
                  className="w-full px-2 py-1 text-center font-mono text-xs font-semibold rounded bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface MatrixReadonlyCardProps {
  title: string;
  symbol: string;
  matrix: Matrix3x3;
  isR2: boolean;
  detValue?: number;
  accentColor?: string;
}

const MatrixReadonlyCard: React.FC<MatrixReadonlyCardProps> = ({
  title,
  symbol,
  matrix,
  isR2,
  detValue,
  accentColor = 'text-amber-300',
}) => {
  const size = isR2 ? 2 : 3;

  return (
    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-sans text-slate-400">
          <strong className={`font-mono ${accentColor}`}>{symbol}</strong> —{' '}
          {title}
        </span>
        {detValue !== undefined && (
          <span className="font-mono text-[11px] text-slate-300">
            det = <strong>{formatNum(detValue, 3)}</strong>
          </span>
        )}
      </div>

      <div className="relative px-3 py-1">
        <div className="absolute left-1 top-0 bottom-0 w-2 border-l-2 border-t-2 border-b-2 border-slate-600 rounded-l-sm pointer-events-none" />
        <div className="absolute right-1 top-0 bottom-0 w-2 border-r-2 border-t-2 border-b-2 border-slate-600 rounded-r-sm pointer-events-none" />

        <div className="space-y-1">
          {Array.from({ length: size }).map((_, r) => (
            <div
              key={r}
              className={`grid gap-2 text-center font-mono text-xs ${
                isR2 ? 'grid-cols-2' : 'grid-cols-3'
              }`}
            >
              {Array.from({ length: size }).map((__, c) => (
                <div
                  key={`${r}-${c}`}
                  className="py-1 px-1.5 rounded bg-slate-950/90 border border-slate-800/80 text-slate-200 font-semibold"
                >
                  {formatNum(matrix[r][c], 2)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const Unit4Matrices: React.FC = () => {
  const [dimension, setDimension] = useState<DimensionMode>('R2');
  const [tab, setTab] = useState<Unit4Tab>('det-geometry');
  const [algebraOp, setAlgebraOp] = useState<MatrixAlgebraOp>('mul-ab');

  // Matriz A y Matriz B
  const [matrixA, setMatrixA] = useState<Matrix3x3>([
    [2.5, 1, 0.5],
    [0.5, 2, 0.5],
    [0, 0.5, 2],
  ]);

  const [matrixB, setMatrixB] = useState<Matrix3x3>([
    [1, -1, 0],
    [1.5, 1, 0.5],
    [0.5, 0, 1.5],
  ]);

  // Interpolación geométrica I -> A (t de 0 a 1)
  const [morphT, setMorphT] = useState<number>(1);
  const [showUnitReference, setShowUnitReference] = useState<boolean>(true);
  const [showInverseVectors, setShowInverseVectors] = useState<boolean>(true);

  const isR2 = dimension === 'R2';

  // Matriz interpolada M(t) = (1 - t)*I + t*A para visualizar la deformación del área/volumen
  const interpolatedA: Matrix3x3 = useMemo(() => {
    const t = morphT;
    const identity: Matrix3x3 = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const res: Matrix3x3 = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        res[r][c] = (1 - t) * identity[r][c] + t * matrixA[r][c];
      }
    }
    return res;
  }, [matrixA, morphT]);

  const detA = useMemo(() => matrixDeterminant(matrixA, isR2), [matrixA, isR2]);
  const detB = useMemo(() => matrixDeterminant(matrixB, isR2), [matrixB, isR2]);
  const detInterpolated = useMemo(
    () => matrixDeterminant(interpolatedA, isR2),
    [interpolatedA, isR2]
  );

  const colsA = useMemo(
    () => matrixColumnsAsVectors(tab === 'det-geometry' ? interpolatedA : matrixA, isR2),
    [interpolatedA, matrixA, tab, isR2]
  );

  //Resultado de Álgebra Matricial
  const algebraResultMatrix: Matrix3x3 = useMemo(() => {
    if (algebraOp === 'add') return matrixAdd(matrixA, matrixB);
    if (algebraOp === 'sub') return matrixSubtract(matrixA, matrixB);
    if (algebraOp === 'mul-ab') return matrixMultiply(matrixA, matrixB, isR2);
    if (algebraOp === 'mul-ba') return matrixMultiply(matrixB, matrixA, isR2);
    return matrixTranspose(matrixA);
  }, [algebraOp, matrixA, matrixB, isR2]);

  const detAlgebraResult = useMemo(
    () => matrixDeterminant(algebraResultMatrix, isR2),
    [algebraResultMatrix, isR2]
  );

  const colsResult = useMemo(
    () => matrixColumnsAsVectors(algebraResultMatrix, isR2),
    [algebraResultMatrix, isR2]
  );

  // Resultado de Inversa y Adjunta
  const inverseData = useMemo(
    () => matrixInverse(matrixA, isR2),
    [matrixA, isR2]
  );

  const colsInverse = useMemo(
    () =>
      inverseData.inverse
        ? matrixColumnsAsVectors(inverseData.inverse, isR2)
        : null,
    [inverseData, isR2]
  );

  // Presets rápidos de matrices
  const applyPreset = (
    type: 'default' | 'identity' | 'reflection' | 'singular' | 'rotation'
  ) => {
    setMorphT(1);
    if (type === 'default') {
      setMatrixA([
        [2.5, 1, 0.5],
        [0.5, 2, 0.5],
        [0, 0.5, 2],
      ]);
    } else if (type === 'identity') {
      setMatrixA([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ]);
    } else if (type === 'reflection') {
      // Determinante negativo (invierte orientación)
      setMatrixA([
        [1, 2, 0],
        [2, 1, 0],
        [0, 0, 1.5],
      ]);
    } else if (type === 'singular') {
      // Columnas linealmente dependientes (c2 = 2*c1) => det(A) = 0
      setMatrixA([
        [1.5, 3, 1],
        [1, 2, 1],
        [0.5, 1, 1],
      ]);
    } else if (type === 'rotation') {
      // Rotación pura de 90° en XY (det = 1)
      setMatrixA([
        [0, -1, 0],
        [1, 0, 0],
        [0, 0, 1],
      ]);
    }
  };

  // Leyenda dinámica
  const legendItems = useMemo(() => {
    const items: { color: string; label: string; value?: string }[] = [
      {
        color: '#38bdf8',
        label: 'Columna c⃗₁',
        value: formatVector(colsA.c1, isR2, 2),
      },
      {
        color: '#34d399',
        label: 'Columna c⃗₂',
        value: formatVector(colsA.c2, isR2, 2),
      },
    ];
    if (!isR2) {
      items.push({
        color: '#fb923c',
        label: 'Columna c⃗₃',
        value: formatVector(colsA.c3, false, 2),
      });
    }
    if (tab === 'det-geometry') {
      items.push({
        color: detInterpolated < 0 ? '#f43f5e' : '#a855f7',
        label: isR2 ? '|det(A)| = Área' : '|det(A)| = Volumen',
        value: `${formatNum(Math.abs(detInterpolated), 2)} ${isR2 ? 'u²' : 'u³'}`,
      });
    }
    return items;
  }, [colsA, isR2, tab, detInterpolated]);

  return (
    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">
      {/* ESCENA GRÁFICA 2D / 3D */}
      <div className="flex-1 flex flex-col h-[52vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Barra superior */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 z-20">
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'det-geometry', label: '1. Determinante (Área / Volumen)' },
              { id: 'matrix-ops', label: '2. Álgebra Matricial (A±B, A·B, Aᵀ)' },
              { id: 'inverse-matrix', label: '3. Matriz Inversa A⁻¹ y Adjunta' },
            ].map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id as Unit4Tab)}
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

          {/* Toggle 2x2 (R2) vs 3x3 (R3) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Orden:</span>
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
                2×2 (ℝ²)
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
                3×3 (ℝ³)
              </button>
            </div>
          </div>
        </div>

        {/* Visor 3D / 2D */}
        <div className="flex-1 relative">
          <Scene3D dimension={dimension} legendItems={legendItems}>
            {/* Referencia del Cuadrado Unitario (R2) o Cubo Unitario (R3) */}
            {showUnitReference && tab === 'det-geometry' && (
              <>
                {isR2 ? (
                  <Parallelogram3D
                    u={[1, 0, 0]}
                    v={[0, 1, 0]}
                    color="#94a3b8"
                    opacity={0.12}
                    badgeText="Base Canónica (Área = 1 u²)"
                  />
                ) : (
                  <Parallelepiped3D
                    u={[1, 0, 0]}
                    v={[0, 1, 0]}
                    w={[0, 0, 1]}
                    color="#94a3b8"
                    opacity={0.1}
                  />
                )}
              </>
            )}

            {/* Vectores Columna de A */}
            <Vector3DObject
              vector={colsA.c1}
              color="#38bdf8"
              label="c⃗₁"
              showCoords
              isR2={isR2}
              lineWidth={3.8}
            />
            <Vector3DObject
              vector={colsA.c2}
              color="#34d399"
              label="c⃗₂"
              showCoords
              isR2={isR2}
              lineWidth={3.8}
            />
            {!isR2 && (
              <Vector3DObject
                vector={colsA.c3}
                color="#fb923c"
                label="c⃗₃"
                showCoords
                isR2={false}
                lineWidth={3.8}
              />
            )}

            {/* Región Geométrica de A (Paralelogramo en R2 / Paralelepípedo en R3) */}
            {isR2 ? (
              <Parallelogram3D
                u={colsA.c1}
                v={colsA.c2}
                color={detInterpolated < 0 ? '#f43f5e' : '#a855f7'}
                opacity={0.28}
                badgeText={`det = ${formatNum(
                  detInterpolated,
                  2
                )} | Área = ${formatNum(Math.abs(detInterpolated), 2)} u²`}
              />
            ) : (
              <Parallelepiped3D
                u={colsA.c1}
                v={colsA.c2}
                w={colsA.c3}
                color={detInterpolated < 0 ? '#f43f5e' : '#a855f7'}
                opacity={0.22}
                badgeText={`det = ${formatNum(
                  detInterpolated,
                  2
                )} | Vol = ${formatNum(Math.abs(detInterpolated), 2)} u³`}
              />
            )}

            {/* En Álgebra Matricial: mostrar también la región resultante C */}
            {tab === 'matrix-ops' && (
              <>
                {isR2 ? (
                  <Parallelogram3D
                    u={colsResult.c1}
                    v={colsResult.c2}
                    color="#facc15"
                    opacity={0.2}
                    badgeText={`Resultado det = ${formatNum(detAlgebraResult, 2)}`}
                  />
                ) : (
                  <Parallelepiped3D
                    u={colsResult.c1}
                    v={colsResult.c2}
                    w={colsResult.c3}
                    color="#facc15"
                    opacity={0.16}
                    badgeText={`Resultado det = ${formatNum(detAlgebraResult, 2)}`}
                  />
                )}
              </>
            )}

            {/* En Matriz Inversa: mostrar los vectores columna de A⁻¹ */}
            {tab === 'inverse-matrix' &&
              showInverseVectors &&
              colsInverse && (
                <>
                  <Vector3DObject
                    vector={colsInverse.c1}
                    color="#facc15"
                    label="c⃗₁(A⁻¹)"
                    dashed
                    isR2={isR2}
                    lineWidth={2.8}
                  />
                  <Vector3DObject
                    vector={colsInverse.c2}
                    color="#facc15"
                    label="c⃗₂(A⁻¹)"
                    dashed
                    isR2={isR2}
                    lineWidth={2.8}
                  />
                  {!isR2 && (
                    <Vector3DObject
                      vector={colsInverse.c3}
                      color="#facc15"
                      label="c⃗₃(A⁻¹)"
                      dashed
                      isR2={false}
                      lineWidth={2.8}
                    />
                  )}
                  {isR2 && (
                    <Parallelogram3D
                      u={colsInverse.c1}
                      v={colsInverse.c2}
                      color="#facc15"
                      opacity={0.18}
                      badgeText={`Área(A⁻¹) = 1/|det(A)| = ${formatNum(
                        1 / Math.abs(detA),
                        2
                      )} u²`}
                    />
                  )}
                </>
              )}
          </Scene3D>
        </div>
      </div>

      {/* PANEL DERECHO: EDITOR DE MATRICES + CÁLCULOS CON MATHJS */}
      <div className="w-full lg:w-[450px] xl:w-[490px] h-[48vh] lg:h-full bg-slate-950 flex flex-col overflow-y-auto shrink-0">
        <div className="p-4 border-b border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Matrices de Entrada ({isR2 ? '2×2' : '3×3'})
            </h2>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyPreset('default')}
                className="px-2 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Base</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('reflection')}
                className="px-2 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-300"
                title="Cargar matriz con determinante negativo"
              >
                det &lt; 0
              </button>
              <button
                type="button"
                onClick={() => applyPreset('singular')}
                className="px-2 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300"
                title="Cargar matriz singular (det = 0)"
              >
                Singular (det=0)
              </button>
            </div>
          </div>

          <MatrixEditor
            title="Matriz Principal"
            symbol="A"
            matrix={matrixA}
            onChange={setMatrixA}
            isR2={isR2}
            detValue={detA}
          />

          {tab === 'matrix-ops' && algebraOp !== 'transpose' && (
            <MatrixEditor
              title="Segunda Matriz"
              symbol="B"
              matrix={matrixB}
              onChange={setMatrixB}
              isR2={isR2}
              detValue={detB}
            />
          )}

          {/* Controles de Interpolación Geométrica en Pestaña 1 */}
          {tab === 'det-geometry' && (
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-300 font-semibold">
                  Deformación continua: I → A (t = {formatNum(morphT, 2)})
                </span>
                <button
                  type="button"
                  onClick={() => setMorphT(morphT < 1 ? 1 : 0)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-200"
                >
                  {morphT < 1 ? 'Ir a A (t=1)' : 'Ver Identidad (t=0)'}
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={morphT}
                onChange={(e) => setMorphT(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <label className="flex items-center gap-2 text-xs text-slate-300 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUnitReference}
                  onChange={(e) => setShowUnitReference(e.target.checked)}
                  className="accent-indigo-500 rounded"
                />
                <span>
                  Mostrar {isR2 ? 'cuadrado unitario (1 u²)' : 'cubo unitario (1 u³)'}{' '}
                  de referencia
                </span>
              </label>
            </div>
          )}

          {/* Selector de Operación en Pestaña 2 */}
          {tab === 'matrix-ops' && (
            <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
              {(
                [
                  { id: 'add', label: 'A + B' },
                  { id: 'sub', label: 'A - B' },
                  { id: 'mul-ab', label: 'A · B' },
                  { id: 'mul-ba', label: 'B · A' },
                  { id: 'transpose', label: 'Aᵀ' },
                ] as const
              ).map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setAlgebraOp(op.id)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                    algebraOp === op.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          )}

          {tab === 'inverse-matrix' && (
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={showInverseVectors}
                onChange={(e) => setShowInverseVectors(e.target.checked)}
                className="accent-yellow-400 rounded"
              />
              <span>Graficar columnas de A⁻¹ en el espacio</span>
            </label>
          )}
        </div>

        {/* Bloque de Resultados Matemáticos */}
        <div className="p-4 space-y-3 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            Resultados Analíticos e Interpretación Geométrica
          </h3>

          {/* PESTAÑA 1: INTERPRETACIÓN GEOMÉTRICA DEL DETERMINANTE */}
          {tab === 'det-geometry' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-sans text-slate-400">
                  Cálculo del Determinante ({isR2 ? '2×2' : 'Regla de Sarrus / Laplace 3×3'})
                </div>
                {isR2 && (
                  <div className="text-slate-300">
                    det(A) = a₁₁·a₂₂ - a₁₂·a₂₁ = ({formatNum(matrixA[0][0])})(
                    {formatNum(matrixA[1][1])}) - ({formatNum(matrixA[0][1])})(
                    {formatNum(matrixA[1][0])})
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-sm font-bold">
                  <span className="text-purple-300">
                    det(A) = {formatNum(detA, 3)}
                  </span>
                  <span className="text-white">
                    {isR2 ? 'Área' : 'Volumen'} = |det(A)| ={' '}
                    {formatNum(Math.abs(detA), 3)} {isR2 ? 'u²' : 'u³'}
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border space-y-1 font-sans text-xs ${
                  Math.abs(detA) < 1e-6
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : detA < 0
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    {Math.abs(detA) < 1e-6
                      ? 'Matriz Singular (Colapso Dimensional: det(A) = 0)'
                      : detA < 0
                      ? 'Factor de Escala con Inversión de Orientación (det(A) < 0)'
                      : 'Factor de Escala Conservando Orientación (det(A) > 0)'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {Math.abs(detA) < 1e-6
                    ? `Los vectores columna son linealmente dependientes (${
                        isR2 ? 'colineales' : 'coplanares'
                      }). El ${
                        isR2 ? 'paralelogramo' : 'paralelepípedo'
                      } se aplasta y su ${isR2 ? 'área' : 'volumen'} cae a 0.`
                    : `La transformación multiplica cualquier ${
                        isR2 ? 'área en ℝ²' : 'volumen en ℝ³'
                      } por un factor de ${formatNum(Math.abs(detA), 2)}${
                        detA < 0
                          ? ' e invierte la orientación de los ejes (efecto espejo).'
                          : ' manteniendo la orientación de la base.'
                      }`}
                </p>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: ÁLGEBRA MATRICIAL */}
          {tab === 'matrix-ops' && (
            <div className="space-y-2.5">
              <MatrixReadonlyCard
                title={
                  algebraOp === 'add'
                    ? 'Suma Matricial'
                    : algebraOp === 'sub'
                    ? 'Resta Matricial'
                    : algebraOp === 'mul-ab'
                    ? 'Producto A · B'
                    : algebraOp === 'mul-ba'
                    ? 'Producto B · A (Orden Inverso)'
                    : 'Matriz Transpuesta (Filas ↔ Columnas)'
                }
                symbol={
                  algebraOp === 'add'
                    ? 'A + B'
                    : algebraOp === 'sub'
                    ? 'A - B'
                    : algebraOp === 'mul-ab'
                    ? 'A · B'
                    : algebraOp === 'mul-ba'
                    ? 'B · A'
                    : 'Aᵀ'
                }
                matrix={algebraResultMatrix}
                isR2={isR2}
                detValue={detAlgebraResult}
              />

              {(algebraOp === 'mul-ab' || algebraOp === 'mul-ba') && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-1">
                  <div className="text-[11px] font-sans text-slate-400">
                    Teorema de Binet-Cauchy: det(A · B) = det(A) · det(B)
                  </div>
                  <div className="text-amber-300 font-bold">
                    ({formatNum(detA, 2)}) × ({formatNum(detB, 2)}) ={' '}
                    {formatNum(detA * detB, 3)}
                  </div>
                </div>
              )}

              {algebraOp === 'transpose' && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-1">
                  <div className="text-[11px] font-sans text-slate-400">
                    Invarianza del Determinante por Transposición
                  </div>
                  <div className="text-emerald-300 font-bold">
                    det(Aᵀ) = det(A) = {formatNum(detA, 3)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 3: MATRIZ INVERSA Y ADJUNTA */}
          {tab === 'inverse-matrix' && (
            <div className="space-y-2.5">
              {inverseData.invertible && inverseData.inverse ? (
                <>
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Matriz No Singular (Invertible)
                    </span>
                    <span className="font-mono">
                      det(A⁻¹) = 1/det(A) = {formatNum(1 / detA, 3)}
                    </span>
                  </div>

                  <MatrixReadonlyCard
                    title="Inversa A⁻¹ = (1/det(A)) · Adj(A)"
                    symbol="A⁻¹"
                    matrix={inverseData.inverse}
                    isR2={isR2}
                    detValue={1 / detA}
                    accentColor="text-yellow-300"
                  />

                  <MatrixReadonlyCard
                    title="Matriz Adjunta Clásica (Cof(A)ᵀ)"
                    symbol="Adj(A)"
                    matrix={inverseData.adjugate}
                    isR2={isR2}
                    accentColor="text-indigo-300"
                  />
                </>
              ) : (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-200 space-y-2">
                  <div className="font-bold flex items-center gap-2 text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Matriz Singular: No Existe A⁻¹ (det(A) = 0)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Como el determinante es nulo, la transformación aplasta el
                    espacio a una dimensión menor y pierde información de manera
                    irreversible. Aun así, la Matriz Adjunta está definida:
                  </p>
                  <MatrixReadonlyCard
                    title="Matriz Adjunta Clásica (Cof(A)ᵀ)"
                    symbol="Adj(A)"
                    matrix={inverseData.adjugate}
                    isR2={isR2}
                    accentColor="text-rose-300"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
