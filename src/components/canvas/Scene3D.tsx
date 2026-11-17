import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RotateCcw, Grid as GridIcon, Eye } from 'lucide-react';
import type { DimensionMode } from '../../types/curriculum';
import { CartesianAxes } from './CartesianAxes';

interface CameraRigProps {
  dimension: DimensionMode;
  resetSignal: number;
}

const CameraRig: React.FC<CameraRigProps> = ({ dimension, resetSignal }) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (dimension === 'R2') {
      camera.up.set(0, 1, 0);
      camera.position.set(0, 0, 15);
    } else {
      camera.up.set(0, 0, 1);
      camera.position.set(9, -10, 7.5);
    }
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [dimension, resetSignal, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableRotate={dimension === 'R3'}
      enablePan
      enableZoom
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={45}
    />
  );
};

interface Scene3DProps {
  dimension: DimensionMode;
  children: React.ReactNode;
  legendItems?: { color: string; label: string; value?: string }[];
}

export const Scene3D: React.FC<Scene3DProps> = ({
  dimension,
  children,
  legendItems = [],
}) => {
  const [resetCounter, setResetCounter] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [showTicks, setShowTicks] = useState(true);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* Fondo sutil radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.45) 0%, rgba(2, 6, 23, 1) 85%)',
        }}
      />

      <Canvas
        camera={{ position: [9, -10, 7.5], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[12, -12, 18]} intensity={1.1} />
        <directionalLight position={[-10, 10, -10]} intensity={0.4} />

        <CameraRig dimension={dimension} resetSignal={resetCounter} />

        <CartesianAxes
          size={10}
          isR2={dimension === 'R2'}
          showGrid={showGrid}
          showTicks={showTicks}
        />

        {children}
      </Canvas>

      {/* Controles flotantes del visor (arriba a la derecha) */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
        <div className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/70 text-xs font-mono text-slate-300 backdrop-blur-md">
          Vista:{' '}
          <span className="text-indigo-400 font-bold">
            {dimension === 'R2' ? 'Plano ℝ² (XY)' : 'Espacio ℝ³ (XYZ)'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowGrid((g) => !g)}
          title="Alternar grilla"
          className={`p-1.5 rounded-lg border backdrop-blur-md transition-colors ${
            showGrid
              ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <GridIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setShowTicks((t) => !t)}
          title="Alternar numeración de ejes"
          className={`p-1.5 rounded-lg border backdrop-blur-md transition-colors ${
            showTicks
              ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setResetCounter((c) => c + 1)}
          title="Restablecer cámara"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-200 transition-colors backdrop-blur-md"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Centrar</span>
        </button>
      </div>

      {/* Leyenda flotante abajo a la izquierda */}
      {legendItems.length > 0 && (
        <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-2 max-w-xl pointer-events-none">
          {legendItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800/90 backdrop-blur-md text-xs font-mono shadow-md"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-200 font-semibold">{item.label}</span>
              {item.value && (
                <span className="text-slate-400">{item.value}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ayuda rápida de navegación abajo a la derecha */}
      <div className="absolute bottom-3 right-3 z-20 hidden sm:flex items-center gap-3 px-3 py-1 rounded-lg bg-slate-900/75 border border-slate-800/80 text-[11px] text-slate-400 backdrop-blur-sm pointer-events-none">
        {dimension === 'R3' && <span>Click Izq + Arrastrar: Rotar 3D</span>}
        <span>Click Der + Arrastrar: Desplazar</span>
        <span>Rueda: Zoom</span>
      </div>
    </div>
  );
};
