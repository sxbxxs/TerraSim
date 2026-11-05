"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { ResultadoSimulacion } from "@/types";

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="text-xl font-bold text-slate-900">{valor}</p>
    </div>
  );
}

export default function ResultadosSimulador({ r }: { r: ResultadoSimulacion }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta titulo="Valor final por m²" valor={cop(r.valorFinalM2)} />
        <Tarjeta titulo="Valor final del terreno" valor={cop(r.valorFinalTotal)} />
        <Tarjeta titulo="Plusvalía total" valor={`${r.plusvaliaPct.toFixed(1)}%`} />
        <Tarjeta titulo="Rentabilidad anual equiv." valor={`${r.tasaAnualEquivalente.toFixed(1)}%`} />
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-800">Evolución del valor por m²</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={r.serie}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="anio" label={{ value: "Años", position: "insideBottom", offset: -2 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [cop(Number(v)), "Valor por m²"]} labelFormatter={(l) => `Año ${l}`} />
              <Line type="monotone" dataKey="valorM2" stroke="#059669" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Proyección con parámetros supuestos. No garantiza rentabilidad; debe calibrarse con datos históricos reales.
      </p>
    </div>
  );
}