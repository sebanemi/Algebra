import React, { useState, useMemo, useEffect } from 'react';
import { Line } from '@react-three/drei';
import {
  Sliders,
  Calculator,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { DimensionMode, Vector3Tuple } from '../types/curriculum';
import {
  formatNum,
  formatVector,
  vectorAdd,
  vectorScale,
  matrixColumnsAsVectors,
  getEffectiveTransformationMatrix,
  applyMatrixToVector,
  analyzeLinearTransformation,
  type Matrix3x3,
  type TransformationSpaceMode,
} from '../utils/mathUtils';
import { Scene3D } from '../components/canvas/Scene3D';
import { Vector3DObject } from '../components/canvas/Vector3DObject';
import {
  Parallelogram3D,
  Parallelepiped3D,
} from '../components/canvas/GeometryPrimitives';
import {
  InfiniteLine3D,
  Plane3DObject,
  Point3DObject,
} from '../components/canvas/LineAndPlanePrimitives';

interface DeformedGridProps {
  c1: Vector3Tuple;
  c2: Vector3Tuple;
  range?: number;
}

/**
 * Grilla espacial que se deforma continuamente según las primeras dos columnas de M(t)
 */
const DeformedGrid: React.FC<DeformedGridProps> = ({ c1, c2, range = 4 }) => {
  const lines = useMemo(() => {
    const segs: [Vector3Tuple, Vector3Tuple][] = [];
    for (let i = -range; i <= range; i++) {
      const s1 = vectorAdd(vectorScale(c2, i), vectorScale(c1, -range));
      const e1 = vectorAdd(vectorScale(c2, i), vectorScale(c1, range));
      segs.push([s1, e1]);

      const s2 = vectorAdd(vectorScale(c1, i), vectorScale(c2, -range));
      const e2 = vectorAdd(vectorScale(c1, i), vectorScale(c2, range));
      segs.push([s2, e2]);
    }
    return segs;
  }, [c1, c2, range]);

  return (
    <group>
      {lines.map((pair, idx) => (
        <Line
          key={idx}
          points={pair}
          color="#818cf8"
          lineWidth={1.1}
          transparent
          opacity={0.35}
        />
      ))}
    </group>
  );
};

const SPACE_MODES: {
  id: TransformationSpaceMode;
  label: string;
  matrixOrder: string;
}[] = [
  { id: 'R2-R2', label: 'ℝ² → ℝ²', matrixOrder: '2×2' },
  { id: 'R3-R3', label: 'ℝ³ → ℝ³', matrixOrder: '3×3' },
  { id: 'R3-R2', label: 'ℝ³ → ℝ²', matrixOrder: '2×3' },
  { id: 'R2-R3', label: 'ℝ² → ℝ³', matrixOrder: '3×2' },
];

export const Unit7LinearTransformations: React.FC = () => {
  const [spaceMode, setSpaceMode] = useState<TransformationSpaceMode>('R3-R3');

  // Matriz asociada A (almacenada en 3x3; se usan las filas/columnas según spaceMode)
  const [matrixA, setMatrixA] = useState<Matrix3x3>([
    [1, 0.8, 0],
    [0, 1, 0],
    [0, 0, 0],
  ]);

  // Vector de prueba x en el Dominio
  const [inputVecX, setInputVecX] = useState<Vector3Tuple>([2, 1.5, 2.5]);

  // Parámetro de animación t ∈ [0, 1] (M(t) = (1-t)I + tA_eff)
  const [animT, setAnimT] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Opciones visuales
  const [showDeformedGrid, setShowDeformedGrid] = useState<boolean>(true);
  const [showSubspaces, setShowSubspaces] = useState<boolean>(true);
  const [showTestVector, setShowTestVector] = useState<boolean>(true);

  const domainDim = spaceMode === 'R2-R2' || spaceMode === 'R2-R3' ? 2 : 3;
  const codomainDim = spaceMode === 'R2-R2' || spaceMode === 'R3-R2' ? 2 : 3;
  // La escena usa vista 2D únicamente cuando tanto dominio como codominio son R2
  const canvasDimension: DimensionMode = spaceMode === 'R2-R2' ? 'R2' : 'R3';
  const isPureR2 = spaceMode === 'R2-R2';

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

  const handleSelectSpaceMode = (nextMode: TransformationSpaceMode) => {
    setSpaceMode(nextMode);
    setAnimT(0);
    if (nextMode === 'R3-R2') {
      // Ejemplo clásico R3 -> R2: Proyección oblicua (x, y, z) -> (x + 0.5z, y + 0.5z)
      setMatrixA([
        [1, 0, 0.5],
        [0, 1, 0.5],
        [0, 0, 0],
      ]);
    } else if (nextMode === 'R2-R3') {
      // Ejemplo clásico R2 -> R3: Inmersión de R2 como un plano inclinado en R3
      setMatrixA([
        [1.5, 0.5, 0],
        [0.5, 1.5, 0],
        [1, 1.2, 0],
      ]);
    } else if (nextMode === 'R2-R2') {
      setMatrixA([
        [1.5, 0.8, 0],
        [0.3, 1.2, 0],
        [0, 0, 1],
      ]);
    } else {
      setMatrixA([
        [1, 0.8, 0],
        [0, 1, 0],
        [0, 0, 0],
      ]);
    }
    setTimeout(() => setIsPlaying(true), 40);
  };

  const effectiveTargetMatrix = useMemo(
    () => getEffectiveTransformationMatrix(matrixA, spaceMode),
    [matrixA, spaceMode]
  );

  // Matriz interpolada en 3D desde el estado de partida del dominio (t=0) hacia la imagen en el codominio (t=1)
  const currentMatrix: Matrix3x3 = useMemo(() => {
    const t = animT;
    const startId: Matrix3x3 =
      domainDim === 2
        ? [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 0],
          ]
        : [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ];
    return [
      [
        (1 - t) * startId[0][0] + t * effectiveTargetMatrix[0][0],
        (1 - t) * startId[0][1] + t * effectiveTargetMatrix[0][1],
        (1 - t) * startId[0][2] + t * effectiveTargetMatrix[0][2],
      ],
      [
        (1 - t) * startId[1][0] + t * effectiveTargetMatrix[1][0],
        (1 - t) * startId[1][1] + t * effectiveTargetMatrix[1][1],
        (1 - t) * startId[1][2] + t * effectiveTargetMatrix[1][2],
      ],
      [
        (1 - t) * startId[2][0] + t * effectiveTargetMatrix[2][0],
        (1 - t) * startId[2][1] + t * effectiveTargetMatrix[2][1],
        (1 - t) * startId[2][2] + t * effectiveTargetMatrix[2][2],
      ],
    ];
  }, [effectiveTargetMatrix, animT, domainDim]);

  const currentCols = useMemo(
    () => matrixColumnsAsVectors(currentMatrix, isPureR2),
    [currentMatrix, isPureR2]
  );

  // Análisis algebraico de Núcleo e Imagen de la matriz objetivo A según spaceMode
  const analysis = useMemo(
    () => analyzeLinearTransformation(matrixA, spaceMode),
    [matrixA, spaceMode]
  );

  // Vector de entrada efectivo (en el dominio R^n) y su imagen animada M(t)*x y final A*x
  const effX: Vector3Tuple = useMemo(
    () => (domainDim === 2 ? [inputVecX[0], inputVecX[1], 0] : inputVecX),
    [inputVecX, domainDim]
  );
  const animatedTX = useMemo(() => {
    const res: Vector3Tuple = [
      currentMatrix[0][0] * effX[0] +
        currentMatrix[0][1] * effX[1] +
        currentMatrix[0][2] * effX[2],
      currentMatrix[1][0] * effX[0] +
        currentMatrix[1][1] * effX[1] +
        currentMatrix[1][2] * effX[2],
      currentMatrix[2][0] * effX[0] +
        currentMatrix[2][1] * effX[1] +
        currentMatrix[2][2] * effX[2],
    ];
    return res;
  }, [currentMatrix, effX]);

  const finalTX = useMemo(
    () => applyMatrixToVector(matrixA, effX, spaceMode),
    [matrixA, effX, spaceMode]
  );

  // Si el Núcleo no es trivial, tomamos un vector testigo del Núcleo y lo animamos colapsando a 0
  const sampleKernelVec: Vector3Tuple | null = useMemo(() => {
    if (analysis.kernelBasis.length === 0) return null;
    const k0 = analysis.kernelBasis[0];
    const len = Math.hypot(k0[0], k0[1], k0[2]);
    if (len < 1e-6) return null;
    return vectorScale(k0, 2.5 / len);
  }, [analysis.kernelBasis]);

  const animatedKernelVec: Vector3Tuple | null = useMemo(() => {
    if (!sampleKernelVec) return null;
    return [
      currentMatrix[0][0] * sampleKernelVec[0] +
        currentMatrix[0][1] * sampleKernelVec[1] +
        currentMatrix[0][2] * sampleKernelVec[2],
      currentMatrix[1][0] * sampleKernelVec[0] +
        currentMatrix[1][1] * sampleKernelVec[1] +
        currentMatrix[1][2] * sampleKernelVec[2],
      currentMatrix[2][0] * sampleKernelVec[0] +
        currentMatrix[2][1] * sampleKernelVec[1] +
        currentMatrix[2][2] * sampleKernelVec[2],
    ];
  }, [sampleKernelVec, currentMatrix]);

  // Galería de transformaciones notables adaptada a cada modo (incluyendo R3->R2 y R2->R3)
  const applyPreset = (
    type:
      | 'shear'
      | 'rotation'
      | 'reflection'
      | 'proj-plane'
      | 'collapse-line'
  ) => {
    setAnimT(0);
    setTimeout(() => setIsPlaying(true), 40);

    if (spaceMode === 'R3-R2') {
      if (type === 'proj-plane') {
        // Proyección canónica (x, y, z) -> (x, y) (Sobreyectiva en R2, Nu = eje Z)
        setMatrixA([
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 0],
        ]);
      } else if (type === 'shear') {
        // Proyección oblicua (sombra en R2)
        setMatrixA([
          [1, 0, -0.8],
          [0, 1, -0.6],
          [0, 0, 0],
        ]);
      } else {
        // Colapso a una recta en R2 (rg = 1, dim Nu = 2)
        setMatrixA([
          [1, 1, 1],
          [2, 2, 2],
          [0, 0, 0],
        ]);
      }
      return;
    }

    if (spaceMode === 'R2-R3') {
      if (type === 'shear' || type === 'rotation') {
        // Inmersión inyectiva (rg = 2, Nu = {0}): levanta R2 a un plano inclinado de R3
        setMatrixA([
          [1.5, 0, 0],
          [0, 1.5, 0],
          [1, 1.2, 0],
        ]);
      } else {
        // No inyectiva R2 -> R3 (rg = 1, dim Nu = 1): aplasta R2 en una recta de R3
        setMatrixA([
          [1, 2, 0],
          [1, 2, 0],
          [1.5, 3, 0],
        ]);
      }
      return;
    }

    if (type === 'shear') {
      setMatrixA([
        [1, 1.2, 0.5],
        [0, 1, 0.5],
        [0, 0, 1],
      ]);
    } else if (type === 'rotation') {
      const c = Number(Math.cos(Math.PI / 3).toFixed(2));
      const s = Number(Math.sin(Math.PI / 3).toFixed(2));
      setMatrixA([
        [c, -s, 0],
        [s, c, 0],
        [0, 0, 1],
      ]);
    } else if (type === 'reflection') {
      setMatrixA([
        [0, 1, 0],
        [1, 0, 0],
        [0, 0, 1],
      ]);
    } else if (type === 'proj-plane') {
      if (spaceMode === 'R2-R2') {
        setMatrixA([
          [1, 0, 0],
          [0, 0, 0],
          [0, 0, 1],
        ]);
      } else {
        setMatrixA([
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 0],
        ]);
      }
    } else if (type === 'collapse-line') {
      setMatrixA([
        [1, 1, 1],
        [0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5],
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
    const items: { color: string; label: string; value?: string }[] = [
      {
        color: '#38bdf8',
        label: 'T(ê₁)',
        value: formatVector(currentCols.c1, codomainDim === 2, 1),
      },
      {
        color: '#34d399',
        label: 'T(ê₂)',
        value: formatVector(currentCols.c2, codomainDim === 2, 1),
      },
    ];
    if (domainDim === 3) {
      items.push({
        color: '#fb923c',
        label: 'T(ê₃)',
        value: formatVector(currentCols.c3, codomainDim === 2, 1),
      });
    }
    if (showTestVector) {
      items.push({
        color: '#facc15',
        label: `T(x⃗) ∈ ℝ${codomainDim === 2 ? '²' : '³'}`,
        value: formatVector(animatedTX, codomainDim === 2, 2),
      });
    }
    if (analysis.nullity > 0) {
      items.push({
        color: '#f43f5e',
        label: `Núcleo Nu(T) ⊂ ℝ${domainDim === 2 ? '²' : '³'} (dim=${
          analysis.nullity
        })`,
      });
    }
    return items;
  }, [
    currentCols,
    domainDim,
    codomainDim,
    showTestVector,
    animatedTX,
    analysis.nullity,
  ]);

  return (
    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">
      {/* ESCENA 3D / 2D */}
      <div className="flex-1 flex flex-col h-[52vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Barra superior: Selector de espacios V -> W y Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 z-20">
          {/* Selector de los 4 casos: R2->R2, R3->R3, R3->R2, R2->R3 */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {SPACE_MODES.map((sm) => {
              const active = spaceMode === sm.id;
              return (
                <button
                  key={sm.id}
                  type="button"
                  onClick={() => handleSelectSpaceMode(sm.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                    active
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{sm.label}</span>
                  <span
                    className={`text-[10px] px-1 rounded ${
                      active
                        ? 'bg-indigo-800 text-indigo-200'
                        : 'bg-slate-900 text-slate-500'
                    }`}
                  >
                    {sm.matrixOrder}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Botones de ejemplos rápidos */}
          <div className="flex flex-wrap items-center gap-1">
            {spaceMode === 'R3-R2' ? (
              <>
                <button
                  type="button"
                  onClick={() => applyPreset('proj-plane')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Proyección Canónica (x,y)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('shear')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Sombra Oblicua 3D→2D
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('collapse-line')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-950/70 border border-amber-500/40 text-amber-200"
                >
                  Colapso a Recta (rg=1)
                </button>
              </>
            ) : spaceMode === 'R2-R3' ? (
              <>
                <button
                  type="button"
                  onClick={() => applyPreset('shear')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950/70 border border-emerald-500/40 text-emerald-200"
                >
                  Inmersión en Plano 3D (Inyectiva)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('collapse-line')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-950/70 border border-rose-500/40 text-rose-200"
                >
                  Colapso a Recta 3D (Nu≠0)
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => applyPreset('shear')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Cizallamiento
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('rotation')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Rotación 60°
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('proj-plane')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-950/70 border border-rose-500/40 text-rose-200"
                >
                  Proyección (Nu≠0)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Lienzo 3D / 2D */}
        <div className="flex-1 relative">
          <Scene3D dimension={canvasDimension} legendItems={legendItems}>
            {/* Grilla deformada en tiempo real */}
            {showDeformedGrid && (
              <DeformedGrid c1={currentCols.c1} c2={currentCols.c2} />
            )}

            {/* Región unitaria del dominio transformada */}
            {domainDim === 2 ? (
              <Parallelogram3D
                u={currentCols.c1}
                v={currentCols.c2}
                color="#6366f1"
                opacity={0.24}
              />
            ) : (
              <Parallelepiped3D
                u={currentCols.c1}
                v={currentCols.c2}
                w={currentCols.c3}
                color="#6366f1"
                opacity={0.18}
              />
            )}

            {/* Vectores de la Base Canónica del Dominio Transformados: T(e1), T(e2), (T(e3)) */}
            <Vector3DObject
              vector={currentCols.c1}
              color="#38bdf8"
              label="T(ê₁)"
              isR2={isPureR2}
              lineWidth={3.8}
            />
            <Vector3DObject
              vector={currentCols.c2}
              color="#34d399"
              label="T(ê₂)"
              isR2={isPureR2}
              lineWidth={3.8}
            />
            {domainDim === 3 && (
              <Vector3DObject
                vector={currentCols.c3}
                color="#fb923c"
                label="T(ê₃)"
                lineWidth={3.8}
              />
            )}

            {/* Vector de prueba x ∈ Dominio y su imagen animada T(x) ∈ Codominio */}
            {showTestVector && (
              <>
                <Vector3DObject
                  vector={effX}
                  color="#94a3b8"
                  label={`x⃗ ∈ ℝ${domainDim === 2 ? '²' : '³'}`}
                  dashed
                  opacity={0.65}
                  lineWidth={2}
                  isR2={isPureR2}
                />
                <Vector3DObject
                  vector={animatedTX}
                  color="#facc15"
                  label={`T(x⃗) ∈ ℝ${codomainDim === 2 ? '²' : '³'}`}
                  showCoords
                  isR2={codomainDim === 2}
                  lineWidth={4.5}
                />
              </>
            )}

            {/* Visualización Geométrica del NÚCLEO Nu(T) y de la IMAGEN Im(T) */}
            {showSubspaces && (
              <>
                {/* IMAGEN cuando dim(Im) == 1 (Recta Imagen) */}
                {analysis.rank === 1 && analysis.imageBasis.length >= 1 && (
                  <InfiniteLine3D
                    point={[0, 0, 0]}
                    direction={analysis.imageBasis[0]}
                    color="#10b981"
                    label="Im(T) (Recta Imagen dim=1)"
                    showPoint={false}
                    showDirectionVector={false}
                    lineWidth={4}
                    isR2={isPureR2}
                  />
                )}

                {/* IMAGEN cuando dim(Im) == 2 en escena 3D (R3->R3, R2->R3 o R3->R2) */}
                {!isPureR2 &&
                  analysis.rank === 2 &&
                  analysis.imagePlaneNormal && (
                    <Plane3DObject
                      normal={analysis.imagePlaneNormal}
                      dTerm={0}
                      color="#10b981"
                      opacity={0.22}
                      size={12}
                      label={
                        spaceMode === 'R3-R2'
                          ? 'Im(T) = ℝ² (Plano XY de llegada)'
                          : 'Im(T) (Plano Imagen en ℝ³ dim=2)'
                      }
                      showNormalVector={false}
                    />
                  )}

                {/* NÚCLEO cuando dim(Nu) == 1 (Recta Núcleo que colapsa a 0) */}
                {analysis.nullity === 1 && analysis.kernelBasis.length >= 1 && (
                  <InfiniteLine3D
                    point={[0, 0, 0]}
                    direction={analysis.kernelBasis[0]}
                    color="#f43f5e"
                    label="Nu(T) (Recta Núcleo → 0⃗)"
                    showPoint={false}
                    showDirectionVector={false}
                    lineWidth={3.5}
                    isR2={isPureR2}
                  />
                )}

                {/* NÚCLEO cuando dim(Nu) == 2 en dominio R3 (Plano Núcleo que colapsa a 0) */}
                {domainDim === 3 &&
                  analysis.nullity === 2 &&
                  analysis.kernelPlaneNormal && (
                    <Plane3DObject
                      normal={analysis.kernelPlaneNormal}
                      dTerm={0}
                      color="#f43f5e"
                      opacity={0.24}
                      size={11}
                      label="Nu(T) (Plano Núcleo → 0⃗)"
                      showNormalVector={false}
                    />
                  )}

                {/* Vector testigo perteneciente al Núcleo colapsando al origen */}
                {animatedKernelVec && (
                  <Vector3DObject
                    vector={animatedKernelVec}
                    color="#f43f5e"
                    label="v⃗_ker ∈ Nu(T)"
                    isR2={isPureR2}
                    lineWidth={4}
                  />
                )}

                {analysis.nullity === 0 && (
                  <Point3DObject
                    position={[0, 0, 0]}
                    color="#f43f5e"
                    label="Nu(T) = {0⃗}"
                    showCoords={false}
                    radius={0.14}
                  />
                )}
              </>
            )}
          </Scene3D>
        </div>
      </div>

      {/* PANEL DERECHO: CONTROLES DE ANIMACIÓN, MATRIZ m×n Y NÚCLEO/IMAGEN */}
      <div className="w-full lg:w-[465px] xl:w-[510px] h-[48vh] lg:h-full bg-slate-950 flex flex-col overflow-y-auto shrink-0">
        {/* 1. Reproductor de la Deformación Animada del Espacio */}
        <div className="p-4 border-b border-slate-800/90 bg-slate-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Deformación Animada (ℝ{domainDim === 2 ? '²' : '³'} → ℝ
              {codomainDim === 2 ? '²' : '³'})
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
                  <span>Animar T(x⃗)</span>
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
              title="Ver espacio de partida sin transformar (t = 0)"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showDeformedGrid}
                onChange={(e) => setShowDeformedGrid(e.target.checked)}
                className="accent-indigo-500 rounded"
              />
              <span>Grilla Deformada</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showSubspaces}
                onChange={(e) => setShowSubspaces(e.target.checked)}
                className="accent-rose-500 rounded"
              />
              <span>Graficar Núcleo e Imagen</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showTestVector}
                onChange={(e) => setShowTestVector(e.target.checked)}
                className="accent-yellow-400 rounded"
              />
              <span>Vector de Prueba x⃗</span>
            </label>
          </div>
        </div>

        {/* 2. Matriz Asociada A ∈ R^(m×n) y Vector x ∈ R^n */}
        <div className="p-4 border-b border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Matriz Asociada A ∈ ℝ^({codomainDim}×{domainDim})
            </h3>
            <span className="font-mono text-[11px] text-slate-400">
              {analysis.determinant !== null
                ? `det(A) = ${formatNum(analysis.determinant, 2)}`
                : `Matriz Rectangular (${codomainDim} filas × ${domainDim} cols)`}
            </span>
          </div>

          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
            <div
              className={`grid gap-2 px-2 text-center font-mono text-[11px] font-bold ${
                domainDim === 2 ? 'grid-cols-2' : 'grid-cols-3'
              }`}
            >
              <span className="text-sky-400">
                T(ê₁) ∈ ℝ{codomainDim === 2 ? '²' : '³'}
              </span>
              <span className="text-emerald-400">
                T(ê₂) ∈ ℝ{codomainDim === 2 ? '²' : '³'}
              </span>
              {domainDim === 3 && (
                <span className="text-orange-400">
                  T(ê₃) ∈ ℝ{codomainDim === 2 ? '²' : '³'}
                </span>
              )}
            </div>

            {Array.from({ length: codomainDim }).map((_, r) => (
              <div
                key={r}
                className={`grid gap-2 px-2 ${
                  domainDim === 2 ? 'grid-cols-2' : 'grid-cols-3'
                }`}
              >
                {Array.from({ length: domainDim }).map((__, c) => (
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

          {/* Vector de prueba x en el Dominio R^n */}
          {showTestVector && (
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">
                  x⃗ ∈ ℝ{domainDim === 2 ? '²' : '³'} ={' '}
                  {formatVector(effX, domainDim === 2, 1)}
                </span>
                <span className="text-yellow-300 font-bold">
                  T(x⃗) ∈ ℝ{codomainDim === 2 ? '²' : '³'} ={' '}
                  {formatVector(finalTX, codomainDim === 2, 2)}
                </span>
              </div>
              <div
                className={`grid gap-2 ${
                  domainDim === 2 ? 'grid-cols-2' : 'grid-cols-3'
                }`}
              >
                {Array.from({ length: domainDim }).map((_, idx) => (
                  <input
                    key={idx}
                    type="number"
                    step={0.5}
                    value={inputVecX[idx]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const next: Vector3Tuple = [...inputVecX] as Vector3Tuple;
                      next[idx] = val;
                      setInputVecX(next);
                    }}
                    className="w-full px-2 py-1 text-center font-mono text-xs rounded bg-slate-950 border border-slate-800 text-white"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Análisis de Núcleo (Kernel), Imagen (Rango) y Clasificación */}
        <div className="p-4 space-y-3 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            Núcleo, Imagen y Teorema de la Dimensión
          </h3>

          {/* Badges de Inyectividad / Sobreyectividad / Isomorfismo */}
          <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px] text-center">
            <div
              className={`py-1.5 px-2 rounded-lg border font-bold ${
                analysis.isInjective
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {analysis.isInjective ? '✓ Inyectiva' : '✗ No Inyectiva'}
            </div>
            <div
              className={`py-1.5 px-2 rounded-lg border font-bold ${
                analysis.isSurjective
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {analysis.isSurjective ? '✓ Sobreyectiva' : '✗ No Sobreyectiva'}
            </div>
            <div
              className={`py-1.5 px-2 rounded-lg border font-bold ${
                analysis.isIsomorphism
                  ? 'bg-indigo-950/50 border-indigo-500/60 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {analysis.isIsomorphism ? '★ Isomorfismo' : 'No Biyectiva'}
            </div>
          </div>

          {/* Teorema de la Dimensión */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-[11px] font-sans text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Teorema de la Dimensión:
              </span>
              <span className="font-mono text-slate-300">
                Dominio = ℝ{domainDim === 2 ? '²' : '³'} | Codominio = ℝ
                {codomainDim === 2 ? '²' : '³'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <div className="p-2 rounded-lg bg-rose-950/35 border border-rose-500/40">
                <div className="text-[10px] font-sans text-rose-300">
                  Nulidad dim(Nu)
                </div>
                <div className="text-base font-bold text-rose-200">
                  {analysis.nullity}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/35 border border-emerald-500/40">
                <div className="text-[10px] font-sans text-emerald-300">
                  Rango dim(Im)
                </div>
                <div className="text-base font-bold text-emerald-200">
                  {analysis.rank}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-indigo-950/35 border border-indigo-500/40">
                <div className="text-[10px] font-sans text-indigo-300">
                  dim(Dominio ℝ{domainDim === 2 ? '²' : '³'})
                </div>
                <div className="text-base font-bold text-indigo-200">
                  {analysis.nullity} + {analysis.rank} = {analysis.domainDim}
                </div>
              </div>
            </div>
          </div>

          {/* Subespacio Núcleo Nu(T) ⊆ Dominio */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-sans font-semibold text-rose-400">
                Núcleo: Nu(T) = &#123;x⃗ ∈ ℝ{domainDim === 2 ? '²' : '³'} : A·x⃗ = 0⃗&#125;
              </span>
              <span className="text-[11px] text-slate-400">
                dim = {analysis.nullity}
              </span>
            </div>

            {analysis.nullity === 0 ? (
              <div className="text-emerald-300 font-bold">
                Nu(T) = &#123;0⃗&#125; (Transformación Inyectiva / Monomorfismo)
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-rose-300 font-bold">
                  Base de Nu(T) = &#123;
                  {analysis.kernelBasis
                    .map((v) => formatVector(v, domainDim === 2, 2))
                    .join(', ')}
                  &#125;
                </div>
                <div className="text-[11px] font-sans text-slate-400">
                  {spaceMode === 'R3-R2'
                    ? 'Como dim(Dominio)=3 > dim(Codominio)=2, por el Teorema de la Dimensión dim(Nu) ≥ 1 siempre (toda T: ℝ³ → ℝ² colapsa al menos una recta al origen).'
                    : 'Todos los vectores de este subespacio del dominio se aplastan hacia el vector nulo al aplicar T.'}
                </div>
              </div>
            )}
          </div>

          {/* Subespacio Imagen Im(T) ⊆ Codominio */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-sans font-semibold text-emerald-400">
                Imagen: Im(T) ⊆ ℝ{codomainDim === 2 ? '²' : '³'}
              </span>
              <span className="text-[11px] text-slate-400">
                dim = {analysis.rank}
              </span>
            </div>

            {analysis.rank === analysis.codomainDim ? (
              <div className="text-emerald-300 font-bold">
                Im(T) = ℝ{codomainDim === 2 ? '²' : '³'} completo (Transformación
                Sobreyectiva / Epimorfismo)
              </div>
            ) : analysis.rank === 0 ? (
              <div className="text-amber-300 font-bold">
                Im(T) = &#123;0⃗&#125; (Transformación Nula)
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-emerald-300 font-bold">
                  Base de Im(T) = &#123;
                  {analysis.imageBasis
                    .map((v) => formatVector(v, codomainDim === 2, 2))
                    .join(', ')}
                  &#125;
                </div>
                {spaceMode === 'R2-R3' && (
                  <div className="text-[11px] font-sans text-slate-400">
                    Como dim(Dominio)=2 &lt; dim(Codominio)=3, el rango máximo es
                    2: ninguna T: ℝ² → ℝ³ puede cubrir todo ℝ³ (nunca es
                    sobreyectiva).
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
