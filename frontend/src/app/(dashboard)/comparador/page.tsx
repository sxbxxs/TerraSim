"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Trash2, Trophy, Undo2 } from "lucide-react";
import MapaComparador from "@/components/map/MapaComparador";
import { useEstudio } from "@/lib/estudio-contexto";
import { useFinanzasGuardadas } from "@/lib/finanzas-guardadas";
import { COLORES, IDS, IdCandidato, Mejoras, MEJORAS_NOMBRE, Mercado, useCandidatos } from "@/lib/candidatos";
import { ESC, Evaluado, Recomendacion, evaluarTerreno, recomendar } from "@/lib/comparador";
import { dentroDelRadio, Punto } from "@/lib/geo";
import { Comparable, leerComparablesGuardados, leerCostoConstruccionM2 } from "@/lib/ubicacion";

const num = (n: number, d = 0) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: d }).format(n);
const cop = (n: number) => `$${num(n)}`;
const pct = (f: number | null) => (f === null ? "—" : `${num(f * 100, 1)} %`);
const mm = (n: number) => {
  const a = Math.abs(n);
  const t = a >= 1e9 ? `$${num(a / 1e9, 2)} mil millones` : `$${num(a / 1e6, a >= 1e8 ? 0 : 1)} M`;
  return n < 0 ? `−${t}` : t;
};
const input = "w-full rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";

function TarjetaRecomendacion({ r, nombre, evals }: { r: Recomendacion; nombre: string; evals: Evaluado[] }) {
  const ganador = evals.find((e) => e.id === r.ganadorId);
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{nombre}</p>
      {ganador && r.ganadorId ? (
        <>
          <div className="mt-1 flex items-center gap-2">
            <Trophy size={20} style={{ color: COLORES[r.ganadorId] }} />
            <h3 className="text-lg font-bold text-slate-900">{ganador.nombre}</h3>
          </div>
          <p className="text-xs text-slate-500">Comparado por: {r.criterio}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            {r.razones.map((t) => <li key={t} className="flex gap-2"><span className="text-emerald-600">✓</span><span>{t}</span></li>)}
          </ul>
          {r.ranking.length > 1 && (
            <p className="mt-3 text-xs text-slate-500">
              Orden: {r.ranking.map((x) => `${x.nombre}${x.tir !== null ? ` (${pct(x.tir)})` : ""}`).join(" › ")}
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Todavía no hay una recomendación.</p>
      )}
      {r.avisos.map((a) => (
        <p key={a} className="mt-2 flex gap-2 text-xs text-amber-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{a}</p>
      ))}
    </div>
  );
}

export default function CompararTerrenos() {
  const { params, pp, hitos, hidratado } = useEstudio();
  const fin = useFinanzasGuardadas();
  const { candidatos, cambiar, agregarPunto, deshacerPunto, borrarTerreno } = useCandidatos();
  const [activo, setActivo] = useState<IdCandidato>("A");
  const [aviso, setAviso] = useState("");
  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [costoM2, setCostoM2] = useState<number | null>(null);

  useEffect(() => {
    setComparables(leerComparablesGuardados());
    setCostoM2(leerCostoConstruccionM2());
  }, []);

  const ctx = useMemo(
    () => ({ params, pp, hitos, fin, comparables, costoConstruccionM2: costoM2 }),
    [params, pp, hitos, fin, comparables, costoM2]
  );
  const evals = useMemo(
    () => candidatos.map((c) => evaluarTerreno(c, ctx)).filter((e): e is Evaluado => e !== null),
    [candidatos, ctx]
  );
  const recInv = useMemo(() => recomendar(evals, "inversionista"), [evals]);
  const recCon = useMemo(() => recomendar(evals, "constructora"), [evals]);
  const mapa = useMemo(() => candidatos.map((c) => ({ id: c.id, puntos: c.puntos })), [candidatos]);

  if (!hidratado) return null;
  const c = candidatos.find((x) => x.id === activo)!;
  const ev = evals.find((x) => x.id === activo);
  const esEjemplo = fin.urbanismoM2 === 90_000 && fin.costoCasa[0] === 60_000_000 && fin.precioLote[0] === 42_000_000;
  const nombreMercado = (m: Mercado) => `${["Alto", "Medio", "Económico"][m]}${fin.precioCasa[m] !== null ? ` (casa de ${mm(fin.precioCasa[m] as number)})` : ""}`;

  const clic = (p: Punto) => {
    if (!dentroDelRadio(p)) {
      setAviso("Ese punto queda fuera del radio de 5 km de Aguachica.");
      return;
    }
    setAviso("");
    agregarPunto(activo, p);
  };

  const fila = (etiqueta: string, f: (e: Evaluado) => string, titulo?: boolean) => (
    <tr className={titulo ? "bg-slate-50" : ""}>
      <td className={`p-2 ${titulo ? "font-semibold text-slate-800" : "text-slate-600"}`}>{etiqueta}</td>
      {IDS.map((id) => {
        const e = evals.find((x) => x.id === id);
        return <td key={id} className="p-2 text-right">{e && !titulo ? f(e) : ""}</td>;
      })}
    </tr>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Comparar terrenos</h2>
        <p className="text-sm text-slate-500">Dibuja hasta tres terrenos en cualquier parte de Aguachica y TerraSim te dice cuál conviene para invertir y cuál para urbanizar y vender.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            {IDS.map((id) => {
              const t = candidatos.find((x) => x.id === id)!;
              return (
                <button key={id} onClick={() => setActivo(id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${activo === id ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: COLORES[id] }} />
                  {t.nombre}
                  <span className="text-xs opacity-70">{t.puntos.length < 3 ? `${t.puntos.length} puntos` : "listo"}</span>
                </button>
              );
            })}
            <div className="ml-auto flex gap-2">
              <button title="Deshacer el último punto" onClick={() => deshacerPunto(activo)} className="rounded-lg border bg-white p-2 text-slate-600 hover:bg-slate-50"><Undo2 size={16} /></button>
              <button title="Borrar este terreno" onClick={() => borrarTerreno(activo)} className="rounded-lg border bg-white p-2 text-slate-600 hover:bg-slate-50"><Trash2 size={16} /></button>
            </div>
          </div>
          <div className="relative h-[460px] overflow-hidden rounded-xl border bg-slate-100 shadow-sm">
            <MapaComparador terrenos={mapa} activo={activo} onClickMapa={clic} />
          </div>
          <p className="text-xs text-slate-500">Elige un terreno y haz clic en el mapa para marcar sus esquinas (mínimo 3), dentro del círculo verde de 5 km.</p>
          {aviso && <p className="text-xs text-amber-800">{aviso}</p>}
        </div>

        <div className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-semibold text-slate-800">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: COLORES[activo] }} /> Datos de {c.nombre}
          </h3>
          <label className="block text-xs"><span className="mb-1 block text-slate-500">Nombre</span>
            <input className={input} value={c.nombre} onChange={(e) => cambiar(activo, (x) => ({ ...x, nombre: e.target.value }))} /></label>
          <label className="block text-xs"><span className="mb-1 block text-slate-500">Precio que piden por el terreno (COP)</span>
            <input type="number" min={0} className={input} placeholder="Precio total" value={c.precioCompra ?? ""}
              onChange={(e) => cambiar(activo, (x) => ({ ...x, precioCompra: e.target.value === "" ? null : Number(e.target.value) }))} /></label>
          {ev && ev.precioCompraM2 !== null && <p className="text-xs text-slate-500">= {cop(ev.precioCompraM2)} por m² · referencia de la zona {cop(ev.valorM2)} por m²</p>}
          <label className="block text-xs"><span className="mb-1 block text-slate-500">Mercado de las casas que se venderían aquí</span>
            <select className={input} value={c.mercado} onChange={(e) => cambiar(activo, (x) => ({ ...x, mercado: Number(e.target.value) as Mercado }))}>
              {([0, 1, 2] as Mercado[]).map((m) => <option key={m} value={m}>{nombreMercado(m)}</option>)}
            </select></label>
          <div className="text-xs">
            <p className="mb-1 text-slate-500">¿Qué ya existe en el sector?</p>
            {(Object.keys(MEJORAS_NOMBRE) as (keyof Mejoras)[]).map((k) => (
              <label key={k} className="mb-1 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={c.yaExiste[k]} onChange={(e) => cambiar(activo, (x) => ({ ...x, yaExiste: { ...x.yaExiste, [k]: e.target.checked } }))} />
                {MEJORAS_NOMBRE[k][0].toUpperCase() + MEJORAS_NOMBRE[k].slice(1)}
              </label>
            ))}
            <p className="text-slate-400">Lo que ya existe valoriza desde hoy; lo que falta llega en el año de cada escenario.</p>
          </div>
        </div>
      </div>

      {esEjemplo && (
        <p className="rounded-lg border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">Estás usando los valores de ejemplo de TerraSim para costos y precios de lote. Reemplázalos en Análisis financiero para comparar con datos reales.</p>
      )}

      {evals.length < 2 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Dibuja al menos dos terrenos (mínimo 3 puntos cada uno) para ver la comparación.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <TarjetaRecomendacion r={recInv} nombre="Si eres inversionista (comprar y esperar)" evals={evals} />
            <TarjetaRecomendacion r={recCon} nombre="Si eres constructora (urbanizar, construir y vender)" evals={evals} />
          </div>

          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-2 text-left">Comparación</th>
                  {IDS.map((id) => <th key={id} className="p-2 text-right" style={{ color: COLORES[id] }}>{candidatos.find((x) => x.id === id)!.nombre}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y">
                {fila("El terreno", () => "", true)}
                {fila("Área", (e) => `${num(e.area)} m²`)}
                {fila("Distancia al centro", (e) => `${num(e.distanciaKm, 2)} km`)}
                {fila("Valor de referencia del suelo", (e) => `${cop(e.valorM2)}/m²${e.usaReferencias ? "" : " *"}`)}
                {fila("Precio de compra", (e) => (e.precioCompraM2 === null ? "falta" : `${cop(e.precioCompraM2)}/m²`))}
                {fila("Lote urbanizado de la zona ÷ terreno", (e) => (e.spread === null ? "—" : `${num(e.spread, 1)} veces`))}
                {fila("Lotes que caben", (e) => `${e.nLotes} (${num(e.eficiencia, 0)} %)`)}
                {fila("Mejoras que le faltan", (e) => (e.pendientes.length ? e.pendientes.length + " de 4" : "ninguna"))}
                {fila("Valorización a 20 años (base)", (e) => `+${num(e.plusvaliaPct.base, 0)} %`)}
                {fila("Para inversionista", () => "", true)}
                {fila("TIR pesimista · base · optimista", (e) => (e.invertir ? ESC.map((s) => pct((e.invertir as NonNullable<typeof e.invertir>)[s].tir)).join(" · ") : "faltan datos"))}
                {fila("Utilidad (base)", (e) => (e.invertir ? mm(e.invertir.base.utilidadNeta) : "—"))}
                {fila("Para constructora", () => "", true)}
                {fila("TIR pesimista · base · optimista", (e) => (e.construir ? ESC.map((s) => pct((e.construir as NonNullable<typeof e.construir>)[s].tir)).join(" · ") : "faltan datos"))}
                {fila("Utilidad (base)", (e) => (e.construir ? mm(e.construir.base.utilidadNeta) : "—"))}
                {fila("Utilidad por casa (base)", (e) => (e.construir ? mm(e.construir.base.utilidadPorLote) : "—"))}
              </tbody>
            </table>
            {evals.some((e) => !e.usaReferencias) && <p className="p-3 text-xs text-slate-500">* Sin referencias de precios cerca: se usó el valor inicial del modelo. Agrega lotes y casas de la zona en Análisis financiero.</p>}
          </div>
          <p className="text-xs text-slate-500">La comparación usa los datos y supuestos que ingresaste (precios de compra, costos, referencias y mejoras). Es una simulación, no un avalúo ni asesoría financiera.</p>
        </>
      )}
    </div>
  );
}