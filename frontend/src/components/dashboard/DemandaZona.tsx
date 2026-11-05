"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { demandaZonas } from "@/data/mock";

const colores = ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#059669"];

export default function DemandaZona() {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-2 font-semibold text-slate-800">Demanda por Zona</h3>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={demandaZonas}>
            <XAxis dataKey="zona" tick={{ fontSize: 12 }} />
            <YAxis hide domain={[0, 100]} />
            <Tooltip formatter={(v) => [`${v}%`, "Demanda"]} />
            <Bar dataKey="demanda" radius={[4, 4, 0, 0]}>
              {demandaZonas.map((_, i) => (
                <Cell key={i} fill={colores[i % colores.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}