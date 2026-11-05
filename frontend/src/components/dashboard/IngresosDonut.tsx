"use client";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ingresosHogares } from "@/data/mock";

export default function IngresosDonut() {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-2 font-semibold text-slate-800">Distribución de Hogares por Ingresos</h3>
      <div className="flex items-center gap-4">
        <div className="h-36 w-36">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={ingresosHogares} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={2}>
                {ingresosHogares.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 space-y-2 text-sm">
          {ingresosHogares.map((d) => (
            <li key={d.name} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
                {d.name}
              </span>
              <span className="font-semibold text-slate-800">{d.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}