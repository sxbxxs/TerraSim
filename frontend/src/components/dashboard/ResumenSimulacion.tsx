import { resumenSimulacion as r } from "@/data/mock";

export default function ResumenSimulacion() {
  const transcurrido = r.anioActual - 2026;
  const total = r.anioFinal - 2026;

  const filas = [
    ["Año actual", String(r.anioActual)],
    ["Tiempo transcurrido", `${transcurrido} / ${total} años`],
    ["Escenario activo", r.escenario],
    ["Próximo evento", r.proximoEvento],
  ];

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-800">Resumen de la Simulación</h3>
      <dl className="space-y-2 text-sm">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-slate-500">{k}</dt>
            <dd className="font-medium text-slate-800">{v}</dd>
          </div>
        ))}
      </dl>
      <button className="mt-4 w-full rounded-lg border border-emerald-600 py-2 text-sm text-emerald-700 hover:bg-emerald-50">
        Ver detalles del escenario
      </button>
    </div>
  );
}