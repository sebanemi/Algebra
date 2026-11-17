import React, { useMemo } from 'react';
import { Line, Html, Grid } from '@react-three/drei';

interface CartesianAxesProps {
  size?: number;
  isR2?: boolean;
  showGrid?: boolean;
  showTicks?: boolean;
}

export const CartesianAxes: React.FC<CartesianAxesProps> = ({
  size = 10,
  isR2 = false,
  showGrid = true,
  showTicks = true,
}) => {
  const ticks = useMemo(() => {
    const arr: number[] = [];
    for (let i = -size; i <= size; i += 1) {
      if (i !== 0) arr.push(i);
    }
    return arr;
  }, [size]);

  return (
    <group>
      {/* Grilla sobre el plano XY (z = 0) */}
      {showGrid && (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <Grid
            args={[size * 2, size * 2]}
            cellSize={1}
            cellThickness={0.6}
            cellColor="#1e293b"
            sectionSize={5}
            sectionThickness={1.2}
            sectionColor="#334155"
            fadeDistance={35}
            fadeStrength={1}
            infiniteGrid={false}
          />
        </group>
      )}

      {/* Eje X (Rojo / Coral) */}
      <Line
        points={[
          [0, 0, 0],
          [size, 0, 0],
        ]}
        color="#f43f5e"
        lineWidth={2.2}
      />
      <Line
        points={[
          [-size, 0, 0],
          [0, 0, 0],
        ]}
        color="#f43f5e"
        lineWidth={1.2}
        dashed
        dashSize={0.25}
        gapSize={0.2}
        opacity={0.45}
        transparent
      />
      <Html position={[size + 0.45, 0, 0]} center zIndexRange={[5, 0]}>
        <span className="px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-500/50 text-rose-400 font-mono text-xs font-bold select-none pointer-events-none">
          +X
        </span>
      </Html>

      {/* Eje Y (Verde Esmeralda) */}
      <Line
        points={[
          [0, 0, 0],
          [0, size, 0],
        ]}
        color="#10b981"
        lineWidth={2.2}
      />
      <Line
        points={[
          [0, -size, 0],
          [0, 0, 0],
        ]}
        color="#10b981"
        lineWidth={1.2}
        dashed
        dashSize={0.25}
        gapSize={0.2}
        opacity={0.45}
        transparent
      />
      <Html position={[0, size + 0.45, 0]} center zIndexRange={[5, 0]}>
        <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 font-mono text-xs font-bold select-none pointer-events-none">
          +Y
        </span>
      </Html>

      {/* Eje Z (Azul Cielo) - Solo en R3 */}
      {!isR2 && (
        <>
          <Line
            points={[
              [0, 0, 0],
              [0, 0, size],
            ]}
            color="#38bdf8"
            lineWidth={2.2}
          />
          <Line
            points={[
              [0, 0, -size],
              [0, 0, 0],
            ]}
            color="#38bdf8"
            lineWidth={1.2}
            dashed
            dashSize={0.25}
            gapSize={0.2}
            opacity={0.45}
            transparent
          />
          <Html position={[0, 0, size + 0.45]} center zIndexRange={[5, 0]}>
            <span className="px-1.5 py-0.5 rounded bg-sky-950/90 border border-sky-500/50 text-sky-400 font-mono text-xs font-bold select-none pointer-events-none">
              +Z
            </span>
          </Html>
        </>
      )}

      {/* Marcas de graduación numéricas cada 2 unidades */}
      {showTicks &&
        ticks
          .filter((t) => t % 2 === 0)
          .map((t) => (
            <React.Fragment key={`tick-${t}`}>
              <Html position={[t, -0.32, 0]} center zIndexRange={[1, 0]}>
                <span className="text-[10px] font-mono text-rose-400/60 select-none pointer-events-none">
                  {t}
                </span>
              </Html>
              <Html position={[-0.35, t, 0]} center zIndexRange={[1, 0]}>
                <span className="text-[10px] font-mono text-emerald-400/60 select-none pointer-events-none">
                  {t}
                </span>
              </Html>
              {!isR2 && t > 0 && (
                <Html position={[-0.35, 0, t]} center zIndexRange={[1, 0]}>
                  <span className="text-[10px] font-mono text-sky-400/60 select-none pointer-events-none">
                    {t}
                  </span>
                </Html>
              )}
            </React.Fragment>
          ))}

      {/* Esfera en el Origen (0,0,0) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#94a3b8" />
      </mesh>
    </group>
  );
};
