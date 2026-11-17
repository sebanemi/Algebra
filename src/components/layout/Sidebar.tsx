import React from 'react';
import {
  Compass,
  Lock,
  ChevronLeft,
  ChevronRight,
  Box,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { CURRICULUM_UNITS, type UnitId } from '../../types/curriculum';

interface SidebarProps {
  activeUnit: UnitId;
  onSelectUnit: (unitId: UnitId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeUnit,
  onSelectUnit,
  collapsed,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={`relative flex flex-col h-full bg-slate-900/95 border-r border-slate-800/90 transition-all duration-300 shrink-0 z-30 ${
        collapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Cabecera de la Aplicación */}
      <div className="flex items-center justify-between px-3.5 py-4 border-b border-slate-800/90">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Box className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="leading-tight truncate">
              <h1 className="text-sm font-bold text-slate-100 tracking-tight">
                Álgebra & Geometría
              </h1>
              <p className="text-[11px] text-indigo-400 font-mono">
                Laboratorio Visual 3D
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-colors shrink-0"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Subtítulo del programa */}
      {!collapsed && (
        <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            Unidades del Programa
          </span>
          <span className="text-slate-500 font-mono">
            {CURRICULUM_UNITS.filter((u) => u.available).length}/{CURRICULUM_UNITS.length}
          </span>
        </div>
      )}

      {/* Lista de las 8 Unidades */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {CURRICULUM_UNITS.map((unit) => {
          const isActive = activeUnit === unit.id;
          const isAvailable = unit.available;

          return (
            <button
              key={unit.id}
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && onSelectUnit(unit.id)}
              title={`${unit.number}. ${unit.title} — ${
                isAvailable ? unit.subtitle : 'Próximamente'
              }`}
              className={`w-full text-left rounded-xl transition-all duration-150 group relative flex items-start gap-2.5 ${
                collapsed ? 'p-2.5 justify-center' : 'px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-indigo-600/20 border border-indigo-500/50 text-white shadow-sm'
                  : isAvailable
                  ? 'hover:bg-slate-800/70 text-slate-300 border border-transparent'
                  : 'opacity-55 cursor-not-allowed bg-slate-900/40 text-slate-500 border border-transparent'
              }`}
            >
              {/* Indicador numérico o candado */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5 ${
                  isActive
                    ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/40'
                    : isAvailable
                    ? 'bg-slate-800 text-indigo-300'
                    : 'bg-slate-800/60 text-slate-500'
                }`}
              >
                {isAvailable ? unit.number : <Lock className="w-3.5 h-3.5" />}
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isActive ? 'text-indigo-200' : ''
                      }`}
                    >
                      U{unit.number}. {unit.title}
                    </span>

                    {isAvailable ? (
                      <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        Activa
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded bg-slate-800 text-slate-400 border border-slate-700/70 shrink-0">
                        Próximamente
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {unit.subtitle}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pie del Sidebar */}
      <div className="p-3 border-t border-slate-800/90 bg-slate-950/50">
        {collapsed ? (
          <div className="flex justify-center" title="100% Client-Side • Three.js + Math.js">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Three.js + Math.js</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-400 font-semibold">
              8/8 Completo
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
