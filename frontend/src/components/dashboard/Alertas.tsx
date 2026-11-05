import { AlertTriangle, Info } from "lucide-react";
import { alertas } from "@/data/mock";

export default function Alertas() {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-800">Alertas y Recomendaciones</h3>
      <ul className="space-y-3 text-sm text-slate-700">
        {alertas.map((a, i) => (
          <li key={i} className="flex gap-3">
            {a.tipo === "warning" ? (
              <AlertTriangle size={20} className="shrink-0 text-orange-500" />
            ) : (
              <Info size={20} className="shrink-0 text-blue-500" />
            )}
            <p>{a.texto}</p>
          </li>
        ))}
      </ul>
      <a href="#" className="mt-3 inline-block text-sm text-blue-600 underline">
        Ver todas las alertas
      </a>
    </div>
  );
}