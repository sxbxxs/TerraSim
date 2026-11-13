"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, AlertTriangle, MapPin } from "lucide-react";
import type { Punto } from "@/lib/geo";
import {
  Comparable, TipoReferencia, COMPARABLES_INICIALES, distanciaCentroKm, estimarCasaM2, estimarPrecioM2,
  guardarCostoConstruccionM2, leerComparablesGuardados, leerCostoConstruccionM2, precioPorM2,
} from "@/lib/ubicacion";
import { num, copM } from "@/components/dashboard/PanelesEstudio";

const CLAVE = "terrasim_comparables";
const input =
  "w-full rounded-lg border px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";

type Props = {
  terreno: Punto | null; // centro del terreno dibujado
  areaLote: number | null; // m² promedio de un lote del loteo
  onUsarLotes: (precioLote: number) => void;
  onUsarModelo: (precioM2: number) => void;
};

export default function ComparablesPrecios({ terreno, areaLote, onUsarLotes, onUsarModelo }: Props) {
  const [comps, setComps] = useState<Comparable[]>(COMPARABLES_INICIALES);
  const [costoM2, setCostoM2] = useState<number | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setComps(leerComparablesGuardados());
    setCostoM2(leerCostoConstruccionM2());
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(comps));
    } catch {
      // almacenamiento lleno o bloqueado
    }
  }, [listo, comps]);

  useEffect(() => {
    if (listo) guardarCostoConstruccionM2(costoM2);
  }, [listo, costoM2]);

  const est = useMemo(() => estimarPrecioM2(comps, terreno, costoM2), [comps, terreno, costoM2]);
  const casas = useMemo(() => estimarCasaM2(comps, terreno), [comps, terreno]);

  const cambiar = (id: string, campo: keyof Comparable, valor: string | number | null) =>
    setComps((p) => p.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)));
  const agregar = () =>
    setComps((p) => [...p, { id: `c${Date.now()}${Math.random().toString(36).slice(2, 6)}`, nombre: "", coordenadas: "", precio: null, area: null, tipo: "lote" }]);
  const quitar = (id: string) => setComps((p) => p.filter((c) => c.id !== id));
  const numero = (v: string) => (v === "" ? null : Number(v));

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-800">Precios de referencia de la zona</h3>
      <p className="mb-3 text-xs text-slate-500">
        El precio depende de dónde compres: más cerca del centro, más caro. Anota anuncios o ventas reales de lotes y de casas; la app estima el precio de tu terreno.
      </p>

      {terreno && (
        <p className="mb-3 flex items-center gap-1 text-xs text-slate-500">
          <MapPin size={12} /> Tu terreno está a {num(distanciaCentroKm(terreno), 1)} km del centro (el centro es aproximado).
        </p>
      )}

      <div className="space-y-3">
        {comps.map((c) => {
          const esCasa = c.tipo === "casa";
          const pm2 = precioPorM2(c);
          const uso = est.usados.find((u) => u.nombre === (c.nombre || "Sin nombre"));
          return (
            <div key={c.id} className="rounded-lg border p-3">
              <div className="mb-2 flex gap-2">
                <select className="rounded-lg border px-2 py-1.5 text-sm" value={esCasa ? "casa" : "lote"}
                  onChange={(e) => cambiar(c.id, "tipo", e.target.value as TipoReferencia)}>
                  <option value="lote">Lote</option>
                  <option value="casa">Casa</option>
                </select>
                <input className={input} placeholder="Nombre o dirección" value={c.nombre}
                  onChange={(e) => cambiar(c.id, "nombre", e.target.value)} />
                <button title="Quitar" onClick={() => quitar(c.id)} className="rounded-lg border p-1.5 text-slate-500 hover:bg-slate-50">
                  <Trash2 size={14} />
                </button>
              </div>
              <input className={`${input} mb-2`} placeholder="Coordenadas de Google Maps (opcional): 8.31, -73.61" value={c.coordenadas}
                onChange={(e) => cambiar(c.id, "coordenadas", e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min={0} className={input} placeholder={esCasa ? "Precio de la casa (COP)" : "Precio del lote (COP)"} value={c.precio ?? ""}
                  onChange={(e) => cambiar(c.id, "precio", numero(e.target.value))} />
                <input type="number" min={0} className={input} placeholder="Área del lote (m²)" value={c.area ?? ""}
                  onChange={(e) => cambiar(c.id, "area", numero(e.target.value))} />
              </div>
              {esCasa && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input type="number" min={0} className={input} placeholder="Habitaciones" value={c.habitaciones ?? ""}
                    onChange={(e) => cambiar(c.id, "habitaciones", numero(e.target.value))} />
                  <input type="number" min={0} className={input} placeholder="Baños" value={c.banos ?? ""}
                    onChange={(e) => cambiar(c.id, "banos", numero(e.target.value))} />
                  <input type="number" min={0} className={input} placeholder="m² construidos" value={c.areaConstruida ?? ""}
                    onChange={(e) => cambiar(c.id, "areaConstruida", numero(e.target.value))} />
                </div>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {pm2 === null
                  ? "Falta el precio o el área"
                  : esCasa
                    ? `$${num(pm2)} por m² de lote, con la casa incluida${c.habitaciones ? ` · ${c.habitaciones} hab.` : ""}${c.banos ? ` · ${c.banos} baños` : ""}`
                    : `$${num(pm2)} por m²`}
                {esCasa && !uso && pm2 !== null && " · aún no cuenta para el precio del suelo"}
                {uso && ` · ${uso.residual ? "suelo $" + num(uso.precioM2) + " por m² (método residual)" : ""}`}
                {uso && uso.distanciaKm !== null && ` · a ${num(uso.distanciaKm, 1)} km de tu terreno · pesa ${num(uso.pesoPct, 0)} %`}
              </p>
            </div>
          );
        })}
      </div>

      <button onClick={agregar} className="mt-3 flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
        <Plus size={14} /> Agregar referencia
      </button>

      <div className="mt-4 rounded-lg border p-3">
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Costo de construir por m² (opcional)</span>
          <input type="number" min={0} className={input} placeholder="Ej. cotización de una constructora" value={costoM2 ?? ""}
            onChange={(e) => setCostoM2(e.target.value === "" ? null : Number(e.target.value))} />
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Una casa se vende por suelo + construcción. Con este costo y los m² construidos de cada casa, TerraSim separa cuánto vale el suelo y lo usa para estimar tu terreno.
        </p>
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
        {est.precioM2 === null ? (
          <p className="text-slate-500">Todavía no hay un estimado del suelo.</p>
        ) : (
          <>
            <p className="font-semibold text-slate-800">
              Suelo estimado: ${num(est.precioM2)} por m²
              {areaLote ? ` (≈ ${copM(est.precioM2 * areaLote)} por lote de ${num(areaLote)} m²)` : ""}
            </p>
            <p className="text-xs text-slate-500">
              {est.metodo === "ponderado" ? "Promedio ponderado por distancia" : "Promedio simple"} · referencias entre ${num(est.minM2 ?? 0)} y ${num(est.maxM2 ?? 0)} por m²
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                disabled={!areaLote}
                onClick={() => areaLote && onUsarLotes(Math.round((est.precioM2 as number) * areaLote))}
                className="rounded-lg border bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Usar para el precio de los lotes
              </button>
              <button
                onClick={() => onUsarModelo(Math.round(est.precioM2 as number))}
                className="rounded-lg border bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                Usar como valor inicial del modelo
              </button>
            </div>
          </>
        )}
        {casas.precioM2 !== null && (
          <p className="mt-3 text-xs text-slate-600">
            <b>Casas en la zona:</b> ${num(casas.precioM2)} por m² de lote con la casa incluida
            {casas.usadas.length === 1 ? ` (una referencia: ${casas.usadas[0].nombre})` : ` (promedio de ${casas.usadas.length} casas)`}. Es el precio de la propiedad completa, no del suelo.
          </p>
        )}
        {est.avisos.map((a) => (
          <p key={a} className="mt-2 flex gap-2 text-xs text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {a}
          </p>
        ))}
        {est.ignorados.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">Sin contar (falta precio o área): {est.ignorados.join(", ")}.</p>
        )}
        {est.soloReferencia.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Casas que solo sirven de referencia (para entrar al suelo faltan los m² construidos y el costo de construir por m²): {est.soloReferencia.join(", ")}.
          </p>
        )}
      </div>
    </div>
  );
}