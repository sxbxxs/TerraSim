"use client";
import type { ResultadoLoteo } from "@/lib/lotes";
import { ParametrosFinancieros, mezclaCompleta } from "@/lib/financiero";
import { copM } from "@/components/dashboard/PanelesEstudio";

const mm = (n: number) => `${n < 0 ? "−" : ""}${copM(Math.abs(n))}`;
const ZONAS = ["Zona 1", "Zona 2", "Zona 3"];

// Método del valor residual: de lo que paga el cliente, ¿cuánto queda para pagar el lote?
export default function EconomiaPorCasa({ fin, loteo }: { fin: ParametrosFinancieros; loteo: ResultadoLoteo }) {
  const m = mezclaCompleta(fin);
  if (fin.precioTerreno === null || fin.urbanismoM2 === null || loteo.nLotes === 0) return null;
  const zonas = [0, 1, 2].filter((i) => m[i] > 0 && fin.precioCasa[i] !== null && fin.costoCasa[i] !== null);
  if (zonas.length === 0) return null;

  const gv = fin.gastosVentaPct / 100;
  const ind = fin.indirectosPct / 100;
  const gc = fin.gastosCompraPct / 100;
  // lo que te cuesta cada lote ya urbanizado: terreno + urbanismo, repartidos entre los lotes vendibles
  const costoLote = (fin.precioTerreno * (1 + gc) + fin.urbanismoM2 * loteo.areaBruta * (1 + ind)) / loteo.nLotes;

  const filas = zonas.map((i) => {
    const precio = fin.precioCasa[i] as number;
    const costo = fin.costoCasa[i] as number;
    const construir = costo * (1 + ind);
    const ventas = precio * gv;
    const queda = precio - construir - ventas;
    const mercado = fin.precioLote[i];
    return { i, precio, construir, ventas, queda, utilidad: queda - costoLote, mercado };
  });

  const lecturas = filas.flatMap((f) => {
    const out: string[] = [];
    if (f.queda < 0) out.push(`${ZONAS[f.i]}: el precio de la casa no alcanza ni para construirla.`);
    else if (f.mercado !== null && f.queda < f.mercado) {
      out.push(`${ZONAS[f.i]}: de la casa solo quedan ${mm(f.queda)} para el lote, pero un lote vale ${mm(f.mercado)} en el mercado. Con estos números conviene vender el lote sin construir.`);
    }
    if (f.utilidad < 0) out.push(`${ZONAS[f.i]}: a precios de hoy cada casa pierde ${mm(-f.utilidad)} (sin contar valorización ni inflación).`);
    return out;
  });

  return (
    <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <p className="p-4 pb-1 font-semibold text-slate-800">Economía de cada casa (a precios de hoy)</p>
      <p className="px-4 pb-2 text-xs text-slate-500">
        Si la casa deja menos dinero para el lote del que cuesta el lote en el mercado, construir no es mejor negocio que vender el lote.
      </p>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="p-3">Zona</th>
            <th className="p-3">La casa se vende en</th>
            <th className="p-3">Construirla cuesta</th>
            <th className="p-3">Gastos de venta</th>
            <th className="p-3">Queda para el lote</th>
            <th className="p-3">Tu lote te cuesta</th>
            <th className="p-3">Utilidad por casa</th>
            <th className="p-3">Lote en el mercado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.i} className="border-t">
              <td className="p-3 font-medium text-slate-800">{ZONAS[f.i]}</td>
              <td className="p-3">{mm(f.precio)}</td>
              <td className="p-3">{mm(f.construir)}</td>
              <td className="p-3">{mm(f.ventas)}</td>
              <td className="p-3">{mm(f.queda)}</td>
              <td className="p-3">{mm(costoLote)}</td>
              <td className={`p-3 font-medium ${f.utilidad < 0 ? "text-red-600" : "text-emerald-600"}`}>{mm(f.utilidad)}</td>
              <td className="p-3">{f.mercado === null ? "—" : mm(f.mercado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lecturas.length > 0 && (
        <ul className="space-y-1 p-4 text-sm text-amber-800">
          {lecturas.map((t) => <li key={t}>• {t}</li>)}
        </ul>
      )}
    </div>
  );
}