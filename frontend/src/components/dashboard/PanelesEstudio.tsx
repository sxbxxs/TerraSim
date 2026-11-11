"use client";
import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import type { Escenario } from "@/types";
import { useEstudio } from "@/lib/estudio-contexto";
import { ANIO_BASE } from "@/lib/progreso";

export const num = (n: number, d = 0) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: d }).format(n);
export const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
// Millones de pesos: $94,4 M  /  $173.134 M
export const copM = (n: number) => `$${num(n / 1e6, n >= 1e8 ? 0 : 1)} M`;

const etiqueta: Record<Escenario, string> = {
  pesimista: "Pesimista",
  base: "Base",
  optimista: "Optimista",
};
const colorEscenario: Record<Escenario, string> = {
  pesimista: "#ef4444",
  base: "#2563eb",
  optimista: "#059669",
};

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-800">{titulo}</h3>
      {children}
    </div>
  );
}

export function ResumenEstudio() {
  const { anio, escenario, pp, hitos, conteo, loteo } = useEstudio();
  const h = hitos[escenario];
  const mejoras: [string, number][] = [
    ["Vía pavimentada", h.via],
    ["Servicios públicos", h.servicios],
    ["Parque", h.parque],
    ["Uso del suelo", h.usoSuelo],
  ];
  const proximo = mejoras
    .filter(([, a]) => a > anio && a <= pp.horizonte)
    .sort((x, y) => x[1] - y[1])[0];

  const filas: [string, string][] = [
    ["Año actual", String(ANIO_BASE + anio)],
    ["Tiempo transcurrido", `${anio} / ${pp.horizonte} años`],
    ["Escenario activo", etiqueta[escenario]],
    ["Próxima mejora", proximo ? `${proximo[0]} (${ANIO_BASE + proximo[1]})` : "Ninguna más"],
    ["Casas construidas", conteo ? `${conteo.casas} / ${conteo.total}` : "—"],
  ];

  return (
    <Tarjeta titulo="Resumen de la simulación">
      <dl className="space-y-2 text-sm">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-right font-medium text-slate-800">{v}</dd>
          </div>
        ))}
      </dl>
      <Link
        href="/terreno"
        className="mt-4 block w-full rounded-lg border border-emerald-600 py-2 text-center text-sm text-emerald-700 hover:bg-emerald-50"
      >
        {loteo ? "Ver el estudio del terreno" : "Dibujar un terreno"}
      </Link>
    </Tarjeta>
  );
}

export function SelectorEscenario() {
  const { escenario, setEscenario, hitos } = useEstudio();
  return (
    <Tarjeta titulo="Escenarios">
      <div className="space-y-2">
        {(["pesimista", "base", "optimista"] as Escenario[]).map((e) => (
          <button
            key={e}
            onClick={() => setEscenario(e)}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
              escenario === e ? "border-emerald-600 bg-emerald-50" : "hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-2 font-medium text-slate-800">
              <span className="h-3 w-3 rounded-full" style={{ background: colorEscenario[e] }} />
              {etiqueta[e]}
            </span>
            <span className="text-xs text-slate-500">
              Vía en {hitos[e].via >= 99 ? "—" : ANIO_BASE + hitos[e].via}
            </span>
          </button>
        ))}
      </div>
    </Tarjeta>
  );
}

export function DistribucionTerreno() {
  const { loteo } = useEstudio();
  if (!loteo) {
    return (
      <Tarjeta titulo="Distribución del terreno">
        <p className="text-sm text-slate-500">Aparecerá cuando dibujes un terreno.</p>
      </Tarjeta>
    );
  }
  const datos = [
    { name: "Lotes vendibles", value: loteo.areaVendible, color: "#10b981" },
    { name: "Zonas verdes", value: loteo.areaVerde, color: "#84cc16" },
    { name: "Vías y sobrantes", value: loteo.areaVias, color: "#94a3b8" },
  ];
  const total = datos.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <Tarjeta titulo="Distribución del terreno">
      <div className="flex items-center gap-4">
        <div className="h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={datos} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={2}>
                {datos.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 space-y-2 text-sm">
          {datos.map((d) => (
            <li key={d.name} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
                {d.name}
              </span>
              <span className="font-semibold text-slate-800">{num((d.value / total) * 100, 1)}%</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2 text-xs text-slate-500">Área bruta: {num(loteo.areaBruta)} m²</p>
    </Tarjeta>
  );
}

export function GraficaEscenarios() {
  const { series, pp } = useEstudio();
  const anios = [5, 10, 15, 20].filter((a) => a <= pp.horizonte);
  const datos = anios.map((a) => ({
    anio: String(ANIO_BASE + a),
    pesimista: series.pesimista[a].valorM2,
    base: series.base[a].valorM2,
    optimista: series.optimista[a].valorM2,
  }));

  return (
    <Tarjeta titulo="Valor por m² según el escenario">
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="anio" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(Number(v) / 1e6).toFixed(1)}M`} width={42} />
            <Tooltip formatter={(v) => cop(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {(["pesimista", "base", "optimista"] as Escenario[]).map((e) => (
              <Bar key={e} dataKey={e} name={etiqueta[e]} fill={colorEscenario[e]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Tarjeta>
  );
}

type Alerta = { tipo: "warning" | "info"; texto: string };

export function AlertasEstudio() {
  const { loteo, series, pp, hitos } = useEstudio();
  const alertas: Alerta[] = [];

  if (!loteo) {
    alertas.push({
      tipo: "info",
      texto: "Aún no hay un terreno estudiado. Dibújalo en «Estudio de terreno» para ver resultados sobre un predio.",
    });
  } else {
    const fin = pp.horizonte;
    const v0 = pp.valorInicial;
    const vp = series.pesimista[fin].valorM2;
    const vb = series.base[fin].valorM2;
    const vo = series.optimista[fin].valorM2;
    const anual = (v: number) => (Math.pow(v / v0, 1 / fin) - 1) * 100;

    if (!loteo.cumpleVerde) {
      alertas.push({
        tipo: "warning",
        texto: `No se alcanza la cesión verde requerida (${num(loteo.areaVerdeRequerida)} m²) con estas medidas.`,
      });
    }
    if (loteo.eficiencia < 65) {
      alertas.push({
        tipo: "warning",
        texto: `El aprovechamiento del terreno es del ${num(loteo.eficiencia, 1)} %. Revisa el lado de la vía, las medidas o las calles transversales.`,
      });
    }
    if (hitos.pesimista.via > fin) {
      alertas.push({
        tipo: "warning",
        texto: `En el escenario pesimista la vía no se pavimenta en ${fin} años: el terreno crece solo lo que marca la tasa base.`,
      });
    }
    alertas.push({
      tipo: "info",
      texto: `A ${fin} años el valor por m² del escenario optimista es ${num(vo / vp, 1)} veces el del pesimista: el resultado depende mucho de cuándo llegue la vía.`,
    });
    alertas.push({
      tipo: "info",
      texto: `Rentabilidad anual equivalente: pesimista ${num(anual(vp), 1)} %, base ${num(anual(vb), 1)} %, optimista ${num(anual(vo), 1)} %. Compárala con la inflación y con otras alternativas de inversión.`,
    });
  }

  alertas.push({
    tipo: "info",
    texto: "Todos los parámetros son supuestos de ejemplo. Calibrarlos con datos reales antes de tomar decisiones.",
  });

  return (
    <Tarjeta titulo="Alertas y recomendaciones">
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
    </Tarjeta>
  );
}