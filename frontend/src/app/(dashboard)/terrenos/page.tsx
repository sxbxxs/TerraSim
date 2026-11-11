import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { sectores } from "@/data/sectores";
import { simular } from "@/lib/simulador";

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export default function Terrenos() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Sectores en estudio</h2>
        <p className="text-sm text-slate-500">Aguachica, Cesar. Proyección a 10 años, escenario base.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {sectores.map((s) => {
          const r = simular(s, "base");
          return (
            <div key={s.sector} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <MapPin size={20} />
                </div>
                <h3 className="font-semibold text-slate-800">{s.sector}</h3>
              </div>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Precio actual</dt>
                  <dd className="font-medium">{cop(s.valorInicial)}/m²</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Valor a 10 años</dt>
                  <dd className="font-medium">{cop(r.valorFinalM2)}/m²</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Plusvalía</dt>
                  <dd className="font-medium text-emerald-600">{r.plusvaliaPct.toFixed(1)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Rentabilidad anual</dt>
                  <dd className="font-medium">{r.tasaAnualEquivalente.toFixed(1)}%</dd>
                </div>
              </dl>

              <Link
                href="/simulaciones"
                className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-emerald-600 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
              >
                Simular este sector <ArrowRight size={16} />
              </Link>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500">
        Datos de ejemplo. Reemplazar por precios reales de cada sector.
      </p>
    </div>
  );
}