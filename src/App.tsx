import React, { useState } from 'react';
import type { UnitId } from './types/curriculum';
import { Sidebar } from './components/layout/Sidebar';
import { Unit1Vectors } from './units/Unit1Vectors';
import { Unit2LinesAndPlanes } from './units/Unit2LinesAndPlanes';
import { Unit3Conics } from './units/Unit3Conics';
import { Unit4Matrices } from './units/Unit4Matrices';
import { Unit5LinearSystems } from './units/Unit5LinearSystems';
import { Unit6VectorSpaces } from './units/Unit6VectorSpaces';
import { Unit7LinearTransformations } from './units/Unit7LinearTransformations';
import { Unit8Eigenvalues } from './units/Unit8Eigenvalues';

export const App: React.FC = () => {
  const [activeUnit, setActiveUnit] = useState<UnitId>('unit-1');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar
        activeUnit={activeUnit}
        onSelectUnit={setActiveUnit}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      <main className="flex-1 h-full overflow-hidden relative">
        {activeUnit === 'unit-1' && <Unit1Vectors />}
        {activeUnit === 'unit-2' && <Unit2LinesAndPlanes />}
        {activeUnit === 'unit-3' && <Unit3Conics />}
        {activeUnit === 'unit-4' && <Unit4Matrices />}
        {activeUnit === 'unit-5' && <Unit5LinearSystems />}
        {activeUnit === 'unit-6' && <Unit6VectorSpaces />}
        {activeUnit === 'unit-7' && <Unit7LinearTransformations />}
        {activeUnit === 'unit-8' && <Unit8Eigenvalues />}
      </main>
    </div>
  );
};

export default App;
