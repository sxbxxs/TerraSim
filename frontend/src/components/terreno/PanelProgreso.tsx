"use client";
import { Check, Clock } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import type { Escenario } from "@/types";
import { ANIO_BASE, EstadoAnio, Hito, ParametrosProgreso } from "@/lib/progreso";

const input =
  "w-full rounded-lg border px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";
const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const colores: Record<Escenario, string> = {
  pesimista: "#ef4444",
  base: "#2563eb",
  optimista: "#059669",
};

const filasHitos: { campo: keyof Hito; label: string }[] = [
  { campo: "via", label: "Vía pavimentada" },
  { campo: "servicios", label: "Servicios públicos" },
  { campo: "parque", label: "Parque" },
  { campo: "usoSuelo", label: "Uso del suelo" },
];

type Props = {
  series: Record<Escenario, EstadoAnio[]>;
  escenario: Escenario;
  anio: number;
  areaBruta: number;
  conteo: { total: number; casas: number; enConstruccion: number; vacios: number };
  hitos: Record<Escenario, Hito>;
  onHitos: (h: Record<Escenario, Hito>) => void;
  pp: ParametrosProgreso;
  onPp: (p: ParametrosProgreso) => void;
};

function Tarjeta({ titulo, valor, sub }: { titulo: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="text-xl font-bold text-slate-900">{valor}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function PanelProgreso({
  series, escenario, anio, areaBruta, conteo, hitos, onHitos, pp, onPp,
}: Props) {
  const e = series[escenario][anio];
  const h = hitos[escenario];
  const plusvalia = (e.valorM2 / pp.valorInicial - 1) * 100;

  const datos = series.base.map((_, i) => ({
    anio: i,
    pesimista: series.pesimista[i].valorM2,
    base: series.base[i].valorM2,
    optimista: series.optimista[i].valorM2,
  }));

  const setHito = (esc: Escenario, campo: keyof Hito, v: number) =>
    onHitos({ ...hitos, [esc]: { ...hitos[esc], [campo]: Number.isFinite(v) ? v : 0 } });

  const setP = (k: keyof ParametrosProgreso, v: number, pct = false) =>
    onPp({ ...pp, [k]: Number.isFinite(v) ? (pct ? v / 100 : v) : 0 });

  const estados: [string, boolean, number][] = [
    ["Vía pavimentada", e.via, h.via],
    ["Servicios públicos", e.servicios, h.servicios],
    ["Parque", e.parque, h.parque],
    ["Uso del suelo", e.usoSuelo, h.usoSuelo],
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta titulo="Casas construidas" valor={`${conteo.casas} / ${conteo.total}`} sub={`${(e.ocupacion * 100).toFixed(1)} % de ocupación`} />
        <Tarjeta titulo="Valor por m²" valor={cop(e.valorM2)} sub={`Plusvalía ${plusvalia.toFixed(1)} %`} />
        <Tarjeta titulo="Valor del terreno" valor={cop(e.valorM2 * areaBruta)} sub={`${Math.round(areaBruta).toLocaleString("es-CO")} m² brutos`} />
        <Tarjeta titulo="Tasa de valorización" valor={`${(e.tasa * 100).toFixed(1)} % anual`} sub={`Escenario ${escenario}`} />
      </div>

      <div className="flex flex-wrap gap-2">
        {estados.map(([nombre, listo, año]) => (
          <span
            key={nombre}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
              listo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {listo ? <Check size={14} /> : <Clock size={14} />}
            {nombre}: {año >= 99 ? "no llega" : ANIO_BASE + año}
          </span>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-800">Valor por m² según el escenario</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datos}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="anio" tickFormatter={(v) => String(ANIO_BASE + Number(v))} />
              <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
              <Tooltip formatter={(v) => cop(Number(v))} labelFormatter={(l) => `Año ${ANIO_BASE + Number(l)}`} />
              <Legend />
              <ReferenceLine x={anio} stroke="#0f172a" strokeDasharray="4 4" />
              {(["pesimista", "base", "optimista"] as Escenario[]).map((k) => (
                <Line key={k} type="monotone" dataKey={k} stroke={colores[k]} strokeWidth={k === escenario ? 4 : 2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <details className="rounded-xl border bg-white p-5 shadow-sm">
        <summary className="cursor-pointer font-semibold text-slate-800">Supuestos del modelo (editables)</summary>
        <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          Todos los valores son de ejemplo. Calibrar con datos históricos reales de Aguachica y con las obras proyectadas por la alcaldía.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="text-sm"><span className="mb-1 block text-slate-500">Valor inicial (COP/m²)</span>
            <input type="number" className={input} value={pp.valorInicial} onChange={(ev) => setP("valorInicial", Number(ev.target.value))} /></label>
          <label className="text-sm"><span className="mb-1 block text-slate-500">Tasa base (%)</span>
            <input type="number" step="0.1" className={input} value={+(pp.tasaBase * 100).toFixed(2)} onChange={(ev) => setP("tasaBase", Number(ev.target.value), true)} /></label>
          <label className="text-sm"><span className="mb-1 block text-slate-500">Velocidad de construcción</span>
            <input type="number" step="0.1" className={input} value={pp.kappa} onChange={(ev) => setP("kappa", Number(ev.target.value))} /></label>
          <label className="text-sm"><span className="mb-1 block text-slate-500">Efecto infraestructura (%)</span>
            <input type="number" step="0.5" className={input} value={+(pp.pesoInfra * 100).toFixed(2)} onChange={(ev) => setP("pesoInfra", Number(ev.target.value), true)} /></label>
          <label className="text-sm"><span className="mb-1 block text-slate-500">Efecto uso del suelo (%)</span>
            <input type="number" step="0.5" className={input} value={+(pp.pesoUso * 100).toFixed(2)} onChange={(ev) => setP("pesoUso", Number(ev.target.value), true)} /></label>
          <label className="text-sm"><span className="mb-1 block text-slate-500">Efecto parque / entorno (%)</span>
            <input type="number" step="0.5" className={input} value={+(pp.pesoCarac * 100).toFixed(2)} onChange={(ev) => setP("pesoCarac", Number(ev.target.value), true)} /></label>
        </div>

        <p className="mb-2 mt-5 text-sm font-medium text-slate-700">Año de llegada de cada mejora (años desde hoy; 99 = no llega)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr><th className="p-2">Mejora</th><th className="p-2">Pesimista</th><th className="p-2">Base</th><th className="p-2">Optimista</th></tr>
            </thead>
            <tbody>
              {filasHitos.map((f) => (
                <tr key={f.campo} className="border-t">
                  <td className="p-2 text-slate-700">{f.label}</td>
                  {(["pesimista", "base", "optimista"] as Escenario[]).map((esc) => (
                    <td key={esc} className="p-2">
                      <input type="number" min={0} className={input} value={hitos[esc][f.campo]}
                        onChange={(ev) => setHito(esc, f.campo, Number(ev.target.value))} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="text-xs text-slate-500">
        Simulación con supuestos, valores nominales (sin descontar inflación). No es un avalúo ni garantiza rentabilidad.
      </p>
    </div>
  );
}