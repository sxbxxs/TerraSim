import type { LoteGen } from "@/lib/lotes";
import type { EtapaLote } from "@/lib/progreso";
import { ParametrosFinancieros, mezclaCompleta } from "@/lib/financiero";

// Estado de una casa después de un sismo (lo usa la parte 2)
type Danio = "ok" | "danada" | "destruida";

const num = (n: number, d = 0) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: d }).format(n);
const dinero = (n: number) => (n >= 1e9 ? `$${num(n / 1e9, 2)} mil millones` : `$${num(n / 1e6, n >= 1e8 ? 0 : 1)} M`);

// Zona (0, 1 o 2) de un lote vendible según su orden de venta: los más cercanos a la vía son la zona 1
export function zonaDeLote(k: number, nVendibles: number, fin: ParametrosFinancieros): 0 | 1 | 2 {
  const m = mezclaCompleta(fin);
  const centro = k + 0.5;
  if (centro < (m[0] / 100) * nVendibles) return 0;
  if (centro < ((m[0] + m[1]) / 100) * nVendibles) return 1;
  return 2;
}

const ETAPAS: Record<EtapaLote, string> = {
  vacio: "Lote vacío",
  cimentacion: "En cimentación",
  estructura: "En estructura",
  casa: "Casa terminada",
};

export type EntradaDetalle = {
  lote: LoteGen;
  k: number; // posición entre los lotes vendibles (-1 si es parque)
  nVendibles: number;
  etapa: EtapaLote;
  danio: Danio | null;
  fin: ParametrosFinancieros;
  valorM2: number; // COP/m² del suelo en el año que se está viendo
  valorM2Inicial: number;
  anioCalendario: number;
  anio: number; // años desde hoy
};

// Lo que se muestra al pasar el cursor sobre un lote
export function detalleLote(e: EntradaDetalle): string[] {
  const { lote } = e;
  const medidas = `${num(lote.anchoM, 1)} × ${num(lote.largoM, 1)} m · ${num(lote.areaM2)} m²`;
  if (lote.tipo === "verde") return [`${lote.id} · Zona verde (parque)`, medidas];

  const z = zonaDeLote(e.k, e.nVendibles, e.fin);
  const idx = e.fin.indexarPrecios && e.valorM2Inicial > 0 ? e.valorM2 / e.valorM2Inicial : 1;
  const infl = Math.pow(1 + e.fin.inflacionCostosPct / 100, e.anio);
  const precio = e.fin.precioCasa[z];
  const costo = e.fin.costoCasa[z];

  const lineas = [`${lote.id} · Zona ${z + 1}`, medidas];
  if (e.danio === "destruida") lineas.push("Estado: casa DESTRUIDA por el sismo");
  else if (e.danio === "danada") lineas.push("Estado: casa DAÑADA por el sismo");
  else lineas.push(`Estado: ${ETAPAS[e.etapa]}`);

  lineas.push(`Valor del lote en ${e.anioCalendario}: ${dinero(e.valorM2 * lote.areaM2)}`);
  if (precio !== null) {
    lineas.push(`${e.etapa === "casa" ? "Valor de la casa" : "La casa se venderá en"} (${e.anioCalendario}): ${dinero(precio * idx)}`);
  }
  if (costo !== null) lineas.push(`Costo de construirla: ${dinero(costo * infl)}`);
  return lineas;
}