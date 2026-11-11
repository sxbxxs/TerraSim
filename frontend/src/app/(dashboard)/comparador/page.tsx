"use client";
import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import { sectores } from "@/data/sectores";
import { simular } from "@/lib/simulador";
import { Escenario } from "@/types";

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const colores = ["#059669", "#2563eb", "#f59e0b"];

export default function Comparador() {
  const [horizonte, setHorizonte] = useState(10);
  const [escenario, setEscenario] = useState<Escenario>("base");

  const { datos, resultados } = useMemo(() => {
    const resultados = sectores.map((s) => simular({ ...s, horizonte }, escenario));
    const datos = Array.from({ length: horizonte + 1 }, (_, i) => {
      const fila: Record<string, number> = { anio: i };
      sectores.forEach((s, idx) => {
        fila[s.sector] = resultados[idx].serie[i].valorM2;
      });
      return fila;
    });
    return { datos, resultados };
  }, [horizonte, escenario]);

  const select = "rounded-lg border px-3 py-2 text-sm text-slate-800";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Comparador de sectores</h2>
          <p className="text-sm text-slate-500">Mismo modelo, parámetros propios de cada sector.</p>
        </div>
        <div className="flex gap-3">
          <select className={select} value={horizonte} onChange={(e) => setHorizonte(Number(e.target.value))}>
            <option value={3}>Corto (3 años)</option>
            <option value={10}>Mediano (10 años)</option>
            <option value={20}>Largo (20 años)</option>
          </select>
          <select className={select} value={escenario} onChange={(e) => setEscenario(e.target.value as Escenario)}>
            <option value="pesimista">Pesimista</option>
            <option value="base">Base</option>
            <option value="optimista">Optimista</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-800">Valor por m² en el tiempo</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datos}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="anio" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => cop(Number(v))} labelFormatter={(l) => `Año ${l}`} />
              <Legend />
              {sectores.map((s, i) => (
                <Line key={s.sector} type="monotone" dataKey={s.sector} stroke={colores[i]} strokeWidth={3} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Sector</th>
              <th className="p-3">Precio inicial</th>
              <th className="p-3">Valor final</th>
              <th className="p-3">Plusvalía</th>
              <th className="p-3">Rent. anual</th>
            </tr>
          </thead>
          <tbody>
            {sectores.map((s, i) => (
              <tr key={s.sector} className="border-t">
                <td className="p-3 font-medium text-slate-800">
                  <span className="mr-2 inline-block h-3 w-3 rounded-sm" style={{ background: colores[i] }} />
                  {s.sector}
                </td>
                <td className="p-3">{cop(s.valorInicial)}</td>
                <td className="p-3">{cop(resultados[i].valorFinalM2)}</td>
                <td className="p-3 text-emerald-600">{resultados[i].plusvaliaPct.toFixed(1)}%</td>
                <td className="p-3">{resultados[i].tasaAnualEquivalente.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}