import React, { useState, useMemo, useEffect } from 'react';
import {
  Sliders,
  Calculator,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  CheckCircle2,
  Infinity as InfinityIcon,
  XCircle,
  Sparkles,
} from 'lucide-react';
import type { DimensionMode, Vector3Tuple } from '../types/curriculum';
import {
  formatNum,
  formatVector,
  solveLinearSystemGaussJordan,
  rowTo2DLine,
  type Matrix3x3,
} from '../utils/mathUtils';
import { Scene3D } from '../components/canvas/Scene3D';
import {
  Point3DObject,
  InfiniteLine3D,
  Plane3DObject,
} from '../components/canvas/LineAndPlanePrimitives';

const EQ_COLORS = ['#38bdf8', '#34d399', '#a855f7'];

export const Unit5LinearSystems: React.FC = () => {
  const [dimension, setDimension] = useState<DimensionMode>('R3');

  // Matriz de coeficientes A y vector de términos independientes b
  const [matrixA, setMatrixA] = useState<Matrix3x3>([
    [1, 1, 1],
    [2, -1, 1],
    [1, 2, -1],
  ]);
  const [vectorB, setVectorB] = useState<Vector3Tuple>([6, 3, 2]);

  // Paso activo del algoritmo de Gauss-Jordan
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  // Opción para visualizar en 3D/2D las ecuaciones del paso actual de Gauss-Jordan vs originales
  const [visualizeCurrentStepGeometry, setVisualizeCurrentStepGeometry] =
    useState<boolean>(false);

  // Visibilidad de cada ecuación en la escena
  const [visibleEqs, setVisibleEqs] = useState<[boolean, boolean, boolean]>([
    true,
    true,
    true,
  ]);

  const isR2 = dimension === 'R2';
  const size = isR2 ? 2 : 3;

  // Análisis completo de Gauss-Jordan y Rouché-Frobenius
  const analysis = useMemo(
    () => solveLinearSystemGaussJordan(matrixA, vectorB, isR2),
    [matrixA, vectorB, isR2]
  );

  // Asegurar que el índice de paso esté siempre dentro de rango cuando cambia el sistema
  useEffect(() => {
    setCurrentStepIdx((prev) =>
      Math.min(prev, Math.max(0, analysis.steps.length - 1))
    );
  }, [analysis.steps.length]);

  const activeStep =
    analysis.steps[
      Math.min(currentStepIdx, Math.max(0, analysis.steps.length - 1))
    ];

  // Presets de casos geométricos clásicos (SCD, SCI, SI)
  const applyPreset = (presetType: 'SCD' | 'SCI' | 'SI') => {
    setCurrentStepIdx(0);
    if (isR2) {
      if (presetType === 'SCD') {
        // Dos rectas secantes en (2, 1)
        setMatrixA([
          [2, 1, 0],
          [1, -1, 0],
          [0, 0, 1],
        ]);
        setVectorB([5, 1, 0]);
      } else if (presetType === 'SCI') {
        // Dos rectas coincidentes (F2 = 2 * F1)
        setMatrixA([
          [1, 2, 0],
          [2, 4, 0],
          [0, 0, 1],
        ]);
        setVectorB([4, 8, 0]);
      } else {
        // Dos rectas paralelas distintas (incompatibles)
        setMatrixA([
          [1, 2, 0],
          [2, 4, 0],
          [0, 0, 1],
        ]);
        setVectorB([4, -4, 0]);
      }
    } else {
      if (presetType === 'SCD') {
        // Tres planos que se cortan en el único punto S = (1, 2, 3)
        setMatrixA([
          [1, 1, 1],
          [2, -1, 1],
          [1, 2, -1],
        ]);
        setVectorB([6, 3, 2]);
      } else if (presetType === 'SCI') {
        // Haz de 3 planos que se cortan en una recta común (F3 = F1 + F2)
        setMatrixA([
          [1, 1, 1],
          [1, -1, 2],
          [2, 0, 3],
        ]);
        setVectorB([4, 2, 6]);
      } else {
        // Tres planos en "tienda de campaña" (rg(A)=2 < rg(A|b)=3) sin punto común
        setMatrixA([
          [1, 1, 1],
          [1, -1, 2],
          [2, 0, 3],
        ]);
        setVectorB([4, 2, -3]);
      }
    }
  };

  const handleCoefChange = (r: number, c: number, raw: string) => {
    const parsed = parseFloat(raw);
    const val = Number.isNaN(parsed) ? 0 : Math.max(-15, Math.min(15, parsed));
    const next: Matrix3x3 = [
      [...matrixA[0]],
      [...matrixA[1]],
      [...matrixA[2]],
    ];
    next[r][c] = val;
    setMatrixA(next);
  };

  const handleBChange = (r: number, raw: string) => {
    const parsed = parseFloat(raw);
    const val = Number.isNaN(parsed) ? 0 : Math.max(-25, Math.min(25, parsed));
    const next: Vector3Tuple = [...vectorB] as Vector3Tuple;
    next[r] = val;
    setVectorB(next);
  };

  // Matriz ampliada cuyas ecuaciones vamos a graficar en la escena (original o paso actual)
  const displayedAugmented = useMemo(() => {
    if (visualizeCurrentStepGeometry && activeStep) {
      return activeStep.augmentedMatrix;
    }
    return analysis.steps[0].augmentedMatrix;
  }, [visualizeCurrentStepGeometry, activeStep, analysis.steps]);

  // Leyenda dinámica
  const legendItems = useMemo(() => {
    const items: { color: string; label: string; value?: string }[] = [];
    for (let i = 0; i < size; i++) {
      if (!visibleEqs[i]) continue;
      items.push({
        color: EQ_COLORS[i],
        label: isR2 ? `Recta L_${i + 1}` : `Plano π_${i + 1}`,
      });
    }
    if (analysis.classification === 'SCD' && analysis.uniqueSolution) {
      items.push({
        color: '#facc15',
        label: 'Solución Única S',
        value: formatVector(analysis.uniqueSolution, isR2, 2),
      });
    } else if (analysis.classification === 'SCI') {
      items.push({
        color: '#facc15',
        label: 'Infinitas Soluciones (SCI)',
      });
    } else {
      items.push({
        color: '#f43f5e',
        label: 'Sin Solución Común (SI)',
      });
    }
    return items;
  }, [size, visibleEqs, isR2, analysis]);

  return (
    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">
      {/* ESCENA GRÁFICA 2D / 3D */}
      <div className="flex-1 flex flex-col h-[50vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Barra superior: Presets SCD / SCI / SI y Dimensión */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 z-20">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 mr-1">
              Casos Geométricos:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('SCD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                analysis.classification === 'SCD'
                  ? 'bg-emerald-600/25 border-emerald-500/60 text-emerald-200'
                  : 'bg-slate-800/80 border-slate-700/70 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>SCD (Única Solución)</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('SCI')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                analysis.classification === 'SCI'
                  ? 'bg-amber-600/25 border-amber-500/60 text-amber-200'
                  : 'bg-slate-800/80 border-slate-700/70 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <InfinityIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>SCI (Infinitas Soluciones)</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('SI')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                analysis.classification === 'SI'
                  ? 'bg-rose-600/25 border-rose-500/60 text-rose-200'
                  : 'bg-slate-800/80 border-slate-700/70 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>SI (Incompatible)</span>
            </button>
          </div>

          {/* Toggle R2 / R3 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Sistema:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setDimension('R2');
                  setCurrentStepIdx(0);
                }}
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
                onClick={() => {
                  setDimension('R3');
                  setCurrentStepIdx(0);
                }}
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
            {/* Graficar Rectas (en R2) o Planos (en R3) de cada ecuación */}
            {displayedAugmented.map((row, idx) => {
              if (!visibleEqs[idx]) return null;
              if (isR2) {
                const lineObj = rowTo2DLine(row[0], row[1], row[2]);
                if (!lineObj) return null;
                return (
                  <InfiniteLine3D
                    key={`line-${idx}`}
                    point={lineObj.point}
                    direction={lineObj.dir}
                    color={EQ_COLORS[idx]}
                    label={`L_${idx + 1}`}
                    showPoint={false}
                    showDirectionVector={false}
                    lineWidth={3.5}
                    isR2
                  />
                );
              } else {
                const normal: Vector3Tuple = [row[0], row[1], row[2]];
                const dTerm = -row[3];
                return (
                  <Plane3DObject
                    key={`plane-${idx}`}
                    normal={normal}
                    dTerm={dTerm}
                    color={EQ_COLORS[idx]}
                    opacity={0.26}
                    size={12}
                    label={`π_${idx + 1}`}
                    showNormalVector={false}
                  />
                );
              }
            })}

            {/* Punto Solución Única (SCD) */}
            {analysis.classification === 'SCD' && analysis.uniqueSolution && (
              <Point3DObject
                position={analysis.uniqueSolution}
                color="#facc15"
                label="Solución S"
                isR2={isR2}
                radius={0.22}
                showDropLines={!isR2}
              />
            )}

            {/* Recta de Infinitas Soluciones (SCI) */}
            {analysis.classification === 'SCI' && analysis.solutionLine && (
              <InfiniteLine3D
                point={analysis.solutionLine.point}
                direction={analysis.solutionLine.dir}
                color="#facc15"
                label="Recta Solución (SCI)"
                lineWidth={4.5}
                showPoint
                pointLabel="P_sol"
                showDirectionVector={false}
                isR2={isR2}
              />
            )}
          </Scene3D>
        </div>
      </div>

      {/* PANEL DERECHO: SISTEMA + GAUSS-JORDAN PASO A PASO + ROUCHÉ-FROBENIUS */}
      <div className="w-full lg:w-[460px] xl:w-[510px] h-[50vh] lg:h-full bg-slate-950 flex flex-col overflow-y-auto shrink-0">
        {/* 1. Editor del Sistema de Ecuaciones */}
        <div className="p-4 border-b border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Sistema de Ecuaciones Lineales (A·x⃗ = b⃗)
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              det(A) = {formatNum(analysis.determinantA, 2)}
            </span>
          </div>

          <div className="space-y-2">
            {Array.from({ length: size }).map((_, r) => (
              <div
                key={r}
                className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900/90 border border-slate-800"
              >
                <input
                  type="checkbox"
                  checked={visibleEqs[r]}
                  onChange={() => {
                    const next: [boolean, boolean, boolean] = [...visibleEqs];
                    next[r] = !next[r];
                    setVisibleEqs(next);
                  }}
                  className="rounded cursor-pointer"
                  title="Mostrar/ocultar en escena"
                />
                <span
                  className="font-mono text-xs font-bold w-6"
                  style={{ color: EQ_COLORS[r] }}
                >
                  E{r + 1}:
                </span>

                <input
                  type="number"
                  step={0.5}
                  value={matrixA[r][0]}
                  onChange={(e) => handleCoefChange(r, 0, e.target.value)}
                  className="w-14 px-1.5 py-1 text-right font-mono text-xs rounded bg-slate-950 border border-slate-800 text-white"
                />
                <span className="font-mono text-xs text-slate-400">x +</span>

                <input
                  type="number"
                  step={0.5}
                  value={matrixA[r][1]}
                  onChange={(e) => handleCoefChange(r, 1, e.target.value)}
                  className="w-14 px-1.5 py-1 text-right font-mono text-xs rounded bg-slate-950 border border-slate-800 text-white"
                />
                <span className="font-mono text-xs text-slate-400">
                  {isR2 ? 'y =' : 'y +'}
                </span>

                {!isR2 && (
                  <>
                    <input
                      type="number"
                      step={0.5}
                      value={matrixA[r][2]}
                      onChange={(e) => handleCoefChange(r, 2, e.target.value)}
                      className="w-14 px-1.5 py-1 text-right font-mono text-xs rounded bg-slate-950 border border-slate-800 text-white"
                    />
                    <span className="font-mono text-xs text-slate-400">z =</span>
                  </>
                )}

                <input
                  type="number"
                  step={0.5}
                  value={vectorB[r]}
                  onChange={(e) => handleBChange(r, e.target.value)}
                  className="w-14 px-1.5 py-1 text-right font-mono text-xs font-bold rounded bg-indigo-950/60 border border-indigo-500/40 text-indigo-200"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 2. Eliminación de Gauss-Jordan Paso a Paso */}
        <div className="p-4 border-b border-slate-800/90 bg-slate-900/35 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Eliminación de Gauss-Jordan Paso a Paso
            </h3>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-amber-300">
              Paso {currentStepIdx + 1} de {analysis.steps.length}
            </span>
          </div>

          {/* Controles de reproducción */}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              disabled={currentStepIdx === 0}
              onClick={() => setCurrentStepIdx(0)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-200"
              title="Ir al inicio"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={currentStepIdx === 0}
              onClick={() => setCurrentStepIdx((i) => Math.max(0, i - 1))}
              className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <button
              type="button"
              disabled={currentStepIdx >= analysis.steps.length - 1}
              onClick={() =>
                setCurrentStepIdx((i) =>
                  Math.min(analysis.steps.length - 1, i + 1)
                )
              }
              className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white flex items-center justify-center gap-1 shadow-sm"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={currentStepIdx >= analysis.steps.length - 1}
              onClick={() => setCurrentStepIdx(analysis.steps.length - 1)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-200"
              title="Ir a la matriz escalonada reducida (RREF)"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Detalle de la Operación Elemental de Fila y Matriz Ampliada */}
          {activeStep && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-200">
                  {activeStep.title}
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 font-mono text-xs font-bold text-indigo-300">
                  {activeStep.operationCode}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {activeStep.description}
              </p>

              {/* Matriz Ampliada [A | b] con resaltado de pivote */}
              <div className="relative px-3 py-2 bg-slate-950/80 rounded-lg border border-slate-800/80">
                <div className="absolute left-1.5 top-1.5 bottom-1.5 w-2 border-l-2 border-t-2 border-b-2 border-slate-500 rounded-l-sm pointer-events-none" />
                <div className="absolute right-1.5 top-1.5 bottom-1.5 w-2 border-r-2 border-t-2 border-b-2 border-slate-500 rounded-r-sm pointer-events-none" />

                <div className="space-y-1.5">
                  {activeStep.augmentedMatrix.map((row, rIdx) => {
                    const isPivotRow = activeStep.pivotRow === rIdx;
                    const isTargetRow = activeStep.targetRow === rIdx;
                    return (
                      <div
                        key={rIdx}
                        className={`flex items-center gap-1.5 px-1.5 py-1 rounded transition-colors ${
                          isTargetRow
                            ? 'bg-amber-500/15 border border-amber-500/40'
                            : isPivotRow
                            ? 'bg-indigo-500/15 border border-indigo-500/40'
                            : ''
                        }`}
                      >
                        <span
                          className="text-[10px] font-mono font-bold w-5"
                          style={{ color: EQ_COLORS[rIdx] }}
                        >
                          F{rIdx + 1}
                        </span>
                        {row.slice(0, size).map((val, cIdx) => {
                          const isPivotCell =
                            isPivotRow && activeStep.pivotCol === cIdx;
                          return (
                            <div
                              key={cIdx}
                              className={`flex-1 text-center font-mono text-xs py-0.5 rounded ${
                                isPivotCell
                                  ? 'bg-indigo-600 text-white font-bold'
                                  : 'text-slate-200'
                              }`}
                            >
                              {formatNum(val, 2)}
                            </div>
                          );
                        })}
                        <div className="h-4 w-px bg-slate-600 mx-1" />
                        <div className="w-16 text-center font-mono text-xs font-bold text-amber-300">
                          {formatNum(row[size], 2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visualizeCurrentStepGeometry}
                  onChange={(e) =>
                    setVisualizeCurrentStepGeometry(e.target.checked)
                  }
                  className="accent-indigo-500 rounded"
                />
                <span>
                  Graficar en la escena {isR2 ? 'las rectas' : 'los planos'} del
                  paso actual (ver invarianza de la solución)
                </span>
              </label>
            </div>
          )}
        </div>

        {/* 3. Teorema de Rouché-Frobenius y Conjunto Solución */}
        <div className="p-4 space-y-3 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            Teorema de Rouché-Frobenius y Clasificación
          </h3>

          <div className="grid grid-cols-3 gap-2 font-mono text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-[10px] font-sans text-slate-400">
                Rango Matriz A
              </div>
              <div className="text-base font-bold text-indigo-300">
                rg(A) = {analysis.rankA}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-[10px] font-sans text-slate-400">
                Rango Ampliada
              </div>
              <div className="text-base font-bold text-amber-300">
                rg(A|b) = {analysis.rankAugmented}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-[10px] font-sans text-slate-400">
                Incógnitas (n)
              </div>
              <div className="text-base font-bold text-emerald-300">
                n = {analysis.numVariables}
              </div>
            </div>
          </div>

          {analysis.classification === 'SCD' && analysis.uniqueSolution && (
            <div className="p-3.5 rounded-xl bg-emerald-950/35 border border-emerald-500/45 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300">
                  Sistema Compatible Determinado (SCD)
                </span>
                <span className="font-mono text-[11px] text-emerald-200">
                  rg(A) = rg(A|b) = n = {size}
                </span>
              </div>
              <div className="font-mono text-sm font-bold text-white pt-1 border-t border-emerald-500/30">
                S = &#123; {formatVector(analysis.uniqueSolution, isR2, 3)} &#125;
              </div>
              <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                Geométricamente,{' '}
                {isR2
                  ? 'las dos rectas son secantes y se cortan en un único punto.'
                  : 'los tres planos concurren exactamente en un único punto común del espacio ℝ³.'}
              </p>
            </div>
          )}

          {analysis.classification === 'SCI' && (
            <div className="p-3.5 rounded-xl bg-amber-950/35 border border-amber-500/45 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">
                  Sistema Compatible Indeterminado (SCI)
                </span>
                <span className="font-mono text-[11px] text-amber-200">
                  rg(A) = rg(A|b) = {analysis.rankA} &lt; n ({size})
                </span>
              </div>
              <div className="font-mono text-xs font-semibold text-white pt-1 border-t border-amber-500/30">
                Infinitas soluciones con {analysis.degreesOfFreedom}{' '}
                {analysis.degreesOfFreedom === 1
                  ? 'variable libre (1 grado de libertad)'
                  : 'variables libres'}
              </div>
              {analysis.solutionLine && (
                <div className="font-mono text-xs text-amber-300">
                  Recta solución: P(t) ={' '}
                  {formatVector(analysis.solutionLine.point, isR2, 2)} + t·
                  {formatVector(analysis.solutionLine.dir, isR2, 2)}
                </div>
              )}
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Geométricamente,{' '}
                {isR2
                  ? 'ambas ecuaciones representan la misma recta coincidente.'
                  : 'los tres planos forman un haz que se intersecta a lo largo de una recta común (amarilla).'}
              </p>
            </div>
          )}

          {analysis.classification === 'SI' && (
            <div className="p-3.5 rounded-xl bg-rose-950/35 border border-rose-500/45 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300">
                  Sistema Incompatible (SI — Sin Solución)
                </span>
                <span className="font-mono text-[11px] text-rose-200">
                  rg(A) = {analysis.rankA} ≠ rg(A|b) = {analysis.rankAugmented}
                </span>
              </div>
              <div className="font-mono text-sm font-bold text-white pt-1 border-t border-rose-500/30">
                Conjunto Solución: S = ∅ (Vacío)
              </div>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                En la matriz escalonada reducida aparece una fila contradictoria
                de la forma <code>0 = k (k ≠ 0)</code>. Geométricamente, no
                existe ningún punto que pertenezca simultáneamente a{' '}
                {isR2 ? 'ambas rectas.' : 'los tres planos.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
