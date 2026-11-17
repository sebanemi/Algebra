import React, { useState, useMemo, useEffect } from 'react';
import { Line } from '@react-three/drei';
import {
  Sliders,
  Calculator,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { DimensionMode, Vector3Tuple } from '../types/curriculum';
import {
  formatNum,
  formatVector,
  vectorScale,
  applyMatrixToVector,
  analyzeEigenSystem,
  type Matrix3x3,
} from '../utils/mathUtils';
import { Scene3D } from '../components/canvas/Scene3D';
import { Vector3DObject } from '../components/canvas/Vector3DObject';
import { InfiniteLine3D } from '../components/canvas/LineAndPlanePrimitives';

interface UnitCircleDeformationProps {
  currentMatrix: Matrix3x3;
  isR2: boolean;
}

/**
 * Círculo unitario de vectores que se deforma en una elipse alineada con los autovectores
 */
const UnitCircleDeformation: React.FC<UnitCircleDeformationProps> = ({
  currentMatrix,
  isR2,
}) => {
  const { unitCirclePts, deformedPts } = useMemo(() => {
    const uPts: Vector3Tuple[] = [];
    const dPts: Vector3Tuple[] = [];
    const segments = 72;
    const radius = 2;

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const vx = radius * Math.cos(theta);
      const vy = radius * Math.sin(theta);
      const orig: Vector3Tuple = [vx, vy, 0];
      uPts.push(orig);

      const trans = applyMatrixToVector(
        currentMatrix,
        orig,
        isR2 ? 'R2-R2' : 'R3-R3'
      );
      dPts.push(trans);
    }

    return { unitCirclePts: uPts, deformedPts: dPts };
  }, [currentMatrix, isR2]);

  return (
    <group>
      <Line
        points={unitCirclePts}
        color="#64748b"
        lineWidth={1.3}
        dashed
        dashSize={0.2}
        gapSize={0.15}
        transparent
        opacity={0.5}
      />
      <Line
        points={deformedPts}
        color="#818cf8"
        lineWidth={2.2}
        transparent
        opacity={0.75}
      />
    </group>
  );
};

interface CompactMatrixCardProps {
  title: string;
  symbol: string;
  matrix: Matrix3x3;
  isR2: boolean;
  accent?: string;
}

const CompactMatrixCard: React.FC<CompactMatrixCardProps> = ({
  title,
  symbol,
  matrix,
  isR2,
  accent = 'text-indigo-300',
}) => {
  const size = isR2 ? 2 : 3;
  return (
    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
      <div className="text-[11px] font-sans text-slate-400">
        <strong className={`font-mono ${accent}`}>{symbol}</strong> — {title}
      </div>
      <div className="relative px-2.5 py-1">
        <div className="absolute left-0.5 top-0 bottom-0 w-1.5 border-l-2 border-t-2 border-b-2 border-slate-600 rounded-l-sm pointer-events-none" />
        <div className="absolute right-0.5 top-0 bottom-0 w-1.5 border-r-2 border-t-2 border-b-2 border-slate-600 rounded-r-sm pointer-events-none" />
        <div className="space-y-1">
          {Array.from({ length: size }).map((_, r) => (
            <div
              key={r}
              className={`grid gap-1.5 text-center font-mono text-[11px] ${
                isR2 ? 'grid-cols-2' : 'grid-cols-3'
              }`}
            >
              {Array.from({ length: size }).map((__, c) => (
                <div
                  key={`${r}-${c}`}
                  className="py-0.5 px-1 rounded bg-slate-950 border border-slate-800/80 text-slate-200"
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

export const Unit8Eigenvalues: React.FC = () => {
  const [dimension, setDimension] = useState<DimensionMode>('R2');

  // Matriz A por defecto: Simétrica con autovalores reales claros (λ₁ = 3, λ₂ = 1 en 2x2; λ₃ = 2 en 3x3)
  const [matrixA, setMatrixA] = useState<Matrix3x3>([
    [2, 1, 0],
    [1, 2, 0],
    [0, 0, 1.5],
  ]);

  // Vector genérico no propio u para contrastar con los autovectores
  const [nonEigenU, setNonEigenU] = useState<Vector3Tuple>([2, 0.3, 1.2]);
  const [showNonEigenVector, setShowNonEigenVector] = useState<boolean>(true);
  const [showDeformedCircle, setShowDeformedCircle] = useState<boolean>(true);

  // Parámetro de animación t ∈ [0, 1]: M(t) = (1 - t)*I + t*A
  const [animT, setAnimT] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const isR2 = dimension === 'R2';
  const size = isR2 ? 2 : 3;

  // Bucle de animación suave
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      setAnimT((prev) => {
        const next = prev + dt * 0.45;
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (animT >= 0.99) setAnimT(0);
      setIsPlaying(true);
    }
  };

  // Matriz interpolada M(t) = (1 - t)I + tA
  const currentMatrix: Matrix3x3 = useMemo(() => {
    const t = animT;
    const id: Matrix3x3 = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    return [
      [
        (1 - t) * id[0][0] + t * matrixA[0][0],
        (1 - t) * id[0][1] + t * matrixA[0][1],
        (1 - t) * id[0][2] + t * matrixA[0][2],
      ],
      [
        (1 - t) * id[1][0] + t * matrixA[1][0],
        (1 - t) * id[1][1] + t * matrixA[1][1],
        (1 - t) * id[1][2] + t * matrixA[1][2],
      ],
      [
        (1 - t) * id[2][0] + t * matrixA[2][0],
        (1 - t) * id[2][1] + t * matrixA[2][1],
        (1 - t) * id[2][2] + t * matrixA[2][2],
      ],
    ];
  }, [matrixA, animT]);

  // Análisis completo de Autovalores, Autovectores y Diagonalización con mathjs
  const eigenAnalysis = useMemo(
    () => analyzeEigenSystem(matrixA, isR2),
    [matrixA, isR2]
  );

  // Vector no propio u y su imagen animada M(t)*u
  const effNonEigenU: Vector3Tuple = useMemo(
    () => (isR2 ? [nonEigenU[0], nonEigenU[1], 0] : nonEigenU),
    [nonEigenU, isR2]
  );
  const animatedNonEigenU = useMemo(
    () =>
      applyMatrixToVector(
        currentMatrix,
        effNonEigenU,
        isR2 ? 'R2-R2' : 'R3-R3'
      ),
    [currentMatrix, effNonEigenU, isR2]
  );

  // Presets de casos clásicos de Autovalores y Diagonalización
  const applyPreset = (
    type: 'symmetric' | 'negative-lambda' | 'defective-shear' | 'complex-rot'
  ) => {
    setAnimT(0);
    setTimeout(() => setIsPlaying(true), 40);

    if (type === 'symmetric') {
      // Simétrica: λ₁ = 3, λ₂ = 1 (autovectores ortogonales a 45°), λ₃ = 2
      setMatrixA([
        [2, 1, 0],
        [1, 2, 0],
        [0, 0, 2],
      ]);
    } else if (type === 'negative-lambda') {
      // Un autovalor positivo (λ₁ = 2.5, estiramiento) y uno negativo (λ₂ = -1.5, inversión de sentido)
      setMatrixA([
        [0.5, 2, 0],
        [2, 0.5, 0],
        [0, 0, -1],
      ]);
    } else if (type === 'defective-shear') {
      // Bloque de Jordan (Cizallamiento): λ = 1.5 con m_a = 2, m_g = 1 -> NO Diagonalizable
      setMatrixA([
        [1.5, 1.5, 0],
        [0, 1.5, 0],
        [0, 0, 2],
      ]);
    } else if (type === 'complex-rot') {
      // Rotación en el plano XY: autovalores complejos λ = cos(60°) ± i*sin(60°)
      // En R2 no hay rectas invariantes; en R3 la única recta invariante es el eje Z (λ = 1)
      setMatrixA([
        [0.5, -0.87, 0],
        [0.87, 0.5, 0],
        [0, 0, 1.5],
      ]);
    }
  };

  const handleCellChange = (r: number, c: number, raw: string) => {
    const parsed = parseFloat(raw);
    const val = Number.isNaN(parsed) ? 0 : Math.max(-8, Math.min(8, parsed));
    const next: Matrix3x3 = [
      [...matrixA[0]],
      [...matrixA[1]],
      [...matrixA[2]],
    ];
    next[r][c] = val;
    setMatrixA(next);
  };

  const legendItems = useMemo(() => {
    const items: { color: string; label: string; value?: string }[] = [];
    eigenAnalysis.allEigenvectors.forEach((ev, idx) => {
      items.push({
        color: ev.color,
        label: `v⃗_${idx + 1} (λ = ${formatNum(ev.lambda, 2)})`,
        value: formatVector(ev.vector, isR2, 2),
      });
    });
    if (showNonEigenVector) {
      items.push({
        color: '#facc15',
        label: 'A·u⃗ (No propio: cambia dirección)',
      });
    }
    return items;
  }, [eigenAnalysis.allEigenvectors, isR2, showNonEigenVector]);

  return (
    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">
      {/* ESCENA 3D / 2D */}
      <div className="flex-1 flex flex-col h-[52vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Barra superior de casos notables */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 z-20">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs font-semibold text-slate-400 mr-1">
              Casos Notables:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('symmetric')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-200 transition-colors"
            >
              Simétrica (Ortogonal)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('negative-lambda')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-950/70 hover:bg-purple-900/80 border border-purple-500/40 text-purple-200 transition-colors"
            >
              Inversión (λ &lt; 0)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('defective-shear')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/40 text-amber-200 transition-colors"
            >
              No Diagonalizable (Jordan)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('complex-rot')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/40 text-rose-200 transition-colors"
            >
              Rotación (λ ∈ ℂ)
            </button>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Lienzo 3D / 2D */}
        <div className="flex-1 relative">
          <Scene3D dimension={dimension} legendItems={legendItems}>
            {/* Círculo testigo deformándose en elipse según direcciones propias */}
            {showDeformedCircle && (
              <UnitCircleDeformation
                currentMatrix={currentMatrix}
                isR2={isR2}
              />
            )}

            {/* Rectas Invariantes y Autovectores v_i -> λ_i * v_i */}
            {eigenAnalysis.allEigenvectors.map((ev, idx) => {
              // Escalamos el autovector base a longitud 2 para mejor lectura visual
              const baseEigenVec = vectorScale(ev.vector, 2);
              const currentFactor = (1 - animT) * 1 + animT * ev.lambda;
              const transformedEigenVec = vectorScale(
                baseEigenVec,
                currentFactor
              );

              return (
                <React.Fragment key={`eigen-${idx}`}>
                  {/* Recta Invariante infinita generada por el autovector */}
                  <InfiniteLine3D
                    point={[0, 0, 0]}
                    direction={ev.vector}
                    color={ev.color}
                    label={`Recta Invariante E_(λ=${formatNum(ev.lambda, 2)})`}
                    showPoint={false}
                    showDirectionVector={false}
                    lineWidth={2.2}
                    isR2={isR2}
                  />

                  {/* Autovector original v_i (referencia punteada) */}
                  <Vector3DObject
                    vector={baseEigenVec}
                    color={ev.color}
                    label={`v⃗_${idx + 1}`}
                    dashed
                    opacity={0.5}
                    lineWidth={2}
                    isR2={isR2}
                  />

                  {/* Autovector transformado A*v_i = λ_i*v_i sobre la misma recta invariante */}
                  <Vector3DObject
                    vector={transformedEigenVec}
                    color={ev.color}
                    label={`λ_${idx + 1}·v⃗_${idx + 1} (λ=${formatNum(
                      ev.lambda,
                      2
                    )})`}
                    isR2={isR2}
                    lineWidth={4.5}
                  />
                </React.Fragment>
              );
            })}

            {/* Vector genérico NO propio u que se sale de su recta de acción original */}
            {showNonEigenVector && (
              <>
                <Line
                  points={[
                    vectorScale(effNonEigenU, -3.5),
                    vectorScale(effNonEigenU, 3.5),
                  ]}
                  color="#94a3b8"
                  lineWidth={1.2}
                  dashed
                  dashSize={0.25}
                  gapSize={0.2}
                  transparent
                  opacity={0.45}
                />
                <Vector3DObject
                  vector={effNonEigenU}
                  color="#94a3b8"
                  label="u⃗ (No propio)"
                  dashed
                  opacity={0.65}
                  lineWidth={2.2}
                  isR2={isR2}
                />
                <Vector3DObject
                  vector={animatedNonEigenU}
                  color="#facc15"
                  label="A·u⃗ (Se desvía de su recta)"
                  showCoords
                  isR2={isR2}
                  lineWidth={4}
                />
              </>
            )}
          </Scene3D>
        </div>
      </div>

      {/* PANEL DERECHO: CONTROLES, POLINOMIO CARACTERÍSTICO Y DIAGONALIZACIÓN */}
      <div className="w-full lg:w-[465px] xl:w-[510px] h-[48vh] lg:h-full bg-slate-950 flex flex-col overflow-y-auto shrink-0">
        {/* 1. Animación del Estiramiento / Inversión por λ */}
        <div className="p-4 border-b border-slate-800/90 bg-slate-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Acción de A sobre Autovectores (A·v⃗ = λ·v⃗)
            </h2>
            <span className="font-mono text-xs text-amber-300 font-bold">
              t = {formatNum(animT * 100, 0)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Animar λ·v⃗</span>
                </>
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={animT}
              onChange={(e) => {
                setIsPlaying(false);
                setAnimT(parseFloat(e.target.value));
              }}
              className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setAnimT(0);
              }}
              title="Reiniciar a t = 0"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showNonEigenVector}
                onChange={(e) => setShowNonEigenVector(e.target.checked)}
                className="accent-yellow-400 rounded"
              />
              <span>Comparar con vector no propio u⃗</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showDeformedCircle}
                onChange={(e) => setShowDeformedCircle(e.target.checked)}
                className="accent-indigo-500 rounded"
              />
              <span>Círculo → Elipse de semiejes propios</span>
            </label>
          </div>
        </div>

        {/* 2. Editor de la Matriz A */}
        <div className="p-4 border-b border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Matriz Cuadrada A ({isR2 ? '2×2' : '3×3'})
            </h3>
            <span className="font-mono text-[11px] text-slate-400">
              tr(A) = {formatNum(eigenAnalysis.traceVal, 2)} | det(A) ={' '}
              {formatNum(eigenAnalysis.detVal, 2)}
            </span>
          </div>

          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
            {Array.from({ length: size }).map((_, r) => (
              <div
                key={r}
                className={`grid gap-2 px-2 ${
                  isR2 ? 'grid-cols-2' : 'grid-cols-3'
                }`}
              >
                {Array.from({ length: size }).map((__, c) => (
                  <input
                    key={`${r}-${c}`}
                    type="number"
                    step={0.5}
                    value={matrixA[r][c]}
                    onChange={(e) => handleCellChange(r, c, e.target.value)}
                    className="w-full px-2 py-1 text-center font-mono text-xs font-semibold rounded bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:outline-none"
                  />
                ))}
              </div>
            ))}
          </div>

          {showNonEigenVector && (
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">
                  Vector de prueba u⃗ = {formatVector(effNonEigenU, isR2, 1)}
                </span>
                <span className="text-yellow-300 font-bold">
                  A·u⃗ = {formatVector(animatedNonEigenU, isR2, 2)}
                </span>
              </div>
              <div className={`grid gap-2 ${isR2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {Array.from({ length: size }).map((_, idx) => (
                  <input
                    key={idx}
                    type="number"
                    step={0.5}
                    value={nonEigenU[idx]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const next: Vector3Tuple = [...nonEigenU] as Vector3Tuple;
                      next[idx] = val;
                      setNonEigenU(next);
                    }}
                    className="w-full px-2 py-1 text-center font-mono text-xs rounded bg-slate-950 border border-slate-800 text-white"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Polinomio Característico, Autovalores y Diagonalización */}
        <div className="p-4 space-y-3 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            Polinomio Característico, Autovalores y Diagonalización
          </h3>

          {/* Ecuación Característica det(A - λI) = 0 */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-1">
            <div className="text-[11px] font-sans text-slate-400">
              Polinomio Característico p(λ) = det(A - λI) = 0
            </div>
            <div className="text-indigo-300 font-bold text-sm">
              {eigenAnalysis.characteristicPolynomialText}
            </div>
          </div>

          {/* Lista de Autovalores, Multiplicidades y Subespacios Propios */}
          <div className="space-y-2">
            {eigenAnalysis.eigenGroups.map((grp, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-sky-300">
                    λ = {formatNum(grp.lambda, 3)}
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                      m_alg = {grp.algebraicMultiplicity}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded border font-bold ${
                        grp.geometricMultiplicity === grp.algebraicMultiplicity
                          ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                      }`}
                    >
                      m_geom = {grp.geometricMultiplicity}
                    </span>
                  </div>
                </div>

                <div className="text-slate-300">
                  Base de E_λ = Nu(A - λI): &#123;
                  {grp.eigenvectors
                    .map((v) => formatVector(v, isR2, 2))
                    .join(', ')}
                  &#125;
                </div>

                <div className="text-[11px] font-sans text-slate-400">
                  Efecto sobre la recta invariante:{' '}
                  <strong className="text-slate-200">
                    {Math.abs(grp.lambda) < 1e-6
                      ? 'Colapso al origen (λ = 0 → Matriz Singular)'
                      : grp.lambda < 0
                      ? `Inversión de sentido (180°) y factor ×${formatNum(
                          Math.abs(grp.lambda),
                          2
                        )}`
                      : Math.abs(grp.lambda - 1) < 1e-6
                      ? 'Puntos fijos invariantes (λ = 1)'
                      : `Mismo sentido y estiramiento ×${formatNum(
                          grp.lambda,
                          2
                        )}`}
                  </strong>
                </div>
              </div>
            ))}

            {eigenAnalysis.hasComplexEigenvalues && (
              <div className="p-3 rounded-xl bg-rose-950/35 border border-rose-500/45 font-mono text-xs space-y-1">
                <div className="font-bold text-rose-300">
                  Autovalores Complejos Conjugados en ℂ: {eigenAnalysis.complexPairText}
                </div>
                <p className="text-[11px] font-sans text-rose-200/90 leading-relaxed">
                  Un par complejo conjugado induce una rotación en el plano y no
                  posee autovectores ni rectas invariantes reales en ℝ².
                </p>
              </div>
            )}
          </div>

          {/* Diagonalización A = P * D * P^(-1) */}
          {eigenAnalysis.isDiagonalizable &&
          eigenAnalysis.matrixP &&
          eigenAnalysis.matrixD &&
          eigenAnalysis.matrixPInv ? (
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-950/35 border border-emerald-500/45 text-xs text-emerald-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Matriz Diagonalizable en ℝ: A = P · D · P⁻¹
                  </span>
                </span>
                {eigenAnalysis.isSymmetric && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px] font-mono">
                    Simétrica (Pᵀ = P⁻¹)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <CompactMatrixCard
                  title="Autovectores"
                  symbol="P"
                  matrix={eigenAnalysis.matrixP}
                  isR2={isR2}
                  accent="text-sky-300"
                />
                <CompactMatrixCard
                  title="Autovalores"
                  symbol="D"
                  matrix={eigenAnalysis.matrixD}
                  isR2={isR2}
                  accent="text-emerald-300"
                />
                <CompactMatrixCard
                  title="Cambio Base"
                  symbol="P⁻¹"
                  matrix={eigenAnalysis.matrixPInv}
                  isR2={isR2}
                  accent="text-amber-300"
                />
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-950/35 border border-amber-500/45 text-xs text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Matriz No Diagonalizable en ℝ</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {eigenAnalysis.hasComplexEigenvalues
                  ? 'La matriz posee autovalores complejos no reales, por lo que no admite una base de autovectores en ℝ.'
                  : `La suma de las multiplicidades geométricas es menor que ${size} (m_geom < m_alg), por lo que no existen ${size} autovectores linealmente independientes para formar una base de ${
                      isR2 ? 'ℝ²' : 'ℝ³'
                    }.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
