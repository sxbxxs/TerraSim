"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Info, Sparkles, RotateCcw, Landmark, LayoutGrid, Building2 } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import type { Escenario } from "@/types";
import { useEstudio } from "@/lib/estudio-contexto";
import {
  PARAMS_FINANCIEROS, ParametrosFinancieros, Estrategia, Tres,
  calcularFinanzas, faltantes, valoresEjemplo, mezclaCompleta,
  TOPE_VIS, TOPE_VIP, TOPE_VIS_SMMLV, TOPE_VIP_SMMLV,
} from "@/lib/financiero";
import { ANIO_BASE } from "@/lib/progreso";
import { num, copM } from "@/components/dashboard/PanelesEstudio";
import ComparablesPrecios from "@/components/financiero/ComparablesPrecios";
import EconomiaPorCasa from "@/components/financiero/EconomiaPorCasa";
const CLAVE = "terrasim_financiero";
const input =
  "w-full rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";
const mm = (n: number) => `${n < 0 ? "−" : ""}${copM(Math.abs(n))}`;

const esNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const nul = (x: unknown): number | null => (esNum(x) ? x : null);
const tresNul = (x: unknown, def: Tres<number | null>): Tres<number | null> =>
  Array.isArray(x) && x.length === 3 ? [nul(x[0]), nul(x[1]), nul(x[2])] : def;

// Recupera lo guardado validando cada dato (si algo viene dañado se usa el valor inicial)
function limpiar(d: Partial<Record<keyof ParametrosFinancieros, unknown>>): ParametrosFinancieros {
  const b = PARAMS_FINANCIEROS;
  const n = (x: unknown, def: number) => (esNum(x) ? x : def);
  const estrategia: Estrategia =
    d.estrategia === "invertir" || d.estrategia === "lotear" || d.estrategia === "construir" ? d.estrategia : b.estrategia;
  const mz = d.mezclaPct;
  return {
    estrategia,
    horizonte: Math.min(20, Math.max(1, Math.round(n(d.horizonte, b.horizonte)))),
    tasaDescuentoPct: n(d.tasaDescuentoPct, b.tasaDescuentoPct),
    precioTerreno: nul(d.precioTerreno),
    gastosCompraPct: n(d.gastosCompraPct, b.gastosCompraPct),
    tenenciaPct: n(d.tenenciaPct, b.tenenciaPct),
    gastosVentaPct: n(d.gastosVentaPct, b.gastosVentaPct),
    impuestoPct: n(d.impuestoPct, b.impuestoPct),
    urbanismoM2: nul(d.urbanismoM2),
    anosUrbanizacion: Math.max(1, Math.round(n(d.anosUrbanizacion, b.anosUrbanizacion))),
    anosVenta: Math.max(0, Math.round(n(d.anosVenta, b.anosVenta))),
    indirectosPct: n(d.indirectosPct, b.indirectosPct),
    inflacionCostosPct: n(d.inflacionCostosPct, b.inflacionCostosPct),
    descuentoSaldoPct: n(d.descuentoSaldoPct, b.descuentoSaldoPct),
    indexarPrecios: typeof d.indexarPrecios === "boolean" ? d.indexarPrecios : b.indexarPrecios,
    mezclaPct:
      Array.isArray(mz) && mz.length === 2 && esNum(mz[0]) && esNum(mz[1]) ? [mz[0], mz[1]] : b.mezclaPct,
    precioLote: tresNul(d.precioLote, b.precioLote),
    precioCasa: tresNul(d.precioCasa, b.precioCasa),
    costoCasa: tresNul(d.costoCasa, b.costoCasa),
  };
}

function useParametrosFinancieros() {
  const [fin, setFin] = useState<ParametrosFinancieros>(PARAMS_FINANCIEROS);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLAVE);
      if (raw) setFin(limpiar(JSON.parse(raw)));
    } catch {
      // dato dañado: se empieza de cero
    }
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(fin));
    } catch {
      // almacenamiento lleno o bloqueado
    }
  }, [listo, fin]);

  return [fin, setFin] as const;
}

const ESTRATEGIAS: { id: Estrategia; perfil: string; titulo: string; texto: string; icon: typeof Landmark }[] = [
  { id: "invertir", perfil: "Inversionista", titulo: "Comprar y esperar", texto: "Compras el terreno y lo vendes completo más adelante.", icon: Landmark },
  { id: "lotear", perfil: "Inversionista", titulo: "Lotear y vender lotes", texto: "Divides el terreno y vendes los lotes.", icon: LayoutGrid },
  { id: "construir", perfil: "Constructora", titulo: "Lotear, construir y vender casas", texto: "Divides, construyes las casas y las vendes por zona.", icon: Building2 },
];

const ZONAS = ["Zona 1 · frente a la vía (se vende primero)", "Zona 2 · intermedia", "Zona 3 · fondo"];
const ESCENARIOS: { id: Escenario; label: string }[] = [
  { id: "pesimista", label: "Pesimista" },
  { id: "base", label: "Base" },
  { id: "optimista", label: "Optimista" },
];

function Campo({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

// Campo de dinero que puede quedar vacío (null = sin dato)
function Dinero({ valor, onChange }: { valor: number | null; onChange: (v: number | null) => void }) {
  return (
    <>
      <input
        type="number"
        min={0}
        className={input}
        value={valor ?? ""}
        placeholder="Sin dato"
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
      {valor !== null && valor > 0 && <span className="mt-1 block text-xs text-slate-400">{copM(valor)}</span>}
    </>
  );
}

function Numero({ valor, onChange, step = 1, min = 0, max }: {
  valor: number; onChange: (v: number) => void; step?: number; min?: number; max?: number;
}) {
  return (
    <input
      type="number"
      className={input}
      step={step}
      min={min}
      max={max}
      value={valor}
      onChange={(e) => onChange(Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 0)}
    />
  );
}

function Tarjeta({ titulo, valor, sub, tono }: { titulo: string; valor: string; sub?: string; tono?: "bien" | "mal" }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className={`text-xl font-bold ${tono === "mal" ? "text-red-600" : tono === "bien" ? "text-emerald-600" : "text-slate-900"}`}>
        {valor}
      </p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function AnalisisFinanciero() {
  const { loteo, series, pp, setPp, escenario, setEscenario, puntos } = useEstudio();
  const [fin, setFin] = useParametrosFinancieros();

  const set = <K extends keyof ParametrosFinancieros>(k: K, v: ParametrosFinancieros[K]) =>
    setFin((p) => ({ ...p, [k]: v }));
  const setTres = (k: "precioLote" | "precioCasa" | "costoCasa", i: number, v: number | null) =>
    setFin((p) => {
      const copia = [...p[k]] as Tres<number | null>;
      copia[i] = v;
      return { ...p, [k]: copia };
    });

  const centroTerreno =
    puntos.length >= 3
      ? {
          lat: puntos.reduce((a, q) => a + q.lat, 0) / puntos.length,
          lng: puntos.reduce((a, q) => a + q.lng, 0) / puntos.length,
        }
      : null;

  const m = mezclaCompleta(fin);
  const faltan = faltantes(fin);
  const e = fin.estrategia;

  const resultado = useMemo(
    () => (loteo && faltan.length === 0 ? calcularFinanzas(loteo, series[escenario], pp, fin) : null),
    [loteo, faltan.length, series, escenario, pp, fin]
  );

  // Comparación de las tres estrategias en los tres escenarios (solo si hay datos para cada una)
  const matriz = useMemo(() => {
    if (!loteo) return null;
    return ESTRATEGIAS.map((s) => {
      const f = { ...fin, estrategia: s.id };
      if (faltantes(f).length > 0) return { id: s.id, celdas: null };
      return {
        id: s.id,
        celdas: ESCENARIOS.map((sc) => calcularFinanzas(loteo, series[sc.id], pp, f)),
      };
    });
  }, [loteo, series, pp, fin]);

  const rellenarEjemplo = () => setFin((p) => ({ ...p, ...valoresEjemplo(loteo?.areaBruta ?? 10000) }));
  const borrarTodo = () => setFin({ ...PARAMS_FINANCIEROS, estrategia: fin.estrategia });

  // Avisos honestos sobre lo que el resultado incluye o deja por fuera
  const avisos: { tipo: "warning" | "info"; texto: string }[] = [];
  if (resultado && loteo) {
    if (e !== "invertir" && fin.indexarPrecios && fin.inflacionCostosPct === 0) {
      avisos.push({ tipo: "warning", texto: "Los precios suben con la valorización del escenario pero los costos no suben nada (inflación 0 %): el resultado es optimista." });
    }
    if (e !== "invertir" && (fin.gastosVentaPct === 0 || fin.indirectosPct === 0)) {
      avisos.push({ tipo: "info", texto: "No estás contando " + [fin.gastosVentaPct === 0 && "gastos de venta", fin.indirectosPct === 0 && "costos indirectos (diseños, licencias, gerencia)"].filter(Boolean).join(" ni ") + ". Si los tienes, ponlos para no sobrestimar la utilidad." });
    }
    if (e === "construir") {
      const activas = [0, 1, 2].filter((i) => m[i] > 0);
      const supera = activas.filter((i) => (fin.precioCasa[i] ?? 0) > TOPE_VIS);
      const sobreVip = activas.filter((i) => (fin.precioCasa[i] ?? 0) > TOPE_VIP && (fin.precioCasa[i] ?? 0) <= TOPE_VIS);
      if (supera.length) {
        avisos.push({ tipo: "warning", texto: `La casa de la zona ${supera.map((i) => i + 1).join(", ")} supera el tope de la VIS (${TOPE_VIS_SMMLV} SMMLV = ${copM(TOPE_VIS)} en 2026), así que no sería vivienda de interés social.` });
      } else if (sobreVip.length) {
        avisos.push({ tipo: "info", texto: `La casa de la zona ${sobreVip.map((i) => i + 1).join(", ")} está sobre el tope de la VIP (${TOPE_VIP_SMMLV} SMMLV = ${copM(TOPE_VIP)}) pero dentro del de la VIS (${copM(TOPE_VIS)}).` });
      } else if (activas.length) {
        avisos.push({ tipo: "info", texto: `Los precios de las casas están por debajo del tope de la VIP (${TOPE_VIP_SMMLV} SMMLV = ${copM(TOPE_VIP)} en 2026). Verifica la norma vigente: en enero de 2026 el Gobierno puso en consulta un decreto sobre el tope de la VIS.` });
      }
    }
    if (resultado.lotesSinVender > 0.5) {
      avisos.push({ tipo: "info", texto: `Al año ${fin.horizonte} quedan ${num(resultado.lotesSinVender, 0)} lotes sin vender. ${e === "construir" && fin.precioLote.every((x) => x === null) ? "No se les asigna valor porque no pusiste precio de lote." : `Se liquidan con un descuento del ${fin.descuentoSaldoPct} %.`}` });
    }
    if (e !== "invertir" && fin.anosVenta > 0) {
      avisos.push({ tipo: "info", texto: "Con ritmo de venta propio, el escenario casi no cambia el resultado: las mejoras (vía, servicios) llegan después de que ya vendiste." });
    }
    if (resultado.utilidadNeta < 0) {
      avisos.push({ tipo: "warning", texto: "Con estos datos el negocio pierde dinero en este escenario." });
    } else if (fin.tasaDescuentoPct > 0 && resultado.tir !== null && resultado.tir * 100 < fin.tasaDescuentoPct) {
      avisos.push({ tipo: "warning", texto: `La TIR (${num(resultado.tir * 100, 1)} %) es menor que la rentabilidad mínima que pusiste (${fin.tasaDescuentoPct} %).` });
    }
    avisos.push({ tipo: "info", texto: `Necesitas tener disponibles ${mm(resultado.exposicionMaxima)} antes de empezar a recuperarlos.` });
  }

  const datos = resultado?.flujos.map((x) => ({
    anio: ANIO_BASE + x.anio,
    neto: x.neto / 1e6,
    acumulado: x.acumulado / 1e6,
  }));

  const equilibrioTexto = (() => {
    if (!resultado || resultado.factorEquilibrio === null) return null;
    const f = resultado.factorEquilibrio;
    const meta = fin.tasaDescuentoPct > 0 ? `rendir el ${fin.tasaDescuentoPct} % anual` : "no perder dinero";
    return f <= 1
      ? `Los precios de venta podrían bajar hasta un ${num((1 - f) * 100, 0)} % y aún así ${meta}.`
      : `Los precios de venta tendrían que subir un ${num((f - 1) * 100, 0)} % para ${meta}.`;
  })();

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        {ESTRATEGIAS.map((s) => {
          const Icon = s.icon;
          const activa = e === s.id;
          return (
            <button
              key={s.id}
              onClick={() => set("estrategia", s.id)}
              className={`rounded-xl border p-4 text-left transition ${activa ? "border-emerald-600 bg-emerald-50" : "bg-white hover:bg-slate-50"}`}
            >
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-emerald-700">
                <Icon size={16} /> {s.perfil}
              </div>
              <p className="font-semibold text-slate-800">{s.titulo}</p>
              <p className="text-sm text-slate-500">{s.texto}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          <ComparablesPrecios
            terreno={centroTerreno}
            areaLote={loteo ? loteo.areaPromedio : null}
            onUsarLotes={(precio) => setFin((p) => ({ ...p, precioLote: [precio, precio, precio] }))}
            onUsarModelo={(precioM2) => setPp((p) => ({ ...p, valorInicial: precioM2 }))}
          />            
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-800">Tus datos</h3>
              <div className="flex gap-2">
                <button onClick={rellenarEjemplo} title="Rellenar con valores de ejemplo" className="flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                  <Sparkles size={14} /> Valores de ejemplo
                </button>
                <button onClick={borrarTodo} title="Borrar todo" className="rounded-lg border p-1.5 text-slate-600 hover:bg-slate-50">
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
            <p className="mb-4 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              Aquí van <b>tus</b> precios y costos. Lo que dejes en blanco o en 0 no se cuenta. Los «valores de ejemplo» los inventó TerraSim solo para probar: no son de mercado.
            </p>

            <div className="space-y-3">
              <Campo label="Precio de compra del terreno (COP, total)">
                <Dinero valor={fin.precioTerreno} onChange={(v) => set("precioTerreno", v)} />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Gastos de compra (%)" hint="Escrituración y registro">
                  <Numero valor={fin.gastosCompraPct} step={0.5} onChange={(v) => set("gastosCompraPct", v)} />
                </Campo>
                {e === "invertir" && (
                  <Campo label="Tenencia (% anual)" hint="Predial y vigilancia">
                    <Numero valor={fin.tenenciaPct} step={0.1} onChange={(v) => set("tenenciaPct", v)} />
                  </Campo>
                )}
              </div>

              {e !== "invertir" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="Urbanización (COP por m² del terreno)" hint="Vías, redes, parques">
                      <Dinero valor={fin.urbanismoM2} onChange={(v) => set("urbanismoM2", v)} />
                    </Campo>
                    <Campo label="Años de urbanización">
                      <Numero valor={fin.anosUrbanizacion} min={1} onChange={(v) => set("anosUrbanizacion", v)} />
                    </Campo>
                  </div>

                  <div>
                    <p className="mb-1 text-sm text-slate-500">¿Cuántos lotes van en cada zona? (%)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Numero valor={fin.mezclaPct[0]} max={100} onChange={(v) => set("mezclaPct", [v, fin.mezclaPct[1]])} />
                      <Numero valor={fin.mezclaPct[1]} max={100} onChange={(v) => set("mezclaPct", [fin.mezclaPct[0], v])} />
                      <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-600">{num(m[2], 0)}</div>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Zona 1, zona 2 y zona 3 (el resto). Los lotes más cercanos a la vía son los de la zona 1.</p>
                  </div>

                  {[0, 1, 2].map((i) =>
                    m[i] > 0 ? (
                      <div key={i} className="rounded-lg border p-3">
                        <p className="mb-2 text-xs font-semibold text-slate-600">{ZONAS[i]}</p>
                        {e === "lotear" && (
                          <Campo label="Precio de venta de un lote (COP)">
                            <Dinero valor={fin.precioLote[i]} onChange={(v) => setTres("precioLote", i, v)} />
                          </Campo>
                        )}
                        {e === "construir" && (
                          <div className="space-y-2">
                            <Campo label="Precio de venta de la casa (COP)">
                              <Dinero valor={fin.precioCasa[i]} onChange={(v) => setTres("precioCasa", i, v)} />
                            </Campo>
                            <Campo label="Costo de construir la casa (COP)">
                              <Dinero valor={fin.costoCasa[i]} onChange={(v) => setTres("costoCasa", i, v)} />
                            </Campo>
                            <Campo label="Precio de un lote sin casa (COP, opcional)" hint="Solo para valorar lotes que queden sin vender">
                              <Dinero valor={fin.precioLote[i]} onChange={(v) => setTres("precioLote", i, v)} />
                            </Campo>
                          </div>
                        )}
                      </div>
                    ) : null
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Campo label="Horizonte (años)">
                  <Numero valor={fin.horizonte} min={1} max={20} onChange={(v) => set("horizonte", Math.min(20, Math.max(1, Math.round(v))))} />
                </Campo>
                {e !== "invertir" && (
                  <Campo label="Vender todo en (años)" hint="0 = al ritmo del escenario">
                    <Numero valor={fin.anosVenta} onChange={(v) => set("anosVenta", Math.max(0, Math.round(v)))} />
                  </Campo>
                )}
                <Campo label="Gastos de venta (%)">
                  <Numero valor={fin.gastosVentaPct} step={0.5} onChange={(v) => set("gastosVentaPct", v)} />
                </Campo>
                {e !== "invertir" && (
                  <>
                    <Campo label="Costos indirectos (%)" hint="Diseños, licencias, gerencia">
                      <Numero valor={fin.indirectosPct} step={0.5} onChange={(v) => set("indirectosPct", v)} />
                    </Campo>
                    <Campo label="Inflación de costos (% anual)">
                      <Numero valor={fin.inflacionCostosPct} step={0.5} onChange={(v) => set("inflacionCostosPct", v)} />
                    </Campo>
                    <Campo label="Descuento por lotes sin vender (%)">
                      <Numero valor={fin.descuentoSaldoPct} step={1} onChange={(v) => set("descuentoSaldoPct", v)} />
                    </Campo>
                  </>
                )}
                <Campo label="Impuesto sobre la utilidad (%)" hint="0 = no se modela">
                  <Numero valor={fin.impuestoPct} step={1} onChange={(v) => set("impuestoPct", v)} />
                </Campo>
                <Campo label="Rentabilidad mínima (% anual)" hint="0 = sin descontar">
                  <Numero valor={fin.tasaDescuentoPct} step={0.5} onChange={(v) => set("tasaDescuentoPct", v)} />
                </Campo>
              </div>

              <label className="flex items-start gap-2 text-sm text-slate-600">
                <input type="checkbox" className="mt-1" checked={fin.indexarPrecios} onChange={(ev) => set("indexarPrecios", ev.target.checked)} />
                <span>
                  Los precios siguen la valorización del escenario
                  <span className="block text-xs text-slate-400">Tus precios son los de hoy; el modelo solo aporta cuánto sube o baja el mercado cada año.</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-800">Resultado</h3>
            <div className="flex overflow-hidden rounded-lg border text-sm">
              {ESCENARIOS.map((s) => (
                <button key={s.id} onClick={() => setEscenario(s.id)} className={`px-3 py-2 ${escenario === s.id ? "bg-emerald-600 text-white" : "bg-white hover:bg-slate-50"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {!loteo && (
            <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
              <p className="font-semibold text-slate-800">Primero necesitas un terreno</p>
              <p className="mt-1 text-sm text-slate-500">El análisis usa los lotes que salen de tu terreno dibujado.</p>
              <Link href="/terreno" className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                Ir a Estudio de terreno
              </Link>
            </div>
          )}

          {loteo && faltan.length > 0 && (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="font-semibold text-slate-800">Faltan datos para calcular</p>
              <p className="mt-1 text-sm text-slate-500">No invento valores: completa estos datos en el panel de la izquierda.</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {faltan.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <button onClick={rellenarEjemplo} className="mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <Sparkles size={16} /> Probar con valores de ejemplo
              </button>
            </div>
          )}

          {loteo && resultado && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Tarjeta titulo="Utilidad neta" valor={mm(resultado.utilidadNeta)} sub={`Margen ${num(resultado.margen * 100, 1)} % de lo vendido`} tono={resultado.utilidadNeta >= 0 ? "bien" : "mal"} />
                <Tarjeta titulo={e === "invertir" ? "Utilidad" : e === "lotear" ? "Utilidad por lote" : "Utilidad por casa"} valor={mm(resultado.utilidadPorLote)} sub={e === "invertir" ? "Sobre el terreno completo" : `${num(resultado.lotesVendidos, 0)} vendidos en ${fin.horizonte} años`} />
                <Tarjeta titulo="TIR (rentabilidad anual)" valor={resultado.tir === null ? "No aplica" : `${num(resultado.tir * 100, 1)} %`} sub={resultado.tir === null ? "El flujo no cambia de signo" : "Incluye el valor del tiempo"} />
                <Tarjeta titulo={fin.tasaDescuentoPct > 0 ? `VPN al ${fin.tasaDescuentoPct} %` : "VPN (sin descontar)"} valor={mm(resultado.vpn)} tono={resultado.vpn >= 0 ? "bien" : "mal"} />
                <Tarjeta titulo="Dinero que debes tener" valor={mm(resultado.exposicionMaxima)} sub="Máximo puesto antes de recuperarlo" />
                <Tarjeta titulo="Recuperas lo invertido" valor={resultado.anioRecuperacion === null ? "No en el horizonte" : `Año ${ANIO_BASE + resultado.anioRecuperacion}`} sub={`Rentabilidad sobre costos ${num(resultado.rentabilidadCostos * 100, 1)} %`} />
              </div>

              {equilibrioTexto && (
                <p className="rounded-lg border bg-white p-3 text-sm text-slate-700 shadow-sm">
                  <b>Punto de equilibrio:</b> {equilibrioTexto}
                </p>
              )}

              <div className="rounded-xl border bg-white p-5 shadow-sm">
                              {e === "construir" && <EconomiaPorCasa fin={fin} loteo={loteo} />}
                <h3 className="mb-3 font-semibold text-slate-800">Flujo de caja (millones de pesos)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={datos}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="anio" />
                      <YAxis tickFormatter={(v) => num(Number(v), 0)} width={60} />
                      <Tooltip formatter={(v) => `${num(Number(v), 0)} M`} labelFormatter={(l) => `Año ${l}`} />
                      <Legend />
                      <Bar dataKey="neto" name="Flujo del año" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#2563eb" strokeWidth={3} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {matriz && (
                <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
                  <p className="p-4 pb-2 font-semibold text-slate-800">Comparación de las tres opciones (utilidad · TIR)</p>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="p-3">Opción</th>
                        {ESCENARIOS.map((s) => <th key={s.id} className="p-3">{s.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {matriz.map((fila) => {
                        const meta = ESTRATEGIAS.find((s) => s.id === fila.id)!;
                        return (
                          <tr key={fila.id} className="border-t">
                            <td className="p-3 font-medium text-slate-800">{meta.perfil}: {meta.titulo}</td>
                            {fila.celdas
                              ? fila.celdas.map((r, i) => (
                                  <td key={i} className={`p-3 ${fila.id === e && ESCENARIOS[i].id === escenario ? "bg-emerald-50" : ""}`}>
                                    <span className={r.utilidadNeta < 0 ? "text-red-600" : "text-slate-800"}>{mm(r.utilidadNeta)}</span>
                                    <span className="text-slate-500"> · {r.tir === null ? "n/a" : `${num(r.tir * 100, 1)} %`}</span>
                                  </td>
                                ))
                              : <td colSpan={3} className="p-3 text-slate-400">Faltan datos para esta opción</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-semibold text-slate-800">Avisos</h3>
                <ul className="space-y-3 text-sm text-slate-700">
                  {avisos.map((a, i) => (
                    <li key={i} className="flex gap-3">
                      {a.tipo === "warning" ? <AlertTriangle size={20} className="shrink-0 text-orange-500" /> : <Info size={20} className="shrink-0 text-blue-500" />}
                      <p>{a.texto}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <details className="rounded-xl border bg-white p-5 shadow-sm">
                <summary className="cursor-pointer font-semibold text-slate-800">Detalle año por año</summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-500">
                      <tr><th className="p-2">Año</th><th className="p-2">Ingresos</th><th className="p-2">Costos</th><th className="p-2">Flujo</th><th className="p-2">Acumulado</th><th className="p-2">Vendidos</th></tr>
                    </thead>
                    <tbody>
                      {resultado.flujos.map((x) => (
                        <tr key={x.anio} className="border-t">
                          <td className="p-2">{ANIO_BASE + x.anio}</td>
                          <td className="p-2">{mm(x.ingresos)}</td>
                          <td className="p-2">{mm(x.compra + x.tenencia + x.urbanismo + x.construccion + x.indirectos + x.ventas + x.impuesto)}</td>
                          <td className="p-2">{mm(x.neto)}</td>
                          <td className="p-2">{mm(x.acumulado)}</td>
                          <td className="p-2">{x.lotesVendidos > 0 ? num(x.lotesVendidos, 1) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}

          <p className="text-xs text-slate-500">
            Simulación con los datos que ingresaste. No es asesoría financiera, ni avalúo, ni garantía de rentabilidad. No incluye financiación bancaria; los impuestos solo se cuentan si los indicas.
          </p>
        </div>
      </div>
    </div>
  );
}