import { TrendingUp, Rocket, TrendingDown, Leaf } from "lucide-react";
import { escenarios } from "@/data/mock";

const iconos = [TrendingUp, Rocket, TrendingDown, Leaf];

export default function EscenariosRapidos() {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-800">Escenarios rápidos</h3>
      <div className="space-y-2">
        {escenarios.map((nombre, i) => {
          const Icon = iconos[i];
          return (
            <button
              key={nombre}
              className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Icon size={18} className="text-emerald-600" />
              {nombre}
            </button>
          );
        })}
      </div>
    </div>
  );
}